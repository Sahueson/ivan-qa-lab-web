import Link from 'next/link';
import { getAdminClient } from '@/lib/supabase/admin';

type Summary = { total: number; passed: number; failed: number };
type SuiteRow = { id: string; slug: string; name: string; tool_id: string };
type ToolRow = { id: string; slug: string; name: string };
type RunRow = {
  id: string;
  suite_id: string;
  status: string;
  created_at: string;
  run_summary?: Summary | Summary[] | null;
};

const summaryOf = (run: RunRow): Summary | null => {
  const s = Array.isArray(run.run_summary) ? run.run_summary[0] : run.run_summary;
  return s ?? null;
};

// Letra de columna a partir del slug de la suite ("a-auth" -> "A").
const letterOf = (slug: string) => slug.charAt(0).toUpperCase();

function Cell({ run, href }: { run: RunRow | undefined; href: string }) {
  const base = 'flex items-center justify-center gap-1.5 h-9 rounded-full text-xs font-medium transition hover:opacity-80';

  if (!run) {
    return (
      <Link href={href} className={`${base} border border-dashed border-[var(--border-subtle)] text-[var(--text-secondary)]`}>
        –
      </Link>
    );
  }

  const summary = summaryOf(run);
  const target = run.status === 'finished' || run.status === 'failed' ? `/runs/${run.id}/results` : `/runs/${run.id}`;
  const counts = summary ? `${summary.passed}/${summary.total}` : '';

  if (run.status === 'finished' && summary && summary.failed === 0) {
    return (
      <Link
        href={target}
        title="Superado"
        className={`${base} bg-[var(--pill-active-bg)] text-[var(--pill-active-text)]`}
      >
        ✓ {counts}
      </Link>
    );
  }

  const dot =
    run.status === 'failed' ? 'bg-red-500' : run.status === 'finished' ? 'bg-amber-500' : 'bg-sky-500 animate-pulse';
  const title = run.status === 'failed' ? 'Fallido' : run.status === 'finished' ? 'Con fallos' : 'En curso';

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

// Mapa herramienta × suite con el último resultado de cada una (inspirado en el timeline de la referencia).
export default async function SuiteGrid() {
  const db = getAdminClient();
  const [toolsRes, suitesRes, runsRes] = await Promise.all([
    db.from('tools').select('id, slug, name').order('name', { ascending: true }),
    db.from('suites').select('id, slug, name, tool_id').order('slug', { ascending: true }),
    db
      .from('runs')
      .select('id, suite_id, status, created_at, run_summary(total, passed, failed)')
      .order('created_at', { ascending: false })
      .limit(80),
  ]);

  const tools = (toolsRes.data ?? []) as ToolRow[];
  const suites = (suitesRes.data ?? []) as SuiteRow[];
  const runs = (runsRes.data ?? []) as unknown as RunRow[];

  if (tools.length === 0 || suites.length === 0) return null;

  // Las columnas son las suites únicas por letra (A–I) entre todas las herramientas.
  const columns = Array.from(new Map(suites.map((s) => [letterOf(s.slug), s.name])).entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  // Último run por suite (las filas ya vienen ordenadas de más nuevo a más antiguo).
  const lastBySuite = new Map<string, RunRow>();
  for (const run of runs) if (!lastBySuite.has(run.suite_id)) lastBySuite.set(run.suite_id, run);

  const suiteFor = (toolId: string, letter: string) =>
    suites.find((s) => s.tool_id === toolId && letterOf(s.slug) === letter);

  return (
    <section className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-5">
        <div>
          <h2 className="text-lg font-semibold">Mapa de suites</h2>
          <p className="text-xs text-[var(--text-secondary)]">Último resultado de cada suite en cada herramienta</p>
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
          className="grid gap-2 min-w-[720px] items-center"
          style={{ gridTemplateColumns: `140px repeat(${columns.length}, minmax(0, 1fr))` }}
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
              <Link href={`/${tool.slug}`} className="text-sm font-medium truncate hover:underline pr-2">
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
                return <Cell key={letter} run={lastBySuite.get(suite.id)} href={`/${tool.slug}`} />;
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
