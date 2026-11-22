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
    herramientas: ["playwright", "selenium-java", "selenium-python", "cucumber", "cypress", "appium"],
    descripcion: "Flujos de usuario contra Tactical Calendar: cinco herramientas en navegador real y Appium dentro de la app Android, sobre los mismos casos.",
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
  /** Fecha del resultado más reciente de esta herramienta (ISO). */
  actualizado?: string;
};

export type InformeData = {
  grupo: Grupo;
  generado: string;
  tools: InformeTool[];
  lentos: { test: string; ms: number }[];
};

type RunRow = { id: string; suite_id: string; created_at: string };

/**
 * Informe de un grupo. Lee suite_results (el último resultado de cada herramienta × suite, que no se borra), así que
 * refleja las 9 suites aunque las runs antiguas ya no existan. Si esa tabla aún no existe o está vacía, usa las runs guardadas.
 */
export async function buildInforme(db: SupabaseClient, grupo: Grupo): Promise<InformeData> {
  const { data: tools } = await db.from("tools").select("id, slug, name").in("slug", GRUPOS[grupo].herramientas);
  const { data: rows, error } = await db.from("suite_results").select("*").in("tool_slug", GRUPOS[grupo].herramientas).neq("suite_letter", "J");
  if (error || !rows || rows.length === 0) return buildInformeFromRuns(db, grupo);

  const out: InformeTool[] = [];
  const lentos: { test: string; ms: number }[] = [];
  for (const tool of tools ?? []) {
    const { data: suites } = await db.from("suites").select("slug").eq("tool_id", tool.id);
    const mine = rows.filter((r) => r.tool_slug === tool.slug);
    const entry: InformeTool = {
      slug: tool.slug, name: tool.name,
      suitesCubiertas: mine.length,
      suitesTotales: (suites ?? []).filter((x) => x.slug !== "j-demo-fallos").length,
      total: 0, passed: 0, failed: 0, skipped: 0, duration_ms: 0, fallos: [],
      actualizado: mine.map((r) => r.finished_at as string).sort().pop(),
    };
    for (const r of mine) {
      entry.total += r.total; entry.passed += r.passed; entry.failed += r.failed; entry.skipped += r.skipped; entry.duration_ms += r.duration_ms;
      for (const f of (r.failures ?? []) as { test: string; error: string }[]) entry.fallos.push({ suite: r.suite_slug ?? r.suite_letter, test: f.test, error: f.error });
      if (grupo === "rendimiento") for (const l of (r.slowest ?? []) as { test: string; ms: number }[]) lentos.push(l);
    }
    out.push(entry);
  }
  lentos.sort((a, b) => b.ms - a.ms);
  return { grupo, generado: new Date().toISOString(), tools: out, lentos: lentos.slice(0, 5) };
}

// Versión antigua: último run terminado de cada suite entre las runs guardadas (4 por herramienta).
async function buildInformeFromRuns(db: SupabaseClient, grupo: Grupo): Promise<InformeData> {
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
