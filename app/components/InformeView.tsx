import type { InformeData } from '@/lib/informes';
import { GRUPOS } from '@/lib/informes';
import { getT } from '@/lib/i18n-server';
import { dateLocale } from '@/lib/i18n';

const pct = (p: number, t: number) => (t > 0 ? Math.round((p / t) * 100) : 0);

/** Informe ejecutivo de un grupo de herramientas: resumen, tabla por herramienta, incidencias y conclusión. */
export default async function InformeView({ data }: { data: InformeData }) {
  const { t, locale } = await getT();
  const info = GRUPOS[data.grupo];
  const total = data.tools.reduce((a, x) => a + x.total, 0);
  const passed = data.tools.reduce((a, x) => a + x.passed, 0);
  const failed = data.tools.reduce((a, x) => a + x.failed, 0);
  const skipped = data.tools.reduce((a, x) => a + x.skipped, 0);
  const cubiertas = data.tools.reduce((a, x) => a + x.suitesCubiertas, 0);
  const totales = data.tools.reduce((a, x) => a + x.suitesTotales, 0);
  const fallos = data.tools.flatMap((x) => x.fallos.map((f) => ({ ...f, tool: x.name })));
  const completo = totales > 0 && cubiertas === totales;
  const apto = total > 0 && failed === 0;

  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-[var(--text-secondary)]">{t('Informe ejecutivo')} · Ivan QA Lab</p>
        <h1 className="text-4xl font-semibold tracking-tight">{t(info.titulo)}</h1>
        <p className="text-sm text-[var(--text-secondary)]">{t(info.descripcion)}</p>
        <p className="text-xs text-[var(--text-secondary)]">{t('Generado el')} {new Date(data.generado).toLocaleString(dateLocale(locale), { timeZone: 'Europe/Madrid' })} · {t('Entorno: staging de Tactical Calendar')}</p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[24px] bg-[var(--bg-hero)] text-[var(--text-hero)] p-6">
          <p className="text-xs opacity-70">{t('Tasa de éxito')}</p>
          <p className="text-3xl font-semibold mt-2">{pct(passed, total)}%</p>
          <p className="text-xs opacity-60 mt-1">{t('{p} de {n} casos', { p: passed, n: total })}</p>
        </div>
        <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6">
          <p className="text-xs text-[var(--text-secondary)]">{t('Fallados')}</p>
          <p className="text-3xl font-semibold mt-2 text-red-600 dark:text-red-400">{failed}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">{t('{n} omitidos', { n: skipped })}</p>
        </div>
        <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6">
          <p className="text-xs text-[var(--text-secondary)]">{t('Cobertura')}</p>
          <p className="text-3xl font-semibold mt-2">{cubiertas}/{totales}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">{t('suites con resultado')}</p>
        </div>
        <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6">
          <p className="text-xs text-[var(--text-secondary)]">{t('Veredicto')}</p>
          <p className={`text-2xl font-semibold mt-2 ${apto && completo ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {total === 0 ? t('Sin datos') : !apto ? t('Con incidencias') : completo ? t('Apto') : t('Apto, cobertura parcial')}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('Resultado por herramienta')}</h2>
        <div className="overflow-x-auto rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[var(--text-secondary)]">
              <tr>
                <th className="p-4">{t('Herramienta')}</th><th className="p-4">Suites</th><th className="p-4">{t('Pasan')}</th>
                <th className="p-4">{t('Fallan')}</th><th className="p-4">{t('Omitidos')}</th><th className="p-4">{t('Éxito')}</th><th className="p-4">{t('Duración')}</th><th className="p-4">{t('Actualizado')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {data.tools.map((t) => (
                <tr key={t.slug}>
                  <td className="p-4 font-medium">{t.name}</td>
                  <td className="p-4">{t.suitesCubiertas}/{t.suitesTotales}</td>
                  <td className="p-4">{t.passed}/{t.total}</td>
                  <td className="p-4">{t.failed}</td>
                  <td className="p-4">{t.skipped}</td>
                  <td className="p-4">{pct(t.passed, t.total)}%</td>
                  <td className="p-4">{(t.duration_ms / 1000).toFixed(1)} s</td>
                  <td className="p-4 text-xs text-[var(--text-secondary)]">{t.actualizado ? new Date(t.actualizado).toLocaleDateString(dateLocale(locale), { day: '2-digit', month: 'short', timeZone: 'Europe/Madrid' }) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {data.grupo === 'rendimiento' && data.lentos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t('Casos más lentos (p95)')}</h2>
          <ul className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] text-sm">
            {data.lentos.map((l) => (
              <li key={l.test} className="flex justify-between gap-4 p-4"><span>{l.test}</span><span className="font-mono">{l.ms} ms</span></li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('Incidencias')}</h2>
        {fallos.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">{t('No hay casos fallados en los últimos resultados.')}</p>
        ) : (
          <ul className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] text-sm">
            {fallos.map((f, i) => (
              <li key={i} className="p-4">
                <p className="font-medium">{f.test}</p>
                <p className="text-xs text-[var(--text-secondary)]">{f.tool} · {f.suite}</p>
                {f.error && <p className="text-xs mt-1 font-mono break-words">{f.error}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">{t('Conclusión y recomendación')}</h2>
        <p className="text-sm">
          {total === 0
            ? t('Todavía no hay resultados guardados de este grupo: lanza las suites desde la web y vuelve a generar el informe.')
            : apto
              ? `${t('Los {n} casos ejecutados pasan.', { n: total })} ${completo ? t('Se han cubierto todas las suites, por lo que el grupo puede darse por aprobado.') : t('Solo hay resultado en {a} de {b} suites: se recomienda completar la batería antes de dar el grupo por aprobado.', { a: cubiertas, b: totales })}`
              : t('Hay {n} casos fallados: se recomienda abrir un bug por cada incidencia, corregir y repetir la batería antes de la entrega.', { n: failed })}
        </p>
        {!completo && total > 0 && (
          <p className="text-xs text-[var(--text-secondary)]">
            {t('Nota: la web conserva las 4 últimas runs de cada herramienta, así que una batería completa (9 suites) se refleja entera solo si se guarda el informe justo al terminarla.')}
          </p>
        )}
      </section>
    </article>
  );
}
