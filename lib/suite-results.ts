import type { SupabaseClient } from "@supabase/supabase-js";

// PERF-nn de JMeter -> suite (cases.json de qa-jmeter).
const PERF_SUITE: Record<number, string> = {
  1: "A", 2: "A", 3: "B", 4: "B", 5: "B", 6: "C", 7: "C", 8: "D", 9: "E", 10: "E", 11: "F", 12: "G", 13: "G", 14: "H", 15: "I", 16: "I",
  17: "J", 18: "J", 19: "J",
};

/** Suite (letra) a la que pertenece un test según su nombre: TC-B03 -> B, TC-SMOKE -> A, PERF-07 -> C. */
export function suiteLetterOfTest(name: string): string | null {
  const tc = name.match(/^TC-([A-J])\d/i);
  if (tc) return tc[1].toUpperCase();
  if (/^TC-SMOKE/i.test(name)) return "A";
  const perf = name.match(/^PERF-(\d+)/i);
  if (perf) return PERF_SUITE[Number(perf[1])] ?? null;
  return null;
}

type TestRow = { run_id: string; name: string; status: string; duration_ms: number | null; error: string | null };
type Cell = {
  tool_slug: string; suite_letter: string; suite_slug: string | null;
  passed: number; failed: number; skipped: number; total: number; duration_ms: number;
  run_id: string; failures: { test: string; error: string }[]; slowest: { test: string; ms: number }[]; finished_at: string;
};

/**
 * Guarda en suite_results el último resultado de cada suite de una herramienta, calculado con sus runs terminadas.
 * Se llama justo antes de borrar runs antiguas, así lo que se borra ya está resumido. Es idempotente y nunca lanza.
 */
export async function syncSuiteResults(db: SupabaseClient, toolId: string, toolSlug: string): Promise<void> {
  try {
    const { data: suites } = await db.from("suites").select("id, slug").eq("tool_id", toolId);
    const slugOf = new Map((suites ?? []).map((s) => [s.slug.charAt(0).toUpperCase(), s.slug as string]));
    const suiteIds = (suites ?? []).map((s) => s.id);
    if (suiteIds.length === 0) return;

    const { data: runs } = await db
      .from("runs")
      .select("id, finished_at")
      .in("suite_id", suiteIds)
      .eq("status", "finished")
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false });
    if (!runs || runs.length === 0) return;

    const tests: TestRow[] = [];
    const runIds = runs.map((r) => r.id);
    for (let from = 0; ; from += 1000) {
      const { data } = await db.from("test_results").select("run_id, name, status, duration_ms, error").in("run_id", runIds).range(from, from + 999);
      tests.push(...((data ?? []) as TestRow[]));
      if (!data || data.length < 1000) break;
    }
    const byRun = new Map<string, TestRow[]>();
    for (const t of tests) (byRun.get(t.run_id) ?? byRun.set(t.run_id, []).get(t.run_id)!).push(t);

    // De la run más reciente a la más antigua: la primera que trae tests de una suite fija su celda.
    const cells = new Map<string, Cell>();
    for (const run of runs) {
      const perLetter = new Map<string, TestRow[]>();
      for (const t of byRun.get(run.id) ?? []) {
        const letter = suiteLetterOfTest(t.name);
        if (letter) (perLetter.get(letter) ?? perLetter.set(letter, []).get(letter)!).push(t);
      }
      for (const [letter, list] of perLetter) {
        if (cells.has(letter)) continue;
        cells.set(letter, {
          tool_slug: toolSlug,
          suite_letter: letter,
          suite_slug: slugOf.get(letter) ?? null,
          passed: list.filter((t) => t.status === "passed").length,
          failed: list.filter((t) => t.status === "failed").length,
          skipped: list.filter((t) => t.status === "skipped").length,
          total: list.length,
          duration_ms: list.reduce((a, t) => a + (t.duration_ms ?? 0), 0),
          run_id: run.id,
          failures: list.filter((t) => t.status === "failed").slice(0, 10).map((t) => ({ test: t.name, error: String(t.error ?? "").slice(0, 300) })),
          slowest: [...list].sort((a, b) => (b.duration_ms ?? 0) - (a.duration_ms ?? 0)).slice(0, 5).map((t) => ({ test: t.name, ms: t.duration_ms ?? 0 })),
          finished_at: run.finished_at as string,
        });
      }
    }
    if (cells.size === 0) return;

    // Solo se sobrescribe si el resultado es más reciente que el guardado.
    const { data: existing } = await db.from("suite_results").select("suite_letter, finished_at").eq("tool_slug", toolSlug);
    const old = new Map((existing ?? []).map((e) => [e.suite_letter.trim(), new Date(e.finished_at).getTime()]));
    const rows = [...cells.values()].filter((c) => !old.has(c.suite_letter) || new Date(c.finished_at).getTime() > (old.get(c.suite_letter) ?? 0));
    if (rows.length > 0) await db.from("suite_results").upsert(rows, { onConflict: "tool_slug,suite_letter" });
  } catch {
    // la tabla puede no existir todavía (migración pendiente): no debe romper el lanzamiento ni la limpieza
  }
}
