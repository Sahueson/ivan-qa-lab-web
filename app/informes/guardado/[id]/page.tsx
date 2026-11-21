import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminClient } from '@/lib/supabase/admin';
import type { InformeData } from '@/lib/informes';
import InformeView from '@/app/components/InformeView';
import PrintButton from '@/app/components/PrintButton';
import { getT } from '@/lib/i18n-server';

async function InformeGuardadoPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { t } = await getT();
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n)) notFound();
  const { data } = await getAdminClient().from('informes').select('data').eq('id', n).single();
  if (!data) notFound();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/informes" className="text-sm text-[var(--text-secondary)] hover:underline">← {t('Informes')}</Link>
        <PrintButton />
      </div>
      <InformeView data={data.data as InformeData} />
    </div>
  );
}

export default function InformeGuardadoPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="max-w-5xl mx-auto p-8 text-sm text-[var(--text-secondary)]">Cargando…</p>}>
      <InformeGuardadoPageContent params={params} />
    </Suspense>
  );
}
