import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminClient } from '@/lib/supabase/admin';
import { buildInforme, GRUPOS, type Grupo } from '@/lib/informes';
import InformeView from '@/app/components/InformeView';
import PrintButton from '@/app/components/PrintButton';

async function InformeGrupoPageContent({ params }: { params: Promise<{ grupo: string }> }) {
  const { grupo } = await params;
  if (!(grupo in GRUPOS)) notFound();
  const data = await buildInforme(getAdminClient(), grupo as Grupo);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/informes" className="text-sm text-[var(--text-secondary)] hover:underline">← Informes</Link>
        <PrintButton />
      </div>
      <InformeView data={data} />
    </div>
  );
}

export default function InformeGrupoPage({ params }: { params: Promise<{ grupo: string }> }) {
  return (
    <Suspense fallback={<p className="max-w-5xl mx-auto p-8 text-sm text-[var(--text-secondary)]">Cargando…</p>}>
      <InformeGrupoPageContent params={params} />
    </Suspense>
  );
}
