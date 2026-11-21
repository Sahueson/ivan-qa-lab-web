import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminClient } from '@/lib/supabase/admin';
import type { InformeData } from '@/lib/informes';
import InformeView from '@/app/components/InformeView';
import PrintButton from '@/app/components/PrintButton';

export const dynamic = 'force-dynamic';

export default async function InformeGuardadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n)) notFound();
  const { data } = await getAdminClient().from('informes').select('data').eq('id', n).single();
  if (!data) notFound();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/informes" className="text-sm text-[var(--text-secondary)] hover:underline">← Informes</Link>
        <PrintButton />
      </div>
      <InformeView data={data.data as InformeData} />
    </div>
  );
}
