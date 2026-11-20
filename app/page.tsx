import { Suspense } from 'react';
import Link from 'next/link';
import { getAdminClient } from '@/lib/supabase/admin';
import SuiteGrid from './components/SuiteGrid';

// Mini gráfico de la tarjeta negra: tasa de éxito acumulada, del run más antiguo al más reciente.
function Sparkline({ statuses }: { statuses: string[] }) {
  if (statuses.length < 2) return null;

  const rates = statuses.map(
    (_, i) => statuses.slice(0, i + 1).filter((s) => s === 'finished').length / (i + 1),
  );

  const W = 120;
  const H = 40;
  const PAD = 3;
  const points = rates.map((r, i) => {
    const x = PAD + (i / (rates.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - r) * (H - PAD * 2);
    return [x, y] as const;
  });
  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${points[points.length - 1][0].toFixed(1)},${H} L${points[0][0].toFixed(1)},${H} Z`;
  const [lx, ly] = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-28 h-10 shrink-0"
      role="img"
      aria-label="Evolución de la tasa de éxito en los últimos runs"
    >
      <path d={area} fill="currentColor" opacity="0.12" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="2.5" fill="currentColor" />
    </svg>
  );
}

type RunSummary = { total: number; passed: number; failed: number; duration_ms: number };
type RunRow = {
  id: string;
  status: string;
  created_at: string;
  suites?: { slug?: string; tools?: { name?: string; slug?: string } | null } | null;
  run_summary?: RunSummary | RunSummary[] | null;
};

const runSummary = (run: RunRow): RunSummary | null | undefined => (Array.isArray(run.run_summary) ? run.run_summary[0] : run.run_summary);

const runLabel = (run: RunRow) => {
  const summary = runSummary(run);
  if (run.status === 'finished') return summary && summary.failed > 0 ? 'Con fallos' : 'Superado';
  if (run.status === 'failed') return 'Fallido';
  return 'En curso';
};

const runDot = (run: RunRow) => {
  const summary = runSummary(run);
  if (run.status === 'finished') return summary && summary.failed > 0 ? 'bg-amber-400' : 'bg-emerald-400';
  if (run.status === 'failed') return 'bg-red-400';
  return 'bg-sky-400 animate-pulse';
};

const runHref = (run: RunRow) => (run.status === 'finished' ? `/runs/${run.id}/results` : `/runs/${run.id}`);

const runWhen = (iso: string) =>
  new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid',
  });

function LastRunPanel({ runs }: { runs: RunRow[] }) {
  const [last, ...previous] = runs;
  const lastSummary = last ? runSummary(last) : null;

  return (
    <div className="rounded-[24px] bg-[var(--bg-hero)] text-[var(--text-hero)] border border-[var(--border-subtle)] p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Último run</h2>
          <p className="text-xs opacity-60">Lo más reciente en el pipeline</p>
        </div>
        {last && <span className={`w-2.5 h-2.5 rounded-full ${runDot(last)}`} aria-hidden />}
      </div>

      {!last ? (
        <p className="text-xs opacity-60 py-8 text-center">Aún no hay ejecuciones registradas.</p>
      ) : (
        <>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
            <p className="text-xs opacity-60">{runLabel(last)} · {runWhen(last.created_at)}</p>
            <p className="text-xl font-semibold tracking-tight leading-tight">
              {last.suites?.tools?.name || 'Suite'} · {last.suites?.slug || 'run'}
            </p>
            {lastSummary && (
              <p className="text-xs opacity-70">
                {lastSummary.passed}/{lastSummary.total} tests · {Math.round(lastSummary.duration_ms / 1000)} s
              </p>
            )}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-mono opacity-50">{last.id.slice(0, 8)}</span>
              <Link
                href={runHref(last)}
                className="px-4 py-1.5 rounded-full bg-white text-[#141413] text-xs font-semibold hover:opacity-90 transition"
              >
                {last.status === 'finished' || last.status === 'failed' ? 'Ver resultados' : 'Ver en vivo'}
              </Link>
            </div>
          </div>

          {previous.length > 0 && (
            <div>
              <p className="text-xs opacity-60 mb-2">Anteriores</p>
              <div className="divide-y divide-white/10">
                {previous.slice(0, 4).map((run) => (
                  <Link key={run.id} href={runHref(run)} className="flex items-center gap-3 py-2.5 hover:opacity-80 transition">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${runDot(run)}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">
                        {run.suites?.tools?.name || 'Suite'} · {run.suites?.slug || 'run'}
                      </p>
                      <p className="text-xs opacity-50">{runLabel(run)} · {runWhen(run.created_at)}</p>
                    </div>
                    <span className="opacity-40" aria-hidden>›</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

async function StudioDashboard() {
  const db = getAdminClient();

  const [toolsRes, runsRes] = await Promise.all([
    db.from('tools').select('*').order('name', { ascending: true }),
    db
      .from('runs')
      .select('id, status, created_at, suites(slug, tools(name, slug)), run_summary(total, passed, failed, duration_ms)')
      .order('created_at', { ascending: false })
      .limit(6),
  ]);

  const tools = toolsRes.data || [];
  const recentRuns = runsRes.data || [];
  const finishedCount = recentRuns.filter((r) => r.status === 'finished').length;
  const passRate = recentRuns.length > 0 ? Math.round((finishedCount / recentRuns.length) * 100) : 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-8">
      {/* Cabecera estilo Studio */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Studio</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Entorno staging conectado · {tools.length} herramientas registradas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Workers listos
          </span>
        </div>
      </div>

      {/* 4 Tarjetas KPI (La primera destacada en negro carbón como en Talmo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[24px] bg-[var(--bg-hero)] text-[var(--text-hero)] border border-[var(--border-subtle)] p-6 flex flex-col justify-between min-h-[156px]">
          <div className="flex items-center justify-between text-xs opacity-70">
            <span>Estabilidad reciente</span>
            <span>Últimos runs</span>
          </div>
          <div className="my-2 flex items-end justify-between gap-3">
            <span className="text-3xl font-semibold tracking-tight">{passRate}%</span>
            <Sparkline statuses={[...recentRuns].reverse().map((r) => r.status)} />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
              Operativo
            </span>
            <span className="opacity-60">Pipeline CI/CD</span>
          </div>
        </div>

        <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 flex flex-col justify-between min-h-[156px]">
          <span className="text-xs text-[var(--text-secondary)]">Ejecuciones recientes</span>
          <span className="text-3xl font-semibold tracking-tight">{recentRuns.length}</span>
          <span className="text-xs text-[var(--text-secondary)]">{finishedCount} completadas con éxito</span>
        </div>

        <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 flex flex-col justify-between min-h-[156px]">
          <span className="text-xs text-[var(--text-secondary)]">Suites disponibles</span>
          <span className="text-3xl font-semibold tracking-tight">9</span>
          <span className="text-xs text-[var(--text-secondary)]">Módulos A – I configurados</span>
        </div>

        <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 flex flex-col justify-between min-h-[156px]">
          <span className="text-xs text-[var(--text-secondary)]">Tiempo medio arranque</span>
          <span className="text-3xl font-semibold tracking-tight">~39s</span>
          <span className="text-xs text-[var(--text-secondary)]">GitHub Actions Runner</span>
        </div>
      </div>

      {/* Grid inferior: columna izquierda (motores + mapa de suites) y panel negro del último run */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
        <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Motores de Automatización</h2>
              <p className="text-xs text-[var(--text-secondary)]">Selecciona un framework para configurar y lanzar pruebas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(tools.length > 0 ? tools : [
              { id: '1', slug: 'playwright', name: 'Playwright E2E', enabled: true },
              { id: '2', slug: 'selenium', name: 'Selenium WebDriver', enabled: true },
            ]).map((tool: any) => (
              <Link
                key={tool.id}
                href={`/${tool.slug}`}
                className="group p-5 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] hover:border-[var(--text-primary)] transition flex flex-col justify-between gap-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-base capitalize">{tool.name || tool.slug}</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                    {tool.enabled !== false ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>Configurar tags y lanzar</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Mapa herramienta × suite con el último resultado */}
        <SuiteGrid />
        </div>

        {/* Panel negro estilo "Next up": último run destacado + anteriores */}
        <LastRunPanel runs={recentRuns as unknown as RunRow[]} />
      </div>

    </div>
  );
}

export default function HomePage() {
  return (
    <main className="pb-12">
      <Suspense fallback={<div className="max-w-7xl mx-auto p-8 text-sm text-[var(--text-secondary)]">Cargando Studio...</div>}>
        <StudioDashboard />
      </Suspense>
    </main>
  );
}