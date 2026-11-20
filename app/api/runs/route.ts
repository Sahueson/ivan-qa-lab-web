import { createHash } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { dispatchWorkflow } from "@/lib/github/dispatch";

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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "El cuerpo debe ser JSON" });
  }

  // Se añaden los campos turnstileToken y selectedTags
  const { tool, suite, turnstileToken, selectedTags = [] } = (body ?? {}) as any;

  if (typeof tool !== "string" || typeof suite !== "string" || !SLUG.test(tool) || !SLUG.test(suite)) {
    return json(400, { error: "Se esperan 'tool' y 'suite' como slugs válidos" });
  }

  if (!turnstileToken) {
    return json(400, { error: "Falta la validación del Captcha" });
  }

  // 1. Validar Turnstile
  const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: turnstileToken,
    }),
  });
  const verifyJson = await verifyRes.json();
  if (!verifyJson.success) {
    return json(400, { error: "Captcha inválido" });
  }

  const db = getAdminClient();
  const ipHash = clientIpHash(request);

  try {
    const { error: expireError } = await db.rpc("expire_stale_runs");
    if (expireError) throw expireError;

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
      const grepFilter = Array.isArray(selectedTags) && selectedTags.length > 0 ? selectedTags.join('|') : '';
      
      await dispatchWorkflow({
        repo: row.tools.github_repo,
        workflowFile: row.tools.workflow_file,
        // Se añade 'grep' a los inputs para que GitHub Actions lo reciba
        inputs: { run_id: run.id, suite: row.slug, grep: grepFilter },
      });
    } catch (e) {
      console.error("dispatch failed", run.id, e);
      await db.from("runs")
        .update({ status: "failed", finished_at: new Date().toISOString() })
        .eq("id", run.id);
      await db.from("run_requests").delete().eq("run_id", run.id);
      return json(502, { error: "No se pudo lanzar la ejecución", run_id: run.id });
    }

    return json(201, { run_id: run.id });
  } catch (e) {
    console.error("POST /api/runs", e);
    return json(500, { error: "Error interno" });
  }
}