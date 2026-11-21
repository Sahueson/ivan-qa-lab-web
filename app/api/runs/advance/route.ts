import { getAdminClient } from "@/lib/supabase/admin";
import { advanceQueue } from "@/lib/queue";

// Lanza el siguiente run de la cola si el entorno está libre. Pública e idempotente: no acepta datos ni lanza nada
// que no estuviera ya en la cola. La llaman los runners al terminar y la página de un run en espera.
export async function POST() {
  try {
    const result = await advanceQueue(getAdminClient());
    return Response.json(result);
  } catch (e) {
    console.error("POST /api/runs/advance", e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
