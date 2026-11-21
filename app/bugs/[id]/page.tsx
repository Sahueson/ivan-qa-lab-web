import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminClient } from '@/lib/supabase/admin';
import { ESTADOS, SEVERIDADES, TIPOS, estadoCls } from '../labels';

async function BugPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bugId = Number(id);
  if (!Number.isInteger(bugId)) notFound();
  const db = getAdminClient();
  const [{ data: bug }, { data: comments }] = await Promise.all([
    db.from('bugs').select('*').eq('id', bugId).single(),
    db.from('bug_comments').select('*').eq('bug_id', bugId).order('created_at', { ascending: true }),
  ]);
  if (!bug) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 space-y-6">
      <Link href="/bugs" className="text-sm text-[var(--text-secondary)] hover:underline">← Todos los bugs</Link>
      <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${estadoCls(bug.status)}`}>{ESTADOS[bug.status]}</span>
          <span className="px-2.5 py-1 rounded-full text-xs bg-[var(--bg-surface-muted)]">Severidad {SEVERIDADES[bug.severity].toLowerCase()}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">#{bug.id} · {bug.title}</h1>
        <p className="text-sm whitespace-pre-wrap">{bug.description || 'Sin descripción.'}</p>
        <dl className="grid sm:grid-cols-2 gap-2 text-xs text-[var(--text-secondary)]">
          {bug.tool_slug && <div>Herramienta: <span className="text-[var(--text-primary)]">{bug.tool_slug}</span></div>}
          {bug.suite_slug && <div>Suite: <span className="text-[var(--text-primary)]">{bug.suite_slug}</span></div>}
          {bug.test_name && <div className="sm:col-span-2">Test: <span className="text-[var(--text-primary)]">{bug.test_name}</span></div>}
          <div>Creado: {new Date(bug.created_at).toLocaleString('es-ES')}</div>
          <div>Actualizado: {new Date(bug.updated_at).toLocaleString('es-ES')}</div>
        </dl>
        <div className="flex flex-wrap gap-4 text-sm">
          {bug.run_id && <Link href={`/runs/${bug.run_id}/results`} className="underline">Ver el run</Link>}
          {bug.evidence_url && <a href={bug.evidence_url} target="_blank" rel="noreferrer" className="underline">Ver evidencia ↗</a>}
        </div>
      </div>

      <h2 className="text-lg font-semibold">Seguimiento</h2>
      <ol className="space-y-3">
        {(comments ?? []).map((c) => (
          <li key={c.id} className={`rounded-2xl border border-[var(--border-subtle)] p-4 ${c.kind === 'resolucion' ? 'bg-emerald-500/10' : c.kind === 'reapertura' ? 'bg-red-500/10' : 'bg-[var(--bg-surface)]'}`}>
            <p className="text-xs text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">{c.author}</span> · {TIPOS[c.kind]} · {new Date(c.created_at).toLocaleString('es-ES')}
            </p>
            <p className="text-sm mt-1 whitespace-pre-wrap">{c.body}</p>
          </li>
        ))}
        {(comments ?? []).length === 0 && <li className="text-sm text-[var(--text-secondary)]">Sin comentarios todavía.</li>}
      </ol>

    </div>
  );
}

export default function BugPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="max-w-5xl mx-auto p-8 text-sm text-[var(--text-secondary)]">Cargando…</p>}>
      <BugPageContent params={params} />
    </Suspense>
  );
}
