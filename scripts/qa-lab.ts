// Gestión local del mini Jira y de los informes (la web es de solo lectura).
// Usa la service key de ~/.qa-lab.env (LAB_URL, LAB_SERVICE_KEY): nunca se ejecuta en la web.
//
//   set -a; . ../.qa-lab.env; set +a
//   npx tsx scripts/qa-lab.ts bug "Título" --desc "..." --sev alta --tool newman --suite a-auth --test "TC-A01 ..."
//   npx tsx scripts/qa-lab.ts comentar 3 "Texto" [--tipo resolucion|reapertura|comentario] [--autor QA] [--estado cerrado]
//   npx tsx scripts/qa-lab.ts informe back|front|rendimiento
import { createClient } from '@supabase/supabase-js';
import { buildInforme } from '../lib/informes';

const [cmd, ...rest] = process.argv.slice(2);
const flags: Record<string, string> = {};
const pos: string[] = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith('--')) flags[rest[i].slice(2)] = rest[++i] ?? '';
  else pos.push(rest[i]);
}

async function main() {
  const db = createClient(process.env.LAB_URL!, process.env.LAB_SERVICE_KEY!, { auth: { persistSession: false } });

  if (cmd === 'bug') {
    const { data, error } = await db.from('bugs').insert({
      title: pos[0], description: flags.desc ?? '', severity: flags.sev ?? 'media',
      tool_slug: flags.tool ?? null, suite_slug: flags.suite ?? null, test_name: flags.test ?? null,
      run_id: flags.run ?? null, evidence_url: flags.evidencia ?? null,
    }).select('id').single();
    if (error) throw error;
    console.log(`Bug #${data.id} creado`);
  } else if (cmd === 'comentar') {
    const bugId = Number(pos[0]);
    const kind = flags.tipo ?? 'comentario';
    const { error } = await db.from('bug_comments').insert({ bug_id: bugId, kind, author: flags.autor ?? 'QA', body: pos[1] });
    if (error) throw error;
    const estado = flags.estado ?? (kind === 'resolucion' ? 'resuelto' : kind === 'reapertura' ? 'abierto' : '');
    await db.from('bugs').update({ ...(estado ? { status: estado } : {}), updated_at: new Date().toISOString() }).eq('id', bugId);
    console.log(`Comentario añadido al bug #${bugId}${estado ? ` (estado: ${estado})` : ''}`);
  } else if (cmd === 'informe') {
    const grupo = pos[0] as 'back' | 'front' | 'rendimiento';
    const data = await buildInforme(db, grupo);
    const { data: row, error } = await db.from('informes').insert({ grupo, data }).select('id').single();
    if (error) throw error;
    console.log(`Informe ${grupo} guardado: /informes/guardado/${row.id}`);
  } else {
    console.log('Uso: bug | comentar | informe (ver cabecera del fichero)');
  }
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
