import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dispatchWorkflow } from "@/lib/github/dispatch";

export const MAX_WAITING = 5;

type Waiting = {
  id: string;
  queue_suite: string | null;
  queue_grep: string | null;
  suites: { slug: string; tool_id: string; tools: { github_repo: string; workflow_file: string } } | null;
};

/** ¿Hay un run activo o el staging reservado? Entonces no se puede lanzar otro. */
export async function isBusy(db: SupabaseClient): Promise<boolean> {
  const { count } = await db.from("runs").select("id", { count: "exact", head: true }).in("status", ["queued", "running"]);
  if ((count ?? 0) > 0) return true;
  const { data: lock } = await db.from("staging_lock").select("holder, expires_at").eq("id", 1)
    .maybeSingle<{ holder: string | null; expires_at: string | null }>();
  return !!(lock?.holder && lock.expires_at && new Date(lock.expires_at) > new Date());
}

/**
 * Lanza el run en cola más antiguo si el entorno está libre. Es idempotente y seguro de llamar desde cualquier sitio
 * (el índice one_active_run impide que dos llamadas lancen a la vez). Devuelve el run lanzado o el motivo.
 */
export async function advanceQueue(db: SupabaseClient): Promise<{ started: string | null; reason?: "busy" | "empty" }> {
  await db.rpc("expire_stale_runs");
  for (let i = 0; i < MAX_WAITING + 1; i++) {
    const { data } = await db
      .from("runs")
      .select("id, queue_suite, queue_grep, suites(slug, tool_id, tools(github_repo, workflow_file))")
      .eq("status", "waiting")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const next = data as unknown as Waiting | null;
    if (!next || !next.suites) return { started: null, reason: "empty" };
    if (await isBusy(db)) return { started: null, reason: "busy" };

    // created_at se renueva: expire_stale_runs cuenta los 5 min de 'queued' desde aquí, no desde que se encoló.
    const { data: promoted, error } = await db
      .from("runs")
      .update({ status: "queued", created_at: new Date().toISOString() })
      .eq("id", next.id)
      .eq("status", "waiting")
      .select("id")
      .maybeSingle();
    if (error?.code === "23505") return { started: null, reason: "busy" }; // otro lo lanzó a la vez
    if (error || !promoted) continue;

    try {
      await dispatchWorkflow({
        repo: next.suites.tools.github_repo,
        workflowFile: next.suites.tools.workflow_file,
        inputs: { run_id: next.id, suite: next.queue_suite ?? next.suites.slug, grep: next.queue_grep ?? "" },
      });
      return { started: next.id };
    } catch (e) {
      console.error("dispatch (cola) failed", next.id, e);
      await db.from("runs").update({ status: "failed", finished_at: new Date().toISOString() }).eq("id", next.id);
      // sigue con el siguiente de la cola
    }
  }
  return { started: null, reason: "busy" };
}
