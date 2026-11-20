import { getAdminClient } from "@/lib/supabase/admin";

const json = (status: number, body: unknown) => Response.json(body, { status });

export async function GET() {
  try {
    const db = getAdminClient();
    
    // 1. Ping al proyecto Lab
    await db.from('tools').select('id').limit(1);

    // 2. Ping al proyecto Staging
    if (process.env.STG_URL && process.env.STG_SECRET_KEY) {
      await fetch(`${process.env.STG_URL}/rest/v1/keep_alive?select=id&limit=1`, {
        headers: {
          'apikey': process.env.STG_SECRET_KEY,
          'Authorization': `Bearer ${process.env.STG_SECRET_KEY}`
        }
      });
    }

    return json(200, { status: 'ok' });
  } catch (error) {
    console.error("Keep-alive error", error);
    return json(500, { error: 'Ping fallido' });
  }
}