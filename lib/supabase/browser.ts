import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente público (anon key): solo lectura por RLS + Realtime. Seguro en el navegador.
let client: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
    client = createClient(url, anonKey, { auth: { persistSession: false } });
  }
  return client;
}
