import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente con service key: se salta RLS. SOLO en servidor (route handlers).
// `server-only` hace fallar el build si algún componente de cliente lo importa.
let client: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !serviceKey) {
      throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_KEY");
    }
    client = createClient(url, serviceKey, { auth: { persistSession: false } });
  }
  return client;
}
