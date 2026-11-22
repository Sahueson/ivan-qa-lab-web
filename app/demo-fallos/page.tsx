import { Suspense } from 'react';
import Link from 'next/link';
import { getAdminClient } from '@/lib/supabase/admin';
import { getT } from '@/lib/i18n-server';

const DEMO_SUITE = 'j-demo-fallos';

// Cada herramienta, agrupada por área, con el número de casos que fallan a propósito.
const AREAS: { id: 'front' | 'back' | 'perf'; title: string; blurb: string; tools: string[]; cases: number }[] = [
  {
    id: 'front',
    title: 'Front (navegador real)',
    blurb: 'Cada test inicia sesión con un rol y busca algo que la app no ofrece: por ejemplo, que el jugador MAD vea las partidas del otro equipo.',
    tools: ['playwright', 'selenium-java', 'selenium-python', 'cucumber', 'cypress', 'appium'],
    cases: 7,
  },
  {
    id: 'back',
    title: 'Back (API)',
    blurb: 'Cada caso pide a la API algo imposible: por ejemplo, que un usuario anónimo vea la lista de partidas.',
    tools: ['newman', 'bruno', 'karate'],
    cases: 3,
  },
  {
    id: 'perf',
    title: 'Rendimiento',
    blurb: 'Se exige un tiempo de respuesta irreal (10 a 30 milisegundos) para que el umbral de rendimiento se incumpla.',
    tools: ['jmeter'],
    cases: 3,
  },
];

type RunRow = {
  id: string;
  created_at: string;
  suites: { slug: string; tools: { slug: string; name: string; github_repo: string } };
  run_summary: { total: number; passed: number; failed: number }[] | { total: number; passed: number; failed: number } | null;
};

async function reportUrlOf(repo: string, runId: string): Promise<string | null> {
  const [owner, name] = repo.split('/');
  const url = `https://${owner.toLowerCase()}.github.io/${name}/${runId}/`;
  try {
    const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(2500) });
    return r.ok ? url : null;
  } catch {
    return null;
  }
}

async function DemoFallosContent() {
  const { t } = await getT();
  const db = getAdminClient();

  // Última run de la Demo de fallos de cada herramienta (estas runs no se borran).
  const { data } = await db
    .from('runs')
    .select('id, created_at, suites!inner(slug, tools(slug, name, github_repo)), run_summary(total, passed, failed)')
    .eq('status', 'finished')
    .eq('suites.slug', DEMO_SUITE)
    .order('created_at', { ascending: false });
  const latest = new Map<string, RunRow>();
  for (const r of (data ?? []) as unknown as RunRow[]) if (!latest.has(r.suites.tools.slug)) latest.set(r.suites.tools.slug, r);

  const reports = new Map<string, string | null>();
  await Promise.all([...latest.values()].map(async (r) => reports.set(r.id, await reportUrlOf(r.suites.tools.github_repo, r.id))));

  // Ejemplo detallado: el primer fallo de Playwright (o de la primera herramienta que tenga run).
  const exampleRun = latest.get('playwright') ?? [...latest.values()][0];
  const { data: failures } = exampleRun
    ? await db.from('test_results').select('name, error, evidence_url, duration_ms').eq('run_id', exampleRun.id).eq('status', 'failed').order('name', { ascending: true }).limit(2)
    : { data: null };

  const summaryOf = (r: RunRow) => (Array.isArray(r.run_summary) ? r.run_summary[0] : r.run_summary);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 space-y-8">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">{t('Demo de fallos')}</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-3xl leading-relaxed">
          {t('Una prueba que pasa no enseña mucho. Esta suite falla a propósito en las 10 herramientas para mostrar cómo se ve un fallo de principio a fin: qué se esperaba, qué se obtuvo, la evidencia, el informe y cómo se registra el bug. No cuenta para los resultados reales (suites A–I).')}
        </p>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['1', 'La prueba falla', 'El test pide algo que la app no ofrece. Falla siempre, a propósito.'],
          ['2', 'El informe lo explica', 'Dice qué esperaba y qué obtuvo, con captura o con la petición y la respuesta.'],
          ['3', 'Se registra el bug', 'Cada fallo se anota con sus pasos, su gravedad y el enlace a la run.'],
          ['4', 'Se decide qué es', 'Un defecto real de la app, o un requisito que no existe (y se cierra).'],
        ].map(([n, title, text]) => (
          <div key={n} className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5">
            <span className="inline-flex w-7 h-7 rounded-full bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] text-xs font-semibold items-center justify-center">{n}</span>
            <p className="font-semibold mt-3">{t(title)}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{t(text)}</p>
          </div>
        ))}
      </section>

      {AREAS.map((area) => (
        <section key={area.id} className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold">{t(area.title)} · {t('{n} casos por herramienta', { n: area.cases })}</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{t(area.blurb)}</p>
          </div>
          <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
            {area.tools.map((slug) => {
              const run = latest.get(slug);
              const sm = run ? summaryOf(run) : null;
              const report = run ? reports.get(run.id) : null;
              return (
                <div key={slug} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">{run?.suites.tools.name ?? slug}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {sm ? t('{p} de {n} casos', { p: sm.passed, n: sm.total }) + ' · ' + t('{n} fallan', { n: sm.failed }) : t('Todavía no se ha lanzado')}
                    </p>
                  </div>
                  {run && (
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/runs/${run.id}/results`} className="px-3.5 py-1.5 rounded-full bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] text-xs font-medium hover:opacity-90 transition">
                        {t('Ver la run completa')}
                      </Link>
                      {report && (
                        <a href={report} target="_blank" rel="noreferrer" className="px-3.5 py-1.5 rounded-full border border-[var(--border-subtle)] text-xs font-medium hover:opacity-80 transition">
                          {t('Ver informe HTML')} ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {failures && failures.length > 0 && exampleRun && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t('Así se ve un fallo')} · {exampleRun.suites.tools.name}</h2>
          <p className="text-xs text-[var(--text-secondary)]">{t('Estos son los mensajes reales de la última ejecución, tal como los recibe quien revisa el resultado.')}</p>
          <div className="space-y-3">
            {failures.map((f) => (
              <div key={f.name} className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5 space-y-3">
                <p className="font-medium">{f.name}</p>
                <pre className="rounded-2xl bg-[#111211] text-red-300 p-4 text-xs overflow-x-auto whitespace-pre-wrap break-words">{String(f.error ?? '').slice(0, 600) || '—'}</pre>
                {f.evidence_url && (
                  <a href={f.evidence_url} target="_blank" rel="noreferrer" className="inline-block px-3.5 py-1.5 rounded-full border border-[var(--border-subtle)] text-xs font-medium hover:opacity-80 transition">
                    {f.evidence_url.endsWith('.json') ? t('Ver petición y respuesta') : t('Ver captura')} ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 space-y-2">
        <h2 className="text-lg font-semibold">{t('Del fallo al bug')}</h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {t('Un fallo no siempre es un defecto. Aquí hay dos ejemplos del registro de bugs: uno real, que sigue abierto, y otro de esta demo, cerrado como «no es un bug» porque el test pedía algo que la app no promete.')}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/bugs/1" className="px-3.5 py-1.5 rounded-full border border-[var(--border-subtle)] text-xs font-medium hover:opacity-80 transition">{t('Bug real (abierto)')}</Link>
          <Link href="/bugs/2" className="px-3.5 py-1.5 rounded-full border border-[var(--border-subtle)] text-xs font-medium hover:opacity-80 transition">{t('Ejemplo de esta demo (cerrado)')}</Link>
        </div>
      </section>
    </div>
  );
}

export default function DemoFallosPage() {
  return (
    <main className="pb-12">
      <Suspense fallback={<div className="max-w-5xl mx-auto p-8 text-sm text-[var(--text-secondary)]">…</div>}>
        <DemoFallosContent />
      </Suspense>
    </main>
  );
}
