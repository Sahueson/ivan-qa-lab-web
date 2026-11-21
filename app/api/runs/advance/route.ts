import { getAdminClient } from "@/lib/supabase/admin";
import { advanceQueue } from "@/lib/queue";
import { pruneAllTools } from "@/lib/prune";

// Lanza el siguiente run de la cola si el entorno está libre. Pública e idempotente: no acepta datos ni lanza nada
// que no estuviera ya en la cola. La llaman los runners al terminar y la página de un run en espera.
export async function POST() {
  try {
    const db = getAdminClient();
    const result = await advanceQueue(db);
    await pruneAllTools(db); // tope de 4 runs por herramienta, también para runs que no pasaron por /api/runs
    return Response.json(result);
  } catch (e) {
    console.error("POST /api/runs/advance", e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
