"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";

export type FormState = { error?: string } | undefined;

const SEVERITIES = ["baja", "media", "alta", "critica"];
const STATUSES = ["abierto", "en_progreso", "resuelto", "cerrado"];
const KINDS = ["comentario", "resolucion", "reapertura"];

const text = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);

// Lectura pública, escritura solo con la clave del dueño (QA_ADMIN_KEY en Vercel).
function checkKey(fd: FormData): string | null {
  const expected = process.env.QA_ADMIN_KEY;
  if (!expected) return "La escritura está desactivada: falta QA_ADMIN_KEY en el servidor.";
  const given = Buffer.from(String(fd.get("clave") ?? ""));
  const want = Buffer.from(expected);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return "Clave incorrecta.";
  return null;
}

export async function crearBug(_prev: FormState, fd: FormData): Promise<FormState> {
  const bad = checkKey(fd);
  if (bad) return { error: bad };
  const title = text(fd, "title", 160);
  if (title.length < 3) return { error: "El título es demasiado corto." };
  const severity = text(fd, "severity", 10);
  if (!SEVERITIES.includes(severity)) return { error: "Severidad no válida." };
  const runId = text(fd, "run_id", 40);
  const { data, error } = await getAdminClient()
    .from("bugs")
    .insert({
      title,
      description: text(fd, "description", 4000),
      severity,
      tool_slug: text(fd, "tool_slug", 40) || null,
      suite_slug: text(fd, "suite_slug", 40) || null,
      test_name: text(fd, "test_name", 200) || null,
      run_id: /^[0-9a-f-]{36}$/i.test(runId) ? runId : null,
      evidence_url: text(fd, "evidence_url", 500) || null,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "No se pudo crear el bug." };
  revalidatePath("/bugs");
  redirect(`/bugs/${data.id}`);
}

export async function comentarBug(_prev: FormState, fd: FormData): Promise<FormState> {
  const bad = checkKey(fd);
  if (bad) return { error: bad };
  const bugId = Number(fd.get("bug_id"));
  const body = text(fd, "body", 2000);
  const kind = text(fd, "kind", 20);
  const status = text(fd, "status", 20);
  if (!Number.isInteger(bugId)) return { error: "Bug no válido." };
  if (!KINDS.includes(kind)) return { error: "Tipo no válido." };
  if (!body) return { error: "Escribe un comentario." };
  if (status && !STATUSES.includes(status)) return { error: "Estado no válido." };
  const db = getAdminClient();
  const { error } = await db.from("bug_comments").insert({ bug_id: bugId, kind, author: text(fd, "author", 40) || "QA", body });
  if (error) return { error: "No se pudo guardar el comentario." };
  // Una resolución pasa el bug a "resuelto" y una reapertura a "abierto", salvo que se elija otro estado.
  const next = status || (kind === "resolucion" ? "resuelto" : kind === "reapertura" ? "abierto" : "");
  await db.from("bugs").update({ ...(next ? { status: next } : {}), updated_at: new Date().toISOString() }).eq("id", bugId);
  revalidatePath(`/bugs/${bugId}`);
  revalidatePath("/bugs");
  return undefined;
}

export async function guardarInforme(_prev: FormState, fd: FormData): Promise<FormState> {
  const bad = checkKey(fd);
  if (bad) return { error: bad };
  const grupo = text(fd, "grupo", 20);
  if (!["back", "front", "rendimiento"].includes(grupo)) return { error: "Grupo no válido." };
  const { buildInforme } = await import("@/lib/informes");
  const data = await buildInforme(grupo as "back" | "front" | "rendimiento");
  const { data: row, error } = await getAdminClient().from("informes").insert({ grupo, data }).select("id").single();
  if (error || !row) return { error: "No se pudo guardar el informe." };
  revalidatePath("/informes");
  redirect(`/informes/guardado/${row.id}`);
}
