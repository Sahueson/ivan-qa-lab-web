import Link from 'next/link';
import { getAdminClient } from '@/lib/supabase/admin';

type SuiteRow = { id: string; slug: string; name: string; tool_id: string };
type ToolRow = { id: string; slug: string; name: string };
type RunRow = { id: string; suite_id: string; status: string; created_at: string };
type TestRow = { run_id: string; name: string; status: string };

// Resultado de una celda (herramienta × suite): solo los tests de ESA suite dentro de la run más reciente que la ejecutó.
type CellData = { runId: string; runStatus: string; passed: number; failed: number; total: number };

// Letra de columna a partir del slug de la suite ("a-auth" -> "A").
const letterOf = (slug: string) => slug.charAt(0).toUpperCase();

// PERF-nn de JMeter -> suite (cases.json de qa-jmeter).
const PERF_SUITE: Record<number, string> = {
  1: 'A', 2: 'A', 3: 'B', 4: 'B', 5: 'B', 6: 'C', 7: 'C', 8: 'D', 9: 'E', 10: 'E', 11: 'F', 12: 'G', 13: 'G', 14: 'H', 15: 'I', 16: 'I',
  17: 'J', 18: 'J', 19: 'J',
};

/** Suite (letra) a la que pertenece un test, según su nombre: TC-B03 -> B, TC-SMOKE -> A, PERF-07 -> C. */
function suiteLetterOfTest(name: string): string | null {
  const tc = name.match(/^TC-([A-J])\d/i);
  if (tc) return tc[1].toUpperCase();
  if (/^TC-SMOKE/i.test(name)) return 'A';
  const perf = name.match(/^PERF-(\d+)/i);
  if (perf) return PERF_SUITE[Number(perf[1])] ?? null;
  return null;
}

function Cell({ cell, href }: { cell: CellData | undefined; href: string }) {
  const base = 'flex items-center justify-center gap-1.5 h-9 rounded-full text-xs font-medium transition hover:opacity-80';

  if (!cell) {
    return (
      <Link href={href} className={`${base} border border-dashed border-[var(--border-subtle)] text-[var(--text-secondary)]`}>
        –
      </Link>
    );
  }

  const active = ['waiting', 'queued', 'running'].includes(cell.runStatus);
  const target = active ? `/runs/${cell.runId}` : `/runs/${cell.runId}/results`;
  const counts = cell.total > 0 ? `${cell.passed}/${cell.total}` : '';

  if (!active && cell.total > 0 && cell.failed === 0) {
    return (
      <Link href={target} title="Superado" className={`${base} bg-[var(--pill-active-bg)] text-[var(--pill-active-text)]`}>
        ✓ {counts}
      </Link>
    );
  }

  const broken = !active && cell.total === 0; // run fallida o caducada sin resultados
  const dot = active ? 'bg-sky-500 animate-pulse' : broken ? 'bg-red-500' : 'bg-amber-500';
  const title = active ? 'En curso' : broken ? 'Fallido' : 'Con fallos';

  return (
    <Link
      href={target}
      title={title}
      className={`${base} bg-[var(--bg-surface)] border border-[var(--text-primary)]/60 text-[var(--text-primary)]`}
    >
      <span className={`w-2 h-2 rounded-full ${dot}`} aria-hidden />
      {counts || title}
    </Link>
  );
}

// Mapa herramienta × suite con el último resultado de cada una. Una run puede mezclar tests de varias suites (se guarda
// asociada a la primera), así que cada celda se calcula con los tests de su propia suite, no con el total de la run.
export default async function SuiteGrid() {
  const db = getAdminClient();
  const [toolsRes, suitesRes, runsRes] = await Promise.all([
    db.from('tools').select('id, slug, name').order('name', { ascending: true }),
    db.from('suites').select('id, slug, name, tool_id').order('slug', { ascending: true }),
    db.from('runs').select('id, suite_id, status, created_at').order('created_at', { ascending: false }).limit(200),
  ]);

  const tools = (toolsRes.data ?? []) as ToolRow[];
  const suites = (suitesRes.data ?? []) as SuiteRow[];
  const runs = (runsRes.data ?? []) as RunRow[];

  if (tools.length === 0 || suites.length === 0) return null;

  // Resultados de todos los tests de esas runs (PostgREST devuelve como mucho 1000 filas por petición).
  const tests: TestRow[] = [];
  const runIds = runs.map((r) => r.id);
  for (let from = 0; runIds.length > 0; from += 1000) {
    const { data } = await db.from('test_results').select('run_id, name, status').in('run_id', runIds).range(from, from + 999);
    tests.push(...((data ?? []) as TestRow[]));
    if (!data || data.length < 1000) break;
  }
  const testsByRun = new Map<string, TestRow[]>();
  for (const t of tests) (testsByRun.get(t.run_id) ?? testsByRun.set(t.run_id, []).get(t.run_id)!).push(t);

  const suiteToTool = new Map(suites.map((s) => [s.id, s.tool_id]));
  const letterOfSuite = new Map(suites.map((s) => [s.id, letterOf(s.slug)]));

  // Por herramienta y letra: la run más reciente con tests de esa suite (las runs vienen de más nueva a más antigua).
  const cells = new Map<string, CellData>(); // clave "toolId|letra"
  for (const run of runs) {
    const toolId = suiteToTool.get(run.suite_id);
    if (!toolId) continue;
    const byLetter = new Map<string, CellData>();
    for (const t of testsByRun.get(run.id) ?? []) {
      const letter = suiteLetterOfTest(t.name);
      if (!letter) continue;
      const c = byLetter.get(letter) ?? { runId: run.id, runStatus: run.status, passed: 0, failed: 0, total: 0 };
      c.total++;
      if (t.status === 'passed') c.passed++;
      else if (t.status === 'failed') c.failed++;
      byLetter.set(letter, c);
    }
    // Run sin resultados (en cola, en curso, fallida o caducada): cuenta para la suite con la que se creó.
    if (byLetter.size === 0) {
      const letter = letterOfSuite.get(run.suite_id);
      if (letter) byLetter.set(letter, { runId: run.id, runStatus: run.status, passed: 0, failed: 0, total: 0 });
    }
    for (const [letter, c] of byLetter) {
      const key = `${toolId}|${letter}`;
      if (!cells.has(key)) cells.set(key, c);
    }
  }

  // Las columnas son las suites únicas por letra entre todas las herramientas.
  const columns = Array.from(new Map(suites.map((s) => [letterOf(s.slug), s.name])).entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const suiteFor = (toolId: string, letter: string) =>
    suites.find((s) => s.tool_id === toolId && letterOf(s.slug) === letter);

  return (
    <section className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-5">
        <div>
          <h2 className="text-lg font-semibold">Mapa de suites</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Último resultado de cada suite en cada herramienta. Una run con tests de varias suites rellena cada celda con los tests de su suite.
          </p>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-[var(--text-secondary)]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[var(--pill-active-bg)]" /> Superado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Con fallos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Fallido
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border border-dashed border-[var(--text-secondary)]" /> Sin ejecutar
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid gap-1.5 items-center"
          style={{ gridTemplateColumns: `124px repeat(${columns.length}, minmax(56px, 1fr))`, minWidth: 124 + columns.length * 62 }}
        >
          <span />
          {columns.map(([letter, name]) => (
            <span
              key={letter}
              title={name}
              className="text-center text-[11px] font-mono font-semibold text-[var(--text-secondary)]"
            >
              {letter}
            </span>
          ))}

          {tools.map((tool) => (
            <div key={tool.id} className="contents">
              <Link href={`/${tool.slug}`} className="sticky left-0 z-10 bg-[var(--bg-surface)] text-sm font-medium truncate hover:underline pr-2">
                {tool.name}
              </Link>
              {columns.map(([letter]) => {
                const suite = suiteFor(tool.id, letter);
                // Esa herramienta no tiene esa suite: hueco discreto, no es "sin ejecutar".
                if (!suite) {
                  return (
                    <span
                      key={letter}
                      className="h-9 flex items-center justify-center text-[var(--border-subtle)]"
                      aria-label="Sin suite"
                    >
                      ·
                    </span>
                  );
                }
                return <Cell key={letter} cell={cells.get(`${tool.id}|${letter}`)} href={`/${tool.slug}`} />;
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
