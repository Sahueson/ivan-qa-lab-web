import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Exportamos el cliente para usarlo en los hooks y componentes de cliente (como Realtime)
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);