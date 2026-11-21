import { Suspense } from 'react';
import Link from 'next/link';
import { getAdminClient } from '@/lib/supabase/admin';
import { ESTADOS, SEVERIDADES, estadoCls } from './labels';
import { getT } from '@/lib/i18n-server';
import { dateLocale } from '@/lib/i18n';

async function BugsPageContent() {
  const { t, locale } = await getT();
  const { data } = await getAdminClient()
    .from('bugs')
    .select('id, title, severity, status, tool_slug, suite_slug, created_at, bug_comments(count)')
    .order('created_at', { ascending: false });
  const bugs = data ?? [];
  const abiertos = bugs.filter((b) => b.status === 'abierto' || b.status === 'en_progreso').length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Bugs</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {t('Registro de incidencias encontradas por las pruebas: {a} abiertas de {n}. Lectura pública.', { a: abiertos, n: bugs.length })}
          </p>
        </div>
      </div>
      <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
        {bugs.length === 0 && <p className="p-6 text-sm text-[var(--text-secondary)]">{t('Todavía no hay bugs registrados.')}</p>}
        {bugs.map((b) => {
          const comentarios = (b.bug_comments as { count: number }[] | null)?.[0]?.count ?? 0;
          return (
            <Link key={b.id} href={`/bugs/${b.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-5 hover:bg-[var(--bg-surface-muted)] transition">
              <div className="min-w-0">
                <p className="font-medium truncate">#{b.id} · {b.title}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {[b.tool_slug, b.suite_slug].filter(Boolean).join(' · ') || t('Sin test asociado')} · {new Date(b.created_at).toLocaleDateString(dateLocale(locale), { timeZone: 'Europe/Madrid' })} · {t('{n} comentarios', { n: comentarios })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 rounded-full text-xs bg-[var(--bg-surface-muted)]">{t(SEVERIDADES[b.severity])}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${estadoCls(b.status)}`}>{t(ESTADOS[b.status])}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function BugsPage() {
  return (
    <Suspense fallback={<p className="max-w-5xl mx-auto p-8 text-sm text-[var(--text-secondary)]">Cargando…</p>}>
      <BugsPageContent />
    </Suspense>
  );
}
