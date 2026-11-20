import { Suspense } from 'react';
import { getAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { caseCode, compareCaseNames } from '@/lib/case-order';

async function ResultsContent({ params }: { params: Promise<{ id: string }> }) {
  const { id: runId } = await params;
  const db = getAdminClient();

  const [summaryRes, testsRes] = await Promise.all([
    db.from('run_summary').select('*').eq('run_id', runId).single(),
    db.from('test_results').select('*').eq('run_id', runId).order('name', { ascending: true }),
  ]);

  const summary = summaryRes.data;
  // Mismo orden que el selector: TC-SMOKE, TC-A01, TC-A01b, TC-A02...
  const tests = [...(testsRes.data || [])].sort((a, b) => compareCaseNames(a.name, b.name));

  if (!summary) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-center text-sm text-[var(--text-secondary)]">
        Resultados no encontrados o la ejecución aún no ha finalizado.
      </div>
    );
  }

  const passRate = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;
  const maxDuration = Math.max(...tests.map((t) => t.duration_ms || 1000), 1000);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Reports</h1>
          <p className="text-xs text-[var(--text-secondary)] font-mono mt-1">RUN ID: {runId}</p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-sm font-medium hover:opacity-80 transition self-start"
        >
          ← Volver a Studio
        </Link>
      </div>

      {/* 4 Tarjetas KPI estilo Reports */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[24px] bg-[var(--bg-hero)] text-[var(--text-hero)] border border-[var(--border-subtle)] p-6 flex flex-col justify-between min-h-[150px]">
          <span className="text-xs opacity-70">Tasa de éxito</span>
          <span className="text-3xl font-semibold tracking-tight">{passRate}%</span>
          <span className="text-xs opacity-60">{summary.passed} de {summary.total} tests</span>
        </div>

        <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 flex flex-col justify-between min-h-[150px]">
          <span className="text-xs text-[var(--text-secondary)]">Pasados</span>
          <span className="text-3xl font-semibold text-emerald-600 dark:text-emerald-400">{summary.passed}</span>
          <span className="text-xs text-[var(--text-secondary)]">Aserciones correctas</span>
        </div>

        <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 flex flex-col justify-between min-h-[150px]">
          <span className="text-xs text-[var(--text-secondary)]">Fallados</span>
          <span className="text-3xl font-semibold text-red-600 dark:text-red-400">{summary.failed}</span>
          <span className="text-xs text-[var(--text-secondary)]">Requieren revisión</span>
        </div>

        <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 flex flex-col justify-between min-h-[150px]">
          <span className="text-xs text-[var(--text-secondary)]">Duración total</span>
          <span className="text-3xl font-semibold">{(summary.duration_ms / 1000).toFixed(1)}s</span>
          <span className="text-xs text-[var(--text-secondary)]">Tiempo neto suite</span>
        </div>
      </div>

      {/* Gráfico de barras verticales por test (inspirado en "By week" de Talmo) */}
      {tests.length > 0 && (
        <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6">
          <h2 className="text-base font-semibold mb-1">Tiempos por escenario</h2>
          <p className="text-xs text-[var(--text-secondary)] mb-6">Comparativa de duración en segundos</p>
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
                        : 'bg-[var(--pill-active-bg)] opacity-85 hover:opacity-100'
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
              <th className="p-5 font-medium">Escenario</th>
              <th className="p-5 font-medium">Estado</th>
              <th className="p-5 font-medium">Duración</th>
              <th className="p-5 font-medium">Evidencia</th>
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
                    {test.status}
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
                      Ver captura ↗
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
      <Suspense fallback={<div className="max-w-6xl mx-auto p-8 text-sm text-[var(--text-secondary)]">Cargando informe...</div>}>
        <ResultsContent params={params} />
      </Suspense>
    </main>
  );
}