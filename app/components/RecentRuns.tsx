import Link from 'next/link';
import { runStatusLabel } from '@/lib/labels';
import { getAdminClient } from '@/lib/supabase/admin';
import { getT } from '@/lib/i18n-server';
import { dateLocale } from '@/lib/i18n';

// Últimas ejecuciones de una o varias herramientas (en Selenium, Java y Python juntas).
// Se guardan como mucho 4 por herramienta (pruneOldRunsForTool en /api/runs).
export default async function RecentRuns({ toolIds, title }: { toolIds: string[]; title?: string }) {
  if (toolIds.length === 0) return null;
  const { t, locale } = await getT();
  const db = getAdminClient();
  // Una sola consulta: las ejecuciones de las suites de esas herramientas (inner join filtra por herramienta).
  const { data } = await db
    .from('runs')
    .select('id, status, created_at, queue_suite, suites!inner(slug, tool_id, tools(name)), run_summary(total, passed, failed, duration_ms)')
    .in('suites.tool_id', toolIds)
    .order('created_at', { ascending: false })
    .limit(8);
  const runs = (data ?? []) as any[];

  const when = (iso: string) =>
    new Date(iso).toLocaleString(dateLocale(locale), { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });

  return (
    <section className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 mt-8">
      <h2 className="text-lg font-semibold mb-1">{title ?? t('Últimas ejecuciones')}</h2>
      <p className="text-xs text-[var(--text-secondary)] mb-5">{t('Las más recientes de esta herramienta (se guardan las 4 últimas)')}</p>
      {runs.length === 0 ? (
        <p className="text-xs text-[var(--text-secondary)] py-6 text-center">{t('Aún no hay ejecuciones de esta herramienta.')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {runs.map((run) => {
            const summary = Array.isArray(run.run_summary) ? run.run_summary[0] : run.run_summary;
            return (
              <Link
                key={run.id}
                href={run.status === 'finished' ? `/runs/${run.id}/results` : `/runs/${run.id}`}
                className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--bg-surface-muted)] hover:opacity-80 transition"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {run.suites?.tools?.name ?? t('Herramienta')} · {run.queue_suite?.includes(',') ? t('Varias suites') : run.suites?.slug ?? 'run'}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    {when(run.created_at)}
                    {summary ? ` · ${summary.passed}/${summary.total} tests · ${(summary.duration_ms / 1000).toFixed(0)} s` : ''}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase shrink-0 ${
                    run.status === 'finished'
                      ? summary && summary.failed > 0
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : run.status === 'failed'
                      ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                      : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                  }`}
                >
                  {t(runStatusLabel(run.status))}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
