import type { SupabaseClient } from "@supabase/supabase-js";

// Una run = un lanzamiento (puede mezclar tests de varias suites). De cada herramienta solo se guardan las 4 últimas:
// la nueva "pisa" a la más antigua. Así el plan gratuito de Supabase (500 MB de base y 1 GB de ficheros) no se llena.
export const MAX_STORED_RUNS_PER_TOOL = 4;
const FINISHED = ["finished", "failed", "timeout"];

export async function pruneOldRunsForTool(db: SupabaseClient, toolId: string): Promise<number> {
  const { data: toolSuites } = await db.from("suites").select("id").eq("tool_id", toolId);
  const suiteIds = (toolSuites ?? []).map((s) => s.id);
  if (suiteIds.length === 0) return 0;

  const { data: toolRuns } = await db
    .from("runs")
    .select("id, status")
    .in("suite_id", suiteIds)
    .order("created_at", { ascending: false });
  if (!toolRuns) return 0;

  // Nunca se borra un run en cola o en curso, aunque quede fuera de las 4 más recientes.
  const idsToDelete = toolRuns.slice(MAX_STORED_RUNS_PER_TOOL).filter((r) => FINISHED.includes(r.status)).map((r) => r.id);
  if (idsToDelete.length === 0) return 0;

  // 1. Ficheros del bucket 'evidence' de esas runs (runs/<run_id>/...)
  for (const oldRunId of idsToDelete) {
    try {
      const { data: files } = await db.storage.from("evidence").list(`runs/${oldRunId}`);
      if (files && files.length > 0) {
        await db.storage.from("evidence").remove(files.map((f) => `runs/${oldRunId}/${f.name}`));
      }
    } catch {
      // sin evidencias en storage para esa run
    }
  }

  // 2. Filas relacionadas y las runs. run_requests NO se toca: es el historial del límite por IP y por día.
  await Promise.all([
    db.from("run_events").delete().in("run_id", idsToDelete),
    db.from("test_results").delete().in("run_id", idsToDelete),
    db.from("run_summary").delete().in("run_id", idsToDelete),
  ]);
  await db.from("runs").delete().in("id", idsToDelete);
  return idsToDelete.length;
}

/** Aplica el límite a todas las herramientas (lo llama /api/runs/advance al terminar cada run). */
export async function pruneAllTools(db: SupabaseClient): Promise<number> {
  const { data: tools } = await db.from("tools").select("id");
  let n = 0;
  for (const t of tools ?? []) n += await pruneOldRunsForTool(db, t.id);
  return n;
}
