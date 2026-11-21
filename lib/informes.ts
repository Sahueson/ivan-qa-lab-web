import type { SupabaseClient } from "@supabase/supabase-js";

export type Grupo = "back" | "front" | "rendimiento";

export const GRUPOS: Record<Grupo, { titulo: string; herramientas: string[]; descripcion: string }> = {
  back: {
    titulo: "Informe de back (API)",
    herramientas: ["newman", "bruno", "karate"],
    descripcion: "Contratos y reglas de seguridad por filas de la API de Supabase del staging, comprobados con Newman, Bruno y Karate.",
  },
  front: {
    titulo: "Informe de front (web E2E)",
    herramientas: ["playwright", "selenium-java", "selenium-python", "cucumber", "cypress"],
    descripcion: "Flujos de usuario en navegador real contra la demo de Tactical Calendar, con cinco herramientas sobre los mismos casos.",
  },
  rendimiento: {
    titulo: "Informe de rendimiento",
    herramientas: ["jmeter"],
    descripcion: "Tiempos de respuesta (percentil 95) de las consultas principales, por rol, con 5 usuarios virtuales y 10 iteraciones.",
  },
};

export type InformeTool = {
  slug: string;
  name: string;
  suitesCubiertas: number;
  suitesTotales: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration_ms: number;
  fallos: { suite: string; test: string; error: string }[];
};

export type InformeData = {
  grupo: Grupo;
  generado: string;
  tools: InformeTool[];
  lentos: { test: string; ms: number }[];
};

type RunRow = { id: string; suite_id: string; created_at: string };

// Último run terminado de cada suite de cada herramienta del grupo (solo existen las runs guardadas: 4 por herramienta).
export async function buildInforme(db: SupabaseClient, grupo: Grupo): Promise<InformeData> {
  const { data: tools } = await db.from("tools").select("id, slug, name").in("slug", GRUPOS[grupo].herramientas);
  const out: InformeTool[] = [];
  const lentos: { test: string; ms: number }[] = [];
  for (const tool of tools ?? []) {
    const { data: suites } = await db.from("suites").select("id, slug").eq("tool_id", tool.id);
    const suiteSlug = new Map((suites ?? []).filter((s) => s.slug !== "j-demo-fallos").map((s) => [s.id as string, s.slug as string]));
    const { data: runs } = await db
      .from("runs")
      .select("id, suite_id, created_at")
      .in("suite_id", [...suiteSlug.keys()])
      .eq("status", "finished")
      .order("created_at", { ascending: false });
    const latest = new Map<string, RunRow>();
    for (const r of (runs ?? []) as RunRow[]) if (!latest.has(r.suite_id)) latest.set(r.suite_id, r);
    const ids = [...latest.values()].map((r) => r.id);
    const entry: InformeTool = {
      slug: tool.slug, name: tool.name, suitesCubiertas: latest.size, suitesTotales: suiteSlug.size,
      total: 0, passed: 0, failed: 0, skipped: 0, duration_ms: 0, fallos: [],
    };
    if (ids.length) {
      const [{ data: sums }, { data: bad }, { data: all }] = await Promise.all([
        db.from("run_summary").select("total, passed, failed, skipped, duration_ms").in("run_id", ids),
        db.from("test_results").select("name, error, run_id").in("run_id", ids).eq("status", "failed"),
        grupo === "rendimiento" ? db.from("test_results").select("name, duration_ms").in("run_id", ids) : Promise.resolve({ data: [] }),
      ]);
      for (const s of sums ?? []) {
        entry.total += s.total; entry.passed += s.passed; entry.failed += s.failed;
        entry.skipped += s.skipped; entry.duration_ms += s.duration_ms;
      }
      const suiteOfRun = new Map([...latest.entries()].map(([sid, r]) => [r.id, suiteSlug.get(sid) ?? ""]));
      for (const f of bad ?? []) {
        entry.fallos.push({ suite: suiteOfRun.get(f.run_id) ?? "", test: f.name, error: String(f.error ?? "").slice(0, 300) });
      }
      for (const t of (all ?? []) as { name: string; duration_ms: number }[]) lentos.push({ test: t.name, ms: t.duration_ms });
    }
    out.push(entry);
  }
  lentos.sort((a, b) => b.ms - a.ms);
  return { grupo, generado: new Date().toISOString(), tools: out, lentos: lentos.slice(0, 5) };
}
