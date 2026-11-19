import { createHash } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { dispatchWorkflow } from "@/lib/github/dispatch";

// POST /api/runs  { "tool": "playwright", "suite": "a-auth" }
// 201 { run_id } | 400 entrada inválida | 404 suite inexistente | 409 ocupado / no ejecutable
// 429 límite alcanzado | 502 GitHub no aceptó el dispatch | 500 error interno

const MAX_RUNS_PER_IP_PER_HOUR = 3;
const MAX_RUNS_PER_DAY = 50;
const SLUG = /^[a-z0-9-]{1,40}$/;

type SuiteRow = {
  id: string;
  slug: string;
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
  // 1. Validar entrada: solo slugs de la lista cerrada, nunca URLs ni comandos.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "El cuerpo debe ser JSON" });
  }
  const { tool, suite } = (body ?? {}) as { tool?: unknown; suite?: unknown };
  if (typeof tool !== "string" || typeof suite !== "string" || !SLUG.test(tool) || !SLUG.test(suite)) {
    return json(400, { error: "Se esperan 'tool' y 'suite' como slugs válidos" });
  }

  const db = getAdminClient();
  const ipHash = clientIpHash(request);

  try {
    // 2. Liberar runs colgados antes de comprobar si hay uno activo.
    const { error: expireError } = await db.rpc("expire_stale_runs");
    if (expireError) throw expireError;

    // 3. La suite tiene que existir y su herramienta poder ejecutarse en vivo.
    const { data: row, error: suiteError } = await db
      .from("suites")
      .select("id, slug, tools!inner(slug, github_repo, workflow_file, enabled, live_execution)")
      .eq("slug", suite)
      .eq("tools.slug", tool)
      .maybeSingle<SuiteRow>();
    if (suiteError) throw suiteError;
    if (!row) return json(404, { error: "Suite no encontrada" });
    if (!row.tools.enabled || !row.tools.live_execution) {
      return json(409, { error: "Esta herramienta no admite ejecución en vivo" });
    }

    // 4. Rate limit por IP (hash) y global diario.
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

    // 5. Crear el run. El índice one_active_run garantiza uno solo en cola/en curso.
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

    // 6. Disparar GitHub Actions. Si no lo acepta, el run se marca como fallido.
    try {
      await dispatchWorkflow({
        repo: row.tools.github_repo,
        workflowFile: row.tools.workflow_file,
        inputs: { run_id: run.id, suite: row.slug },
      });
    } catch (e) {
      console.error("dispatch failed", run.id, e);
      await db.from("runs")
        .update({ status: "failed", finished_at: new Date().toISOString() })
        .eq("id", run.id);
      return json(502, { error: "No se pudo lanzar la ejecución", run_id: run.id });
    }

    return json(201, { run_id: run.id });
  } catch (e) {
    console.error("POST /api/runs", e);
    return json(500, { error: "Error interno" });
  }
}
