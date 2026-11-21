import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildInforme, GRUPOS, type Grupo } from '@/lib/informes';
import InformeView from '@/app/components/InformeView';
import PrintButton from '@/app/components/PrintButton';
import AdminForm from '@/app/components/AdminForm';
import { guardarInforme } from '@/app/bugs/actions';

export const dynamic = 'force-dynamic';

export default async function InformeGrupoPage({ params }: { params: Promise<{ grupo: string }> }) {
  const { grupo } = await params;
  if (!(grupo in GRUPOS)) notFound();
  const data = await buildInforme(grupo as Grupo);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/informes" className="text-sm text-[var(--text-secondary)] hover:underline">← Informes</Link>
        <PrintButton />
      </div>
      <InformeView data={data} />
      <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 space-y-2 print:hidden">
        <p className="text-sm font-medium">Guardar esta versión</p>
        <p className="text-xs text-[var(--text-secondary)]">Congela el informe tal como está ahora (las runs antiguas se borran con el tiempo). Requiere la clave de administración.</p>
        <AdminForm action={guardarInforme} submit="Guardar informe">
          <input type="hidden" name="grupo" value={grupo} />
        </AdminForm>
      </div>
    </div>
  );
}
