import Link from 'next/link';
import type { InformeData } from '@/lib/informes';
import { GRUPOS } from '@/lib/informes';
import { getT } from '@/lib/i18n-server';
import RendimientoAnalisis from './RendimientoAnalisis';
import { dateLocale } from '@/lib/i18n';

const pct = (p: number, t: number) => (t > 0 ? Math.round((p / t) * 100) : 0);
const card = 'rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)]';
const muted = 'text-[var(--text-secondary)]';

const TIPO: Record<string, string> = {
  back: 'Pruebas de API (contrato y seguridad por filas)',
  front: 'Pruebas de regresión funcional E2E',
  rendimiento: 'Pruebas de rendimiento (carga)',
};
const OBJETIVO: Record<string, string> = {
  back: 'Validar que las reglas de acceso y los contratos de la API del staging siguen cumpliéndose: lectura anónima bloqueada, visibilidad por rol y escrituras no autorizadas rechazadas.',
  front: 'Validar que los flujos de usuario de Tactical Calendar (acceso, partidas, inscripciones, asistencia, gobernanza, excedencias, jugadores, calendario y normas) funcionan igual con cada herramienta de automatización.',
  rendimiento: 'Medir el tiempo de respuesta de las consultas principales bajo carga y comprobar que se mantienen dentro de los umbrales definidos.',
};
const RECOMENDACIONES: Record<string, string[]> = {
  back: ['Repetir la batería tras cada cambio de políticas RLS o de esquema.', 'Mantener un caso de regresión por cada hueco de seguridad corregido.'],
  front: ['Ejecutar la batería completa antes de cada despliegue.', 'Mantener el mismo conjunto de casos en todas las herramientas para poder comparar su comportamiento.'],
  rendimiento: ['Repetir la prueba si aparecen picos aislados, para descartar causas externas al sistema.', 'Seguir los tiempos p95 entre versiones y avisar cuando empeoren.'],
};

/** Informe ejecutivo de un grupo de herramientas, con la estructura de un informe de pruebas de QA. */
export default async function InformeView({ data }: { data: InformeData }) {
  const { t, locale } = await getT();
  const dl = dateLocale(locale);
  const info = GRUPOS[data.grupo];
  const total = data.tools.reduce((a, x) => a + x.total, 0);
  const passed = data.tools.reduce((a, x) => a + x.passed, 0);
  const failed = data.tools.reduce((a, x) => a + x.failed, 0);
  const skipped = data.tools.reduce((a, x) => a + x.skipped, 0);
  const cubiertas = data.tools.reduce((a, x) => a + x.suitesCubiertas, 0);
  const totales = data.tools.reduce((a, x) => a + x.suitesTotales, 0);
  const duracion = data.tools.reduce((a, x) => a + x.duration_ms, 0);
  const fallos = data.tools.flatMap((x) => x.fallos.map((f) => ({ ...f, tool: x.name })));
  const completo = totales > 0 && cubiertas === totales;
  const apto = total > 0 && failed === 0;
  const fecha = (iso: string) => new Date(iso).toLocaleString(dl, { timeZone: 'Europe/Madrid', dateStyle: 'medium', timeStyle: 'short' });
  const veredicto = total === 0 ? t('Sin datos') : !apto ? t('Con incidencias') : completo ? t('Apto') : t('Apto, cobertura parcial');

  // Matriz suite × herramienta (solo si los datos traen el desglose por suite)
  const conSuites = data.tools.some((x) => x.suites && x.suites.length > 0);
  const letras = new Map<string, string>();
  for (const x of data.tools) for (const s of x.suites ?? []) if (!letras.has(s.letter)) letras.set(s.letter, s.name);
  const filas = [...letras.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const nombreSuite = (letter: string, name: string) => (/^[A-Z] ·/.test(name) ? name : `${letter} · ${name}`);

  const ant = data.anterior;
  const bugs = data.bugs ?? [];
  const sevColor = (s: string) => (s === 'critica' || s === 'alta' ? 'text-red-600 dark:text-red-400' : s === 'media' ? 'text-amber-600 dark:text-amber-400' : muted);

  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <p className={`text-xs uppercase tracking-wider ${muted}`}>{t('Informe ejecutivo')} · Ivan QA Lab</p>
        <h1 className="text-4xl font-semibold tracking-tight">{t(info.titulo)}</h1>
        <p className={`text-sm ${muted}`}>{t(info.descripcion)}</p>
      </header>

      {/* 1. Ficha del informe */}
      <section className={`${card} p-6`}>
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          {[
            [t('Proyecto'), 'Tactical Calendar'],
            [t('Tipo de prueba'), t(TIPO[data.grupo])],
            [t('Versión del informe'), `v${data.version ?? 1}`],
            [t('Fecha de ejecución'), fecha(data.generado)],
            [t('Entorno'), t('Staging de Tactical Calendar (datos de prueba)')],
            [t('Herramientas'), data.tools.map((x) => x.name).join(' · ')],
            [t('Ejecutado por'), t('Ivan QA Lab (GitHub Actions)')],
            [t('Duración acumulada'), `${(duracion / 1000).toFixed(0)} s`],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col"><dt className={`text-xs ${muted}`}>{k}</dt><dd className="font-medium">{v}</dd></div>
          ))}
        </dl>
      </section>

      {/* 2. Objetivo y alcance */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">{t('1. Objetivo y alcance')}</h2>
        <p className="text-sm">{t(OBJETIVO[data.grupo])}</p>
        <p className={`text-xs ${muted}`}>{t('Alcance: {a} de {b} suites con resultado.', { a: cubiertas, b: totales })}</p>
      </section>

      {/* 3. Resumen ejecutivo */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('2. Resumen ejecutivo')}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-[24px] bg-[var(--bg-hero)] text-[var(--text-hero)] p-6">
            <p className="text-xs opacity-70">{t('Tasa de éxito')}</p>
            <p className="text-3xl font-semibold mt-2">{pct(passed, total)}%</p>
            <p className="text-xs opacity-60 mt-1">{t('{p} de {n} casos', { p: passed, n: total })}</p>
          </div>
          <div className={`${card} p-6`}>
            <p className={`text-xs ${muted}`}>{t('Fallados')}</p>
            <p className="text-3xl font-semibold mt-2 text-red-600 dark:text-red-400">{failed}</p>
            <p className={`text-xs ${muted} mt-1`}>{t('{n} omitidos', { n: skipped })}</p>
          </div>
          <div className={`${card} p-6`}>
            <p className={`text-xs ${muted}`}>{t('Cobertura')}</p>
            <p className="text-3xl font-semibold mt-2">{cubiertas}/{totales}</p>
            <p className={`text-xs ${muted} mt-1`}>{t('suites con resultado')}</p>
          </div>
          <div className={`${card} p-6`}>
            <p className={`text-xs ${muted}`}>{t('Veredicto')}</p>
            <p className={`text-2xl font-semibold mt-2 ${apto && completo ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{veredicto}</p>
          </div>
        </div>

        {ant ? (
          <div className={`${card} p-5 text-sm space-y-1`}>
            <p className="font-medium">{t('Comparación con la versión anterior (v{n}, {d})', { n: ant.version, d: new Date(ant.generado).toLocaleDateString(dl, { timeZone: 'Europe/Madrid' }) })}</p>
            <p className={muted}>
              {t('Éxito: {a}% → {b}%', { a: pct(ant.passed, ant.total), b: pct(passed, total) })} · {t('Fallados: {a} → {b}', { a: ant.failed, b: failed })} · {t('Casos: {a} → {b}', { a: ant.total, b: total })}
            </p>
          </div>
        ) : (
          <p className={`text-xs ${muted}`}>{t('Es la primera versión guardada de este informe: aún no hay con qué compararla.')}</p>
        )}
      </section>

      {/* 4. Metodología (rendimiento) */}
      {data.grupo === 'rendimiento' && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">{t('3. Metodología y escenario')}</h2>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li>{t('Escenario: 5 usuarios virtuales, 10 iteraciones cada uno, con las consultas principales de cada rol.')}</li>
            <li>{t('Métrica de decisión: percentil 95 del tiempo de respuesta de cada consulta frente a su umbral.')}</li>
            <li>{t('Metodología de referencia: prueba de umbral (subir usuarios hasta degradar), prueba de carga al 15-30 % por debajo y prueba de estabilidad para detectar fugas. Aquí se ejecuta la prueba de carga.')}</li>
            <li>{t('El entorno debe estar libre de otra actividad durante la prueba: por eso solo se ejecuta una a la vez.')}</li>
          </ul>
        </section>
      )}

      {/* 5. Resultados */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{data.grupo === 'rendimiento' ? '4' : '3'}. {t('Resultados')}</h2>
        <div className={`overflow-x-auto ${card}`}>
          <table className="w-full text-sm">
            <thead className={`text-left text-xs ${muted}`}>
              <tr>
                <th className="p-4">{t('Herramienta')}</th><th className="p-4">Suites</th><th className="p-4">{t('Pasan')}</th>
                <th className="p-4">{t('Fallan')}</th><th className="p-4">{t('Omitidos')}</th><th className="p-4">{t('Éxito')}</th><th className="p-4">{t('Duración')}</th><th className="p-4">{t('Actualizado')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {data.tools.map((x) => (
                <tr key={x.slug}>
                  <td className="p-4 font-medium">{x.name}</td>
                  <td className="p-4">{x.suitesCubiertas}/{x.suitesTotales}</td>
                  <td className="p-4">{x.passed}/{x.total}</td>
                  <td className="p-4">{x.failed}</td>
                  <td className="p-4">{x.skipped}</td>
                  <td className="p-4">{pct(x.passed, x.total)}%</td>
                  <td className="p-4">{(x.duration_ms / 1000).toFixed(1)} s</td>
                  <td className={`p-4 text-xs ${muted}`}>{x.actualizado ? new Date(x.actualizado).toLocaleDateString(dl, { day: '2-digit', month: 'short', timeZone: 'Europe/Madrid' }) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {conSuites && (
          <>
            <h3 className="text-sm font-semibold pt-2">{t('Resultado por suite (casos pasados / total)')}</h3>
            <div className={`overflow-x-auto ${card}`}>
              <table className="w-full text-sm">
                <thead className={`text-left text-xs ${muted}`}>
                  <tr><th className="p-4">{t('Suite')}</th>{data.tools.map((x) => <th key={x.slug} className="p-4">{x.name}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filas.map(([letter, name]) => (
                    <tr key={letter}>
                      <td className="p-4 font-medium whitespace-nowrap">{nombreSuite(letter, name)}</td>
                      {data.tools.map((x) => {
                        const s = x.suites?.find((y) => y.letter === letter);
                        if (!s) return <td key={x.slug} className={`p-4 ${muted}`}>—</td>;
                        return (
                          <td key={x.slug} className="p-4 whitespace-nowrap">
                            <span className={s.failed > 0 ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>{s.passed}/{s.total}</span>
                            <span className={`text-xs ${muted}`}> · {(s.duration_ms / 1000).toFixed(0)} s</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {data.grupo === 'rendimiento' && data.lentos.length > 0 && !(data.peticiones && data.peticiones.length > 0) && (
          <>
            <h3 className="text-sm font-semibold pt-2">{t('Casos más lentos (p95)')}</h3>
            <ul className={`${card} divide-y divide-[var(--border-subtle)] text-sm`}>
              {data.lentos.map((l) => (
                <li key={l.test} className="flex justify-between gap-4 p-4"><span>{l.test}</span><span className="font-mono">{l.ms} ms</span></li>
              ))}
            </ul>
          </>
        )}
      </section>

      {data.grupo === 'rendimiento' && data.peticiones && data.peticiones.length > 0 && <RendimientoAnalisis peticiones={data.peticiones} numero="5" />}

      {/* 6. Incidencias */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{data.grupo === 'rendimiento' ? '6' : '4'}. {t('Incidencias')}</h2>
        {fallos.length === 0 ? (
          <p className={`text-sm ${muted}`}>{t('No hay casos fallados en los últimos resultados.')}</p>
        ) : (
          <ul className={`${card} divide-y divide-[var(--border-subtle)] text-sm`}>
            {fallos.map((f, i) => (
              <li key={i} className="p-4">
                <p className="font-medium">{f.test}</p>
                <p className={`text-xs ${muted}`}>{f.tool} · {f.suite}</p>
                {f.error && <p className="text-xs mt-1 font-mono break-words">{f.error}</p>}
              </li>
            ))}
          </ul>
        )}

        {bugs.length > 0 && (
          <>
            <h3 className="text-sm font-semibold pt-2">{t('Bugs abiertos en el seguimiento')}</h3>
            <div className={`overflow-x-auto ${card}`}>
              <table className="w-full text-sm">
                <thead className={`text-left text-xs ${muted}`}>
                  <tr><th className="p-4">ID</th><th className="p-4">{t('Descripción')}</th><th className="p-4">{t('Severidad')}</th><th className="p-4">{t('Estado')}</th></tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {bugs.map((b) => (
                    <tr key={b.id}>
                      <td className="p-4 font-mono"><Link href={`/bugs/${b.id}`} className="hover:underline">BUG-{b.id}</Link></td>
                      <td className="p-4">{b.title}{b.test_name && <span className={`block text-xs ${muted}`}>{b.test_name}</span>}</td>
                      <td className={`p-4 font-medium ${sevColor(b.severity)}`}>{b.severity}</td>
                      <td className="p-4">{b.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* 7. Conclusión */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{data.grupo === 'rendimiento' ? '7' : '5'}. {t('Conclusión y recomendaciones')}</h2>
        <ul className="text-sm space-y-1">
          <li>{t('Total de casos')}: <b>{total}</b></li>
          <li>{t('Pasados')}: <b>{passed}</b> · {t('Fallados')}: <b>{failed}</b> · {t('Omitidos')}: <b>{skipped}</b></li>
        </ul>
        <p className="text-sm">
          {total === 0
            ? t('Todavía no hay resultados guardados de este grupo: lanza las suites desde la web y vuelve a generar el informe.')
            : apto
              ? `${t('Los {n} casos ejecutados pasan.', { n: total })} ${completo ? t('Se han cubierto todas las suites, por lo que el grupo puede darse por aprobado.') : t('Solo hay resultado en {a} de {b} suites: se recomienda completar la batería antes de dar el grupo por aprobado.', { a: cubiertas, b: totales })}`
              : t('Hay {n} casos fallados: se recomienda abrir un bug por cada incidencia, corregir y repetir la batería antes de la entrega.', { n: failed })}
        </p>
        <p className="text-sm font-medium">{t('Visto bueno de QA')}: <span className={apto && completo ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>{apto && completo ? t('Sí') : t('No, pendiente de resolver lo anterior')}</span></p>
        <ul className="text-sm list-disc pl-5 space-y-1">
          {RECOMENDACIONES[data.grupo].map((r) => <li key={r}>{t(r)}</li>)}
        </ul>
        {!completo && total > 0 && (
          <p className={`text-xs ${muted}`}>
            {t('Nota: la web conserva las 4 últimas runs de cada herramienta, así que una batería completa (9 suites) se refleja entera solo si se guarda el informe justo al terminarla.')}
          </p>
        )}
      </section>

      {/* 8. Control de cambios */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">{t('Control de cambios')}</h2>
        <div className={`overflow-x-auto ${card}`}>
          <table className="w-full text-sm">
            <thead className={`text-left text-xs ${muted}`}>
              <tr><th className="p-4">{t('Versión')}</th><th className="p-4">{t('Fecha')}</th><th className="p-4">{t('Editor')}</th><th className="p-4">{t('Observaciones')}</th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              <tr>
                <td className="p-4">v{data.version ?? 1}</td>
                <td className="p-4">{fecha(data.generado)}</td>
                <td className="p-4">Ivan QA Lab</td>
                <td className={`p-4 ${muted}`}>{ant ? t('Comparado con v{n}', { n: ant.version }) : t('Primera versión')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}
