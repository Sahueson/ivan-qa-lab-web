import { createHash } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { dispatchWorkflow } from "@/lib/github/dispatch";
import { advanceQueue, MAX_WAITING } from "@/lib/queue";
import { pruneOldRunsForTool } from "@/lib/prune";

const MAX_RUNS_PER_IP_PER_HOUR = 3;
const MAX_RUNS_PER_DAY = 50;
const SLUG = /^[a-z0-9-]{1,40}$/;

type SuiteRow = {
  id: string;
  slug: string;
  tool_id: string;
  tools: {
    slug: string;
    github_repo: string;
    workflow_file: string;
    enabled: boolean;
    live_execution: boolean;
  };
};

const json = (status: number, body: unknown, headers?: HeadersInit) =>
  Response.json(body, { status, headers });

function clientIpHash(request: Request): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return createHash("sha256").update(`${process.env.IP_SALT ?? ""}:${ip}`).digest("hex");
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "El cuerpo debe ser JSON" });
  }

  const { tool, suite, suites, selectedTags = [] } = (body ?? {}) as any;

  if (typeof tool !== "string" || typeof suite !== "string" || !SLUG.test(tool) || !SLUG.test(suite)) {
    return json(400, { error: "Se esperan 'tool' y 'suite' como slugs válidos" });
  }

  const validSuites: string[] = Array.isArray(suites)
    ? suites.filter((s): s is string => typeof s === "string" && SLUG.test(s))
    : [suite];

  const db = getAdminClient();
  const ipHash = clientIpHash(request);

  try {
    const { error: expireError } = await db.rpc("expire_stale_runs");
    if (expireError) throw expireError;

    const { data: row, error: suiteError } = await db
      .from("suites")
      .select("id, slug, tool_id, tools!inner(slug, github_repo, workflow_file, enabled, live_execution)")
      .eq("slug", suite)
      .eq("tools.slug", tool)
      .maybeSingle<SuiteRow>();

    if (suiteError) throw suiteError;
    if (!row) return json(404, { error: "Suite no encontrada" });
    if (!row.tools.enabled || !row.tools.live_execution) {
      return json(409, { error: "Esta herramienta no admite ejecución en vivo" });
    }

    const since = (ms: number) => new Date(Date.now() - ms).toISOString();
    const [perIp, perDay] = await Promise.all([
      db.from("run_requests").select("run_id", { count: "exact", head: true })
        .eq("ip_hash", ipHash).gte("created_at", since(3_600_000)),
      db.from("run_requests").select("run_id", { count: "exact", head: true })
        .gte("created_at", since(86_400_000)),
    ]);

    if (perIp.error) throw perIp.error;
    if (perDay.error) throw perDay.error;
    if ((perIp.count ?? 0) >= MAX_RUNS_PER_IP_PER_HOUR) {
      return json(429, { error: "Has alcanzado el límite de ejecuciones por hora" }, { "Retry-After": "3600" });
    }
    if ((perDay.count ?? 0) >= MAX_RUNS_PER_DAY) {
      return json(429, { error: "Se ha alcanzado el límite diario de ejecuciones" }, { "Retry-After": "3600" });
    }

    const { data: lock, error: lockError } = await db
      .from("staging_lock")
      .select("holder, expires_at")
      .eq("id", 1)
      .maybeSingle<{ holder: string | null; expires_at: string | null }>();
    if (lockError) throw lockError;
    const grepFilter = Array.isArray(selectedTags) && selectedTags.length > 0 ? selectedTags.join("|") : "";
    const suiteInput = validSuites.length > 1 ? validSuites.join(",") : row.slug;

    // Entorno ocupado (run activo o staging reservado): la petición entra en la cola y se lanza sola cuando quede libre.
    const enqueue = async () => {
      const { count: waiting } = await db.from("runs").select("id", { count: "exact", head: true }).eq("status", "waiting");
      if ((waiting ?? 0) >= MAX_WAITING) {
        return json(409, { error: "La cola está llena; inténtalo en unos minutos" }, { "Retry-After": "60" });
      }
      const { data: queued, error: qErr } = await db
        .from("runs")
        .insert({ suite_id: row.id, status: "waiting", queue_suite: suiteInput, queue_grep: grepFilter })
        .select("id")
        .single<{ id: string }>();
      if (qErr) throw qErr;
      const { error: rErr } = await db.from("run_requests").insert({ run_id: queued.id, ip_hash: ipHash });
      if (rErr) throw rErr;
      await pruneOldRunsForTool(db, row.tool_id);
      await advanceQueue(db); // por si el entorno se liberó mientras tanto
      return json(202, { run_id: queued.id, queued: true, position: (waiting ?? 0) + 1 });
    };
    if (lock?.holder && lock.expires_at && new Date(lock.expires_at) > new Date()) {
      return await enqueue();
    }

    const { data: run, error: runError } = await db
      .from("runs")
      .insert({ suite_id: row.id })
      .select("id")
      .single<{ id: string }>();

    if (runError) {
      if (runError.code === "23505") return await enqueue();
      throw runError;
    }

    const { error: reqError } = await db.from("run_requests").insert({ run_id: run.id, ip_hash: ipHash });
    if (reqError) throw reqError;

    try {
      await dispatchWorkflow({
        repo: row.tools.github_repo,
        workflowFile: row.tools.workflow_file,
        inputs: { run_id: run.id, suite: suiteInput, grep: grepFilter },
      });
    } catch (e) {
      console.error("dispatch failed", run.id, e);
      await db.from("runs")
        .update({ status: "failed", finished_at: new Date().toISOString() })
        .eq("id", run.id);
      await db.from("run_requests").delete().eq("run_id", run.id);
      // También aquí: una ejecución fallida al lanzar cuenta para las 4 que se guardan.
      await pruneOldRunsForTool(db, row.tool_id);
      return json(502, { error: "No se pudo lanzar la ejecución", run_id: run.id });
    }

    // Mantener únicamente las últimas runs de cada suite de esta herramienta
    await pruneOldRunsForTool(db, row.tool_id);

    return json(201, { run_id: run.id });
  } catch (e) {
    console.error("POST /api/runs", e);
    return json(500, { error: "Error interno" });
  }
}