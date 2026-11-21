'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLiveRun } from '@/lib/hooks/useLiveRun';

function LiveRunContent() {
  const params = useParams();
  const runId = params.id as string;
  const { status, events, position } = useLiveRun(runId);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Ejecución en vivo</h1>
          <p className="text-xs text-[var(--text-secondary)] font-mono mt-1">RUN ID: {runId}</p>
        </div>

        <span
          className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider self-start ${
            status === 'finished'
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : status === 'failed'
              ? 'bg-red-500/15 text-red-600 dark:text-red-400'
              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
          }`}
        >
          ● {status === 'waiting' ? 'en cola' : status}
        </span>
      </div>

      {status === 'waiting' && (
        <div className="rounded-[24px] bg-amber-500/10 border border-amber-500/30 p-5 text-sm">
          <p className="font-medium">Tu ejecución está en cola{position ? ` (posición ${position})` : ''}.</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">El entorno de pruebas se comparte y solo admite un run a la vez. Se lanzará sola cuando quede libre; puedes dejar esta página abierta.</p>
        </div>
      )}

      <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Stream de eventos en tiempo real</h2>
          <span className="text-xs text-[var(--text-secondary)]">{events.length} eventos</span>
        </div>

        <div className="rounded-2xl bg-[#111211] text-neutral-200 p-5 font-mono text-xs sm:text-sm min-h-[340px] max-h-[500px] overflow-y-auto space-y-2.5">
          {events.length === 0 ? (
            <p className="text-neutral-500 italic">Esperando respuesta del runner de GitHub Actions...</p>
          ) : (
            events.map((ev, idx) => (
              <div key={idx} className="flex gap-3 leading-relaxed">
                <span className="text-neutral-500 shrink-0">
                  {new Date(ev.created_at).toLocaleTimeString()}
                </span>
                <span className="text-emerald-400 font-semibold shrink-0">[{ev.event_type}]</span>
                <span>
                  {ev.test_name && <span className="text-sky-300 mr-2">{ev.test_name}</span>}
                  {ev.message && <span className="text-neutral-300">{ev.message}</span>}
                  {ev.error_message && <span className="text-red-400">{ev.error_message}</span>}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {status === 'finished' && (
        <div className="flex justify-end">
          <Link
            href={`/runs/${runId}/results`}
            className="px-6 py-3 rounded-full bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] text-sm font-medium hover:opacity-90 transition"
          >
            Ver informe y métricas →
          </Link>
        </div>
      )}
    </div>
  );
}

export default function LiveRunPage() {
  return (
    <main className="pb-12">
      <Suspense fallback={<div className="max-w-5xl mx-auto p-8 text-sm text-[var(--text-secondary)]">Conectando con Realtime...</div>}>
        <LiveRunContent />
      </Suspense>
    </main>
  );
}