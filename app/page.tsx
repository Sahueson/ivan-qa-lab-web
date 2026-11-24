import { Suspense } from 'react';
import Link from 'next/link';
import { getAdminClient } from '@/lib/supabase/admin';
import { getT } from '@/lib/i18n-server';
import { dateLocale, type Locale } from '@/lib/i18n';

// Mini gráfico de la tarjeta negra: tasa de éxito acumulada, del run más antiguo al más reciente.
function Sparkline({ statuses, label }: { statuses: string[]; label: string }) {
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
      aria-label={label}
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
  queue_suite?: string | null;
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

const runWhen = (iso: string, locale: Locale) =>
  new Date(iso).toLocaleString(dateLocale(locale), {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid',
  });

type T = (es: string, vars?: Record<string, string | number>) => string;

function LastRunPanel({ runs, t, locale }: { runs: RunRow[]; t: T; locale: Locale }) {
  const [last, ...previous] = runs;
  const lastSummary = last ? runSummary(last) : null;

  return (
    <div className="rounded-[24px] bg-[var(--bg-hero)] text-[var(--text-hero)] border border-[var(--border-subtle)] p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('Último run')}</h2>
          <p className="text-xs opacity-60">{t('Lo más reciente en el pipeline')}</p>
        </div>
        {last && <span className={`w-2.5 h-2.5 rounded-full ${runDot(last)}`} aria-hidden />}
      </div>

      {!last ? (
        <p className="text-xs opacity-60 py-8 text-center">{t('Aún no hay ejecuciones registradas.')}</p>
      ) : (
        <>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
            <p className="text-xs opacity-60">{t(runLabel(last))} · {runWhen(last.created_at, locale)}</p>
            <p className="text-xl font-semibold tracking-tight leading-tight">
              {last.suites?.tools?.name || t('Suite')} · {last.queue_suite?.includes(',') ? t('Varias suites') : last.suites?.slug || 'run'}
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
                {last.status === 'finished' || last.status === 'failed' ? t('Ver resultados') : t('Ver en vivo')}
              </Link>
            </div>
          </div>

          {previous.length > 0 && (
            <div>
              <p className="text-xs opacity-60 mb-2">{t('Anteriores')}</p>
              <div className="divide-y divide-white/10">
                {previous.slice(0, 4).map((run) => (
                  <Link key={run.id} href={runHref(run)} className="flex items-center gap-3 py-2.5 hover:opacity-80 transition">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${runDot(run)}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">
                        {run.suites?.tools?.name || t('Suite')} · {run.queue_suite?.includes(',') ? t('Varias suites') : run.suites?.slug || 'run'}
                      </p>
                      <p className="text-xs opacity-50">{t(runLabel(run))} · {runWhen(run.created_at, locale)}</p>
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
  const { t, locale } = await getT();
  const db = getAdminClient();

  const [toolsRes, runsRes, suitesRes, activeRes, waitingRes] = await Promise.all([
    db.from('tools').select('*').order('name', { ascending: true }),
    db
      .from('runs')
      .select('id, status, created_at, queue_suite, suites(slug, tools(name, slug)), run_summary(total, passed, failed, duration_ms)')
      .order('created_at', { ascending: false })
      .limit(14),
    db.from('suites').select('slug'),
    db.from('runs').select('id', { count: 'exact', head: true }).in('status', ['queued', 'running']),
    db.from('runs').select('id', { count: 'exact', head: true }).eq('status', 'waiting'),
  ]);

  const tools = toolsRes.data || [];
  const allRuns = (runsRes.data || []) as any[];
  const recentRuns = allRuns.slice(0, 6); // lo último que pasó (panel "Último run")
  // Las cifras de salud no cuentan la Demo de fallos (falla a propósito) y "superada" = terminó Y no falló ningún test.
  // También se excluyen los lanzamientos que incluyen la demo entre varias suites (queue_suite = "a-auth,j-demo-fallos"):
  // sus 7 fallos son a propósito y no dicen nada de la salud de la app.
  const isDemo = (r: any) => r.suites?.slug === 'j-demo-fallos' || String(r.queue_suite ?? '').split(',').includes('j-demo-fallos');
  const realRuns = allRuns.filter((r) => !isDemo(r)).slice(0, 6);
  const failedOf = (r: any) => {
    const sm = Array.isArray(r.run_summary) ? r.run_summary[0] : r.run_summary;
    return sm ? sm.failed : 0;
  };
  const passedRuns = realRuns.filter((r) => r.status === 'finished' && failedOf(r) === 0);
  const passRate = realRuns.length > 0 ? Math.round((passedRuns.length / realRuns.length) * 100) : 0;
  const suiteCount = new Set((suitesRes.data || []).map((x: any) => x.slug).filter((x: string) => x !== 'j-demo-fallos')).size;
  const activeCount = activeRes.count ?? 0;
  const waitingCount = waitingRes.count ?? 0;
  const lastReal = realRuns[0];
  const lastHealth = !lastReal
    ? { text: 'Sin runs', cls: 'bg-white/10 text-white/70' }
    : lastReal.status === 'finished' && failedOf(lastReal) === 0
      ? { text: 'Último run superado', cls: 'bg-emerald-500/20 text-emerald-400' }
      : lastReal.status === 'finished'
        ? { text: 'Último run con fallos', cls: 'bg-amber-500/20 text-amber-300' }
        : ['queued', 'running', 'waiting'].includes(lastReal.status)
          ? { text: 'En curso', cls: 'bg-sky-500/20 text-sky-300' }
          : { text: 'Último run fallido', cls: 'bg-red-500/20 text-red-300' };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-8">
      {/* Cabecera estilo Studio */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">{t('Inicio')}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {t('Entorno de pruebas: staging de Tactical Calendar · {n} herramientas', { n: tools.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-medium flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${activeCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            {activeCount > 0 ? t('Ejecutando una prueba') : t('Libre para lanzar')}
            {waitingCount > 0 ? ` · ${t('{n} en cola', { n: waitingCount })}` : ''}
          </span>
        </div>
      </div>

      {/* 4 Tarjetas KPI (La primera destacada en negro carbón como en Talmo) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="col-span-2 lg:col-span-1 rounded-[24px] bg-[var(--bg-hero)] text-[var(--text-hero)] border border-[var(--border-subtle)] p-5 sm:p-6 flex flex-col justify-between min-h-[130px] sm:min-h-[156px]">
          <div className="flex items-center justify-between text-xs opacity-70">
            <span>{t('Estabilidad reciente')}</span>
            <span>{t('Últimos runs')}</span>
          </div>
          <div className="my-2 flex items-end justify-between gap-3">
            <span className="text-3xl font-semibold tracking-tight">{passRate}%</span>
            <Sparkline label={t('Evolución de la tasa de éxito en los últimos runs')} statuses={[...realRuns].reverse().map((r) => (r.status === 'finished' && failedOf(r) > 0 ? 'with_failures' : r.status))} />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded-full font-medium ${lastHealth.cls}`}>{t(lastHealth.text)}</span>
          </div>
        </div>

        <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 sm:p-6 flex flex-col justify-between min-h-[120px] sm:min-h-[156px]">
          <span className="text-xs text-[var(--text-secondary)]">{t('Ejecuciones recientes')}</span>
          <span className="text-3xl font-semibold tracking-tight">{realRuns.length}</span>
          <span className="text-xs text-[var(--text-secondary)]">{t('{n} superadas sin fallos', { n: passedRuns.length })}</span>
        </div>

        <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 sm:p-6 flex flex-col justify-between min-h-[120px] sm:min-h-[156px]">
          <span className="text-xs text-[var(--text-secondary)]">{t('Suites disponibles')}</span>
          <span className="text-3xl font-semibold tracking-tight">{suiteCount}</span>
          <span className="text-xs text-[var(--text-secondary)]">{t('Suites reales (A–I) por herramienta')}</span>
        </div>

        <div className="col-span-2 lg:col-span-1 rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 sm:p-6 flex flex-col justify-between min-h-[120px] sm:min-h-[156px]">
          <span className="text-xs text-[var(--text-secondary)]">{t('Tiempo medio arranque')}</span>
          <span className="text-3xl font-semibold tracking-tight">~39s</span>
          <span className="text-xs text-[var(--text-secondary)]">{t('Medido en GitHub Actions')}</span>
        </div>
      </div>

      {/* Grid inferior: columna izquierda (motores + mapa de suites) y panel negro del último run */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
        <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">{t('Motores de Automatización')}</h2>
              <p className="text-xs text-[var(--text-secondary)]">{t('Selecciona un framework para configurar y lanzar pruebas')}</p>
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
                className="group p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] hover:border-[var(--text-primary)] transition flex flex-col justify-between gap-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-base capitalize">{tool.name || tool.slug}</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                    {tool.enabled !== false ? t('Activo') : t('Inactivo')}
                  </span>
                </div>
                <div className="hidden sm:flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>{t('Elegir suite y lanzar')}</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        </div>

        {/* Panel negro estilo "Next up": último run destacado + anteriores */}
        <LastRunPanel runs={recentRuns as unknown as RunRow[]} t={t} locale={locale} />
      </div>

    </div>
  );
}

export default function HomePage() {
  return (
    <main className="pb-12">
      <Suspense fallback={<div className="max-w-7xl mx-auto p-8 text-sm text-[var(--text-secondary)]">…</div>}>
        <StudioDashboard />
      </Suspense>
    </main>
  );
}