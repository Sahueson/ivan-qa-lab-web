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

export type SuiteLinea = { letter: string; slug: string; name: string; total: number; passed: number; failed: number; skipped: number; duration_ms: number };

export type BugLinea = { id: number; title: string; severity: string; status: string; tool_slug: string | null; suite_slug: string | null; test_name: string | null };

export type Peticion = {
  test: string;
  status: string;
  peticiones: number;
  errores: number;
  min_ms: number;
  media_ms: number;
  p95_ms: number;
  max_ms: number;
  umbral_p95_ms: number;
  tramo_s: number;
  /** Por tramos de tramo_s segundos desde el inicio: peticiones, tiempo medio y máximo. */
  serie: { s: number; n: number; avg_ms: number; max_ms: number }[];
};

export type InformeAnterior = { generado: string; version: number; total: number; passed: number; failed: number; skipped: number };

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
  /** Resultado por suite (A–I). Los informes guardados antes del rediseño no lo traen. */
  suites?: SuiteLinea[];
  /** Fecha del resultado más reciente de esta herramienta (ISO). */
  actualizado?: string;
};

export type InformeData = {
  grupo: Grupo;
  generado: string;
  tools: InformeTool[];
  lentos: { test: string; ms: number }[];
  /** Nº de versión del informe de este grupo (1, 2, 3…). */
  version?: number;
  /** Resultado del informe guardado anterior del mismo grupo, para compararlo. */
  anterior?: InformeAnterior | null;
  /** Solo rendimiento: medición de cada petición de la última ejecución de JMeter (con su serie temporal). */
  peticiones?: Peticion[];
  /** Bugs abiertos de las herramientas del grupo (mini Jira). */
  bugs?: BugLinea[];
};

type RunRow = { id: string; suite_id: string; created_at: string };

/**
 * Informe de un grupo. Lee suite_results (el último resultado de cada herramienta × suite, que no se borra), así que
 * refleja las 9 suites aunque las runs antiguas ya no existan. Si esa tabla aún no existe o está vacía, usa las runs guardadas.
 */
async function buildInformeBase(db: SupabaseClient, grupo: Grupo): Promise<InformeData> {
  const { data: tools } = await db.from("tools").select("id, slug, name").in("slug", GRUPOS[grupo].herramientas);
  const { data: rows, error } = await db.from("suite_results").select("*").in("tool_slug", GRUPOS[grupo].herramientas).neq("suite_letter", "J");
  if (error || !rows || rows.length === 0) return buildInformeFromRuns(db, grupo);

  const out: InformeTool[] = [];
  const lentos: { test: string; ms: number }[] = [];
  for (const tool of tools ?? []) {
    const { data: suites } = await db.from("suites").select("slug, name").eq("tool_id", tool.id);
    const nombre = new Map((suites ?? []).map((x) => [x.slug as string, x.name as string]));
    const mine = rows.filter((r) => r.tool_slug === tool.slug);
    const entry: InformeTool = {
      slug: tool.slug, name: tool.name,
      suitesCubiertas: mine.length,
      suitesTotales: (suites ?? []).filter((x) => x.slug !== "j-demo-fallos").length,
      total: 0, passed: 0, failed: 0, skipped: 0, duration_ms: 0, fallos: [],
      actualizado: mine.map((r) => r.finished_at as string).sort().pop(),
      suites: mine
        .map((r) => ({ letter: String(r.suite_letter), slug: String(r.suite_slug ?? r.suite_letter), name: nombre.get(r.suite_slug) ?? String(r.suite_slug ?? r.suite_letter), total: r.total, passed: r.passed, failed: r.failed, skipped: r.skipped, duration_ms: r.duration_ms }))
        .sort((a, b) => a.letter.localeCompare(b.letter)),
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

/** Informe completo: resultados + versión, comparación con el informe guardado anterior y bugs abiertos. */
export async function buildInforme(db: SupabaseClient, grupo: Grupo): Promise<InformeData> {
  const data = await buildInformeBase(db, grupo);
  try {
    const { data: prev } = await db.from("informes").select("data, created_at").eq("grupo", grupo).order("created_at", { ascending: false }).limit(1);
    const { count } = await db.from("informes").select("id", { count: "exact", head: true }).eq("grupo", grupo);
    data.version = (count ?? 0) + 1;
    const p = prev?.[0]?.data as InformeData | undefined;
    if (p) {
      const sum = (k: "total" | "passed" | "failed" | "skipped") => p.tools.reduce((a, x) => a + x[k], 0);
      data.anterior = { generado: p.generado ?? prev![0].created_at, version: p.version ?? count ?? 1, total: sum("total"), passed: sum("passed"), failed: sum("failed"), skipped: sum("skipped") };
    } else data.anterior = null;
    const { data: bugs } = await db.from("bugs").select("id, title, severity, status, tool_slug, suite_slug, test_name").in("tool_slug", GRUPOS[grupo].herramientas).in("status", ["abierto", "en_progreso"]).order("id");
    data.bugs = (bugs ?? []) as BugLinea[];
    if (grupo === "rendimiento") data.peticiones = await cargarPeticiones(db);
  } catch {
    // tablas auxiliares ausentes: el informe sigue valiendo sin comparación ni bugs
  }
  return data;
}

/** Mediciones de JMeter: último resultado de cada petición entre las runs guardadas, leyendo el JSON de evidencia de cada una. */
async function cargarPeticiones(db: SupabaseClient): Promise<Peticion[]> {
  const { data: tool } = await db.from("tools").select("id").eq("slug", "jmeter").single();
  if (!tool) return [];
  const { data: suites } = await db.from("suites").select("id").eq("tool_id", tool.id);
  const { data: runs } = await db.from("runs").select("id").in("suite_id", (suites ?? []).map((x) => x.id)).eq("status", "finished").order("created_at", { ascending: false }).limit(4);
  const ids = (runs ?? []).map((r) => r.id as string);
  if (ids.length === 0) return [];
  const order = new Map(ids.map((id, i) => [id, i]));
  const { data: rows } = await db.from("test_results").select("name, status, evidence_url, run_id").in("run_id", ids).not("evidence_url", "is", null);
  const latest = new Map<string, { name: string; status: string; evidence_url: string; run_id: string }>();
  for (const r of (rows ?? []) as { name: string; status: string; evidence_url: string; run_id: string }[]) {
    const cur = latest.get(r.name);
    if (!cur || (order.get(r.run_id) ?? 99) < (order.get(cur.run_id) ?? 99)) latest.set(r.name, r);
  }
  const out: Peticion[] = [];
  await Promise.all([...latest.values()].map(async (r) => {
    try {
      const res = await fetch(r.evidence_url);
      if (!res.ok) return;
      const m = (await res.json())?.medicion;
      if (!m || !Array.isArray(m.serie)) return;
      out.push({ test: r.name, status: r.status, peticiones: m.peticiones, errores: m.errores, min_ms: m.min_ms, media_ms: m.media_ms, p95_ms: m.p95_ms, max_ms: m.max_ms, umbral_p95_ms: m.umbral_p95_ms, tramo_s: m.tramo_s ?? 2, serie: m.serie });
    } catch {
      // evidencia no disponible: esa petición se omite del análisis
    }
  }));
  return out.sort((a, b) => a.test.localeCompare(b.test));
}
