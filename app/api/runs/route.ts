import { createHash } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { dispatchWorkflow } from "@/lib/github/dispatch";

const MAX_RUNS_PER_IP_PER_HOUR = 3;
const MAX_RUNS_PER_DAY = 50;
// Una run = un lanzamiento (puede mezclar tests de varias suites). Se guardan las 4 últimas de cada herramienta.
const MAX_STORED_RUNS_PER_TOOL = 4;
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

async function pruneOldRunsForTool(db: ReturnType<typeof getAdminClient>, toolId: string) {
  const { data: toolSuites } = await db
    .from("suites")
    .select("id")
    .eq("tool_id", toolId);

  const suiteIds = (toolSuites ?? []).map((s) => s.id);
  if (suiteIds.length === 0) return;

  const { data: toolRuns } = await db
    .from("runs")
    .select("id")
    .in("suite_id", suiteIds)
    .order("created_at", { ascending: false });

  if (!toolRuns) return;

  const idsToDelete = toolRuns.slice(MAX_STORED_RUNS_PER_TOOL).map((r) => r.id);
  if (idsToDelete.length === 0) return;

  // 1. Limpiar capturas del bucket 'evidence' asociadas a esas runs
  for (const oldRunId of idsToDelete) {
    try {
      // Las capturas se suben a runs/<run_id>/ (shared/send-to-supabase.js uploadEvidence).
      const { data: files } = await db.storage.from("evidence").list(`runs/${oldRunId}`);
      if (files && files.length > 0) {
        const paths = files.map((f) => `runs/${oldRunId}/${f.name}`);
        await db.storage.from("evidence").remove(paths);
      }
    } catch {
      // Ignorar si no existen evidencias en storage para esa run
    }
  }

  // 2. Eliminar registros relacionados y las runs antiguas. run_requests NO se toca: es el
  // historial del límite por IP y por día, y debe sobrevivir a la limpieza (migración
  // 20261120010000: ya no depende de runs).
  await Promise.all([
    db.from("run_events").delete().in("run_id", idsToDelete),
    db.from("test_results").delete().in("run_id", idsToDelete),
    db.from("run_summary").delete().in("run_id", idsToDelete),
  ]);

  await db.from("runs").delete().in("id", idsToDelete);
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
    if (lock?.holder && lock.expires_at && new Date(lock.expires_at) > new Date()) {
      return json(409, { error: "El entorno de pruebas está ocupado; inténtalo en unos minutos" }, { "Retry-After": "60" });
    }

    const { data: run, error: runError } = await db
      .from("runs")
      .insert({ suite_id: row.id })
      .select("id")
      .single<{ id: string }>();

    if (runError) {
      if (runError.code === "23505") {
        return json(409, { error: "Ya hay una ejecución en curso; inténtalo en unos minutos" }, { "Retry-After": "60" });
      }
      throw runError;
    }

    const { error: reqError } = await db.from("run_requests").insert({ run_id: run.id, ip_hash: ipHash });
    if (reqError) throw reqError;

    try {
      const grepFilter = Array.isArray(selectedTags) && selectedTags.length > 0 ? selectedTags.join("|") : "";
      const suiteInput = validSuites.length > 1 ? validSuites.join(",") : row.slug;

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