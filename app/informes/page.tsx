import { Suspense } from 'react';
import Link from 'next/link';
import { getAdminClient } from '@/lib/supabase/admin';
import { GRUPOS, type Grupo } from '@/lib/informes';

async function InformesPageContent() {
  const { data: guardados } = await getAdminClient()
    .from('informes')
    .select('id, grupo, created_at')
    .order('created_at', { ascending: false })
    .limit(30);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 space-y-8">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">Informes</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Informe ejecutivo por área, con los últimos resultados de cada herramienta. Se puede imprimir o guardar como PDF.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {(Object.keys(GRUPOS) as Grupo[]).map((g) => (
          <Link key={g} href={`/informes/${g}`} className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 hover:opacity-80 transition space-y-2">
            <p className="text-lg font-semibold">{GRUPOS[g].titulo}</p>
            <p className="text-xs text-[var(--text-secondary)]">{GRUPOS[g].herramientas.join(' · ')}</p>
            <p className="text-sm text-[var(--text-secondary)]">{GRUPOS[g].descripcion}</p>
          </Link>
        ))}
      </div>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Informes guardados</h2>
        <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
          {(guardados ?? []).length === 0 && <p className="p-5 text-sm text-[var(--text-secondary)]">Aún no hay informes guardados.</p>}
          {(guardados ?? []).map((i) => (
            <Link key={i.id} href={`/informes/guardado/${i.id}`} className="flex justify-between p-4 text-sm hover:bg-[var(--bg-surface-muted)] transition">
              <span>{GRUPOS[i.grupo as Grupo]?.titulo ?? i.grupo}</span>
              <span className="text-[var(--text-secondary)]">{new Date(i.created_at).toLocaleString('es-ES')}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function InformesPage() {
  return (
    <Suspense fallback={<p className="max-w-5xl mx-auto p-8 text-sm text-[var(--text-secondary)]">Cargando…</p>}>
      <InformesPageContent />
    </Suspense>
  );
}
