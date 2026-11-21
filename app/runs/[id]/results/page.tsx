import { Suspense } from 'react';
import { getAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { testStatusLabel } from '@/lib/labels';
import { getT } from '@/lib/i18n-server';
import { caseCode, compareCaseNames } from '@/lib/case-order';
import AreaChart from '@/app/components/AreaChart';

async function ResultsContent({ params }: { params: Promise<{ id: string }> }) {
  const { t } = await getT();
  const { id: runId } = await params;
  const db = getAdminClient();

  const [summaryRes, testsRes] = await Promise.all([
    db.from('run_summary').select('*').eq('run_id', runId).single(),
    db.from('test_results').select('*').eq('run_id', runId).order('name', { ascending: true }),
  ]);

  const summary = summaryRes.data;

  // Informe HTML de la herramienta (Newman, JMeter...), publicado en GitHub Pages del repo de la herramienta
  // (https://<usuario>.github.io/<repo>/<run_id>/). Solo se enseña el enlace si existe.
  let reportUrl: string | null = null;
  const { data: runRow } = await db.from('runs').select('suites(tools(github_repo))').eq('id', runId).maybeSingle();
  const repo = (runRow as unknown as { suites?: { tools?: { github_repo?: string } } } | null)?.suites?.tools?.github_repo;
  if (repo && /^[\w.-]+\/[\w.-]+$/.test(repo)) {
    const [owner, name] = repo.split('/');
    const url = `https://${owner.toLowerCase()}.github.io/${name}/${runId}/`;
    try {
      const head = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
      if (head.ok) reportUrl = url;
    } catch {
      // sin informe publicado
    }
  }
  // Mismo orden que el selector: TC-SMOKE, TC-A01, TC-A01b, TC-A02...
  const tests = [...(testsRes.data || [])].sort((a, b) => compareCaseNames(a.name, b.name));

  if (!summary) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-center text-sm text-[var(--text-secondary)]">
        {t('Resultados no encontrados o la ejecución aún no ha finalizado.')}
      </div>
    );
  }

  const passRate = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;
  const maxDuration = Math.max(...tests.map((t) => t.duration_ms || 1000), 1000);
  // Duración acumulada (en segundos) escenario a escenario, para el gráfico de área.
  const cumulative = tests.map((t, i) => ({
    label: caseCode(t.name),
    value: tests.slice(0, i + 1).reduce((acc, x) => acc + (x.duration_ms || 0) / 1000, 0),
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">{t('Resultados')}</h1>
          <p className="text-xs text-[var(--text-secondary)] font-mono mt-1">RUN ID: {runId}</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          {reportUrl && (
            <a
              href={reportUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-full bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] text-sm font-medium hover:opacity-90 transition"
            >
              {t('Ver informe HTML')} ↗
            </a>
          )}
          <Link
            href="/"
            className="px-4 py-2 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-sm font-medium hover:opacity-80 transition"
          >
            ← {t('Volver al inicio')}
          </Link>
        </div>
      </div>

      {/* 4 Tarjetas KPI estilo Reports */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-[24px] bg-[var(--bg-hero)] text-[var(--text-hero)] border border-[var(--border-subtle)] p-4 sm:p-6 flex flex-col justify-between min-h-[120px] sm:min-h-[150px]">
          <span className="text-xs opacity-70">{t('Tasa de éxito')}</span>
          <span className="text-3xl font-semibold tracking-tight">{passRate}%</span>
          <span className="text-xs opacity-60">{t('{p} de {n} tests', { p: summary.passed, n: summary.total })}</span>
        </div>

        <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 sm:p-6 flex flex-col justify-between min-h-[120px] sm:min-h-[150px]">
          <span className="text-xs text-[var(--text-secondary)]">{t('Pasados')}</span>
          <span className="text-3xl font-semibold text-emerald-600 dark:text-emerald-400">{summary.passed}</span>
          <span className="text-xs text-[var(--text-secondary)]">{t('Aserciones correctas')}</span>
        </div>

        <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 sm:p-6 flex flex-col justify-between min-h-[120px] sm:min-h-[150px]">
          <span className="text-xs text-[var(--text-secondary)]">{t('Fallados')}</span>
          <span className="text-3xl font-semibold text-red-600 dark:text-red-400">{summary.failed}</span>
          <span className="text-xs text-[var(--text-secondary)]">{t('Requieren revisión')}</span>
        </div>

        <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 sm:p-6 flex flex-col justify-between min-h-[120px] sm:min-h-[150px]">
          <span className="text-xs text-[var(--text-secondary)]">{t('Duración total')}</span>
          <span className="text-3xl font-semibold">{(summary.duration_ms / 1000).toFixed(1)}s</span>
          <span className="text-xs text-[var(--text-secondary)]">{t('Tiempo neto suite')}</span>
        </div>
      </div>

      {/* Gráfico de área: duración acumulada (inspirado en "Fees earned" de Talmo) */}
      {cumulative.length > 1 && (
        <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6">
          <h2 className="text-base font-semibold mb-1">{t('Duración acumulada')}</h2>
          <p className="text-xs text-[var(--text-secondary)] mb-4">{t('Tiempo transcurrido de la suite escenario a escenario')}</p>
          <AreaChart points={cumulative} ariaLabel={t('Duración acumulada de la suite por escenario')} />
        </div>
      )}

      {/* Gráfico de barras verticales por test (inspirado en "By week" de Talmo) */}
      {tests.length > 0 && (
        <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6">
          <h2 className="text-base font-semibold mb-1">{t('Tiempos por escenario')}</h2>
          <p className="text-xs text-[var(--text-secondary)] mb-6">{t('Comparativa de duración en segundos · en negro el más lento, en rojo los fallidos')}</p>
          <div className="flex items-end gap-3 h-36 pt-4 px-2 overflow-x-auto">
            {tests.map((test) => {
              const heightPct = Math.max(15, Math.round(((test.duration_ms || 500) / maxDuration) * 100));
              return (
                <div key={test.id} title={test.name} className="flex-1 min-w-[48px] flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                    {test.duration_ms ? `${(test.duration_ms / 1000).toFixed(1)}s` : '-'}
                  </span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[44px] rounded-t-xl transition-all ${
                      test.status === 'failed'
                        ? 'bg-red-500'
                        : (test.duration_ms || 0) === maxDuration
                        ? 'bg-[var(--pill-active-bg)]'
                        : 'bg-[var(--text-secondary)] opacity-40 hover:opacity-70'
                    }`}
                  />
                  {/* Solo el código (TC-D05): el nombre entero no cabe bajo la barra; se ve al pasar
                      el ratón (title) y en la tabla de abajo. */}
                  <span className="text-[10px] font-mono text-[var(--text-secondary)] whitespace-nowrap">
                    {caseCode(test.name)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabla de resultados */}
      <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead className="border-b border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
            <tr>
              <th className="p-5 font-medium">{t('Escenario')}</th>
              <th className="p-5 font-medium">{t('Estado')}</th>
              <th className="p-5 font-medium">{t('Duración')}</th>
              <th className="p-5 font-medium">{t('Evidencia')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] text-sm">
            {tests.map((test) => (
              <tr key={test.id} className="hover:bg-[var(--bg-surface-muted)]/60 transition">
                <td className="p-5 font-medium">
                  {test.name}
                  {test.error && <p className="text-red-500 text-xs mt-1 font-mono">{test.error}</p>}
                </td>
                <td className="p-5">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                      test.status === 'passed'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : test.status === 'failed'
                        ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                        : 'bg-neutral-500/15 text-neutral-500'
                    }`}
                  >
                    {t(testStatusLabel(test.status))}
                  </span>
                </td>
                <td className="p-5 text-[var(--text-secondary)] font-mono text-xs">
                  {test.duration_ms ? `${(test.duration_ms / 1000).toFixed(1)}s` : '-'}
                </td>
                <td className="p-5">
                  {test.evidence_url ? (
                    <a
                      href={test.evidence_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 rounded-full bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-xs font-medium hover:opacity-80 transition inline-block"
                    >
                      {test.evidence_url.endsWith(".json") ? `${t('Ver petición y respuesta')} ↗` : `${t('Ver captura')} ↗`}
                    </a>
                  ) : (
                    <span className="text-[var(--text-secondary)] text-xs">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="pb-12">
      <Suspense fallback={<div className="max-w-6xl mx-auto p-8 text-sm text-[var(--text-secondary)]">…</div>}>
        <ResultsContent params={params} />
      </Suspense>
    </main>
  );
}