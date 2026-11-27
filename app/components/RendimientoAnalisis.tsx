import type { Peticion } from '@/lib/informes';
import { getT } from '@/lib/i18n-server';
import AreaChart from './AreaChart';

const card = 'rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)]';
const muted = 'text-[var(--text-secondary)]';

/** Análisis de una prueba de carga: tabla por petición, gráficas de tiempo de respuesta y de peticiones por segundo, y comentario de cada métrica. */
export default async function RendimientoAnalisis({ peticiones, numero }: { peticiones: Peticion[]; numero: string }) {
  const { t } = await getT();
  if (peticiones.length === 0) return null;

  const tramo = peticiones[0].tramo_s || 2;
  const buckets = new Map<number, { n: number; sum: number }>();
  for (const p of peticiones) {
    for (const b of p.serie) {
      const cur = buckets.get(b.s) ?? { n: 0, sum: 0 };
      cur.n += b.n;
      cur.sum += b.avg_ms * b.n;
      buckets.set(b.s, cur);
    }
  }
  const orden = [...buckets.entries()].sort((a, b) => a[0] - b[0]);
  const tps = orden.map(([s, b]) => ({ label: `${s}s`, value: b.n / tramo }));
  const resp = orden.map(([s, b]) => ({ label: `${s}s`, value: b.sum / b.n }));

  const totalN = orden.reduce((a, [, b]) => a + b.n, 0);
  const mediaGlobal = totalN ? orden.reduce((a, [, b]) => a + b.sum, 0) / totalN : 0;
  const tpsMedia = tps.length ? tps.reduce((a, x) => a + x.value, 0) / tps.length : 0;
  const tpsMax = Math.max(...tps.map((x) => x.value), 0);
  const picos = resp.filter((x) => x.value > mediaGlobal * 2 && x.value - mediaGlobal > 150);
  const errores = peticiones.reduce((a, p) => a + p.errores, 0);
  const fuera = peticiones.filter((p) => p.status === 'failed');
  const fmtMs = (v: number) => `${Math.round(v)} ms`;
  const fmtTps = (v: number) => `${v >= 10 ? Math.round(v) : v.toFixed(1)}/s`;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{numero}. {t('Análisis de resultados')}</h2>

      <div className={`overflow-x-auto ${card}`}>
        <table className="w-full text-sm">
          <thead className={`text-left text-xs ${muted}`}>
            <tr>
              <th className="p-4">{t('Petición')}</th><th className="p-4">{t('Peticiones')}</th><th className="p-4">{t('Mín.')}</th><th className="p-4">{t('Media')}</th>
              <th className="p-4">p95</th><th className="p-4">{t('Máx.')}</th><th className="p-4">{t('Umbral p95')}</th><th className="p-4">{t('Errores')}</th><th className="p-4">{t('Estado')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {peticiones.map((p) => (
              <tr key={p.test}>
                <td className="p-4 font-medium">{p.test}</td>
                <td className="p-4">{p.peticiones}</td>
                <td className="p-4 font-mono">{p.min_ms}</td>
                <td className="p-4 font-mono">{p.media_ms}</td>
                <td className={`p-4 font-mono ${p.p95_ms > p.umbral_p95_ms ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>{p.p95_ms}</td>
                <td className="p-4 font-mono">{p.max_ms}</td>
                <td className={`p-4 font-mono ${muted}`}>{p.umbral_p95_ms}</td>
                <td className="p-4">{p.errores}</td>
                <td className={`p-4 font-medium ${p.status === 'passed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{p.status === 'passed' ? t('Pasa') : t('Falla')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={`text-xs ${muted}`}>{t('Tiempos en milisegundos.')}</p>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className={`${card} p-5 space-y-2`}>
          <h3 className="text-sm font-semibold">{t('Tiempo de respuesta medio')}</h3>
          <AreaChart points={resp} ariaLabel={t('Tiempo de respuesta medio a lo largo de la prueba')} format={fmtMs} />
          <p className="text-sm">
            {picos.length === 0
              ? t('El tiempo de respuesta se mantiene estable durante toda la prueba (media de {m} ms).', { m: Math.round(mediaGlobal) })
              : t('Media de {m} ms, con {n} pico(s) en los que el tiempo se más que duplica (hacia el segundo {s}). Conviene repetir la prueba para descartar que sea algo puntual.', { m: Math.round(mediaGlobal), n: picos.length, s: picos[0].label.replace('s', '') })}
          </p>
        </div>
        <div className={`${card} p-5 space-y-2`}>
          <h3 className="text-sm font-semibold">{t('Peticiones por segundo (TPS)')}</h3>
          <AreaChart points={tps} ariaLabel={t('Peticiones por segundo a lo largo de la prueba')} format={fmtTps} />
          <p className="text-sm">{t('Media de {a} peticiones por segundo, con un máximo de {b}.', { a: tpsMedia.toFixed(1), b: tpsMax.toFixed(1) })}</p>
        </div>
      </div>

      <div className={`${card} p-5 text-sm space-y-1`}>
        <p className="font-medium">{t('Problemas detectados')}</p>
        {fuera.length === 0 && errores === 0 ? (
          <p className={muted}>{t('Ninguna petición supera su umbral ni devuelve errores.')}</p>
        ) : (
          <ul className="list-disc pl-5">
            {fuera.map((p) => <li key={p.test}>{t('{n}: p95 de {a} ms frente a un umbral de {b} ms.', { n: p.test, a: p.p95_ms, b: p.umbral_p95_ms })}</li>)}
            {errores > 0 && <li>{t('{n} peticiones con error en total.', { n: errores })}</li>}
          </ul>
        )}
      </div>
    </section>
  );
}
