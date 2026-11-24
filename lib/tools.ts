import 'server-only';
import { cacheLife } from 'next/cache';
import { getAdminClient } from '@/lib/supabase/admin';

/** Herramientas registradas. Casi nunca cambian: se guardan 1 min y el menú y la página de la herramienta no repiten la consulta en cada visita. */
export async function getTools(): Promise<any[]> {
  'use cache';
  cacheLife({ stale: 60, revalidate: 60, expire: 3600 });
  const { data } = await getAdminClient().from('tools').select('*').order('name', { ascending: true });
  return data ?? [];
}
