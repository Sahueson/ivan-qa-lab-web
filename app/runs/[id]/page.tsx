'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLiveRun, type RunEvent } from '@/lib/hooks/useLiveRun';
import { runStatusLabel } from '@/lib/labels';
import { useT } from '@/app/components/I18nProvider';

const DONE = ['finished', 'failed', 'timeout'];

type Row = { key: number; kind: 'log' | 'passed' | 'failed' | 'skipped' | 'running'; at: string; text: string; secs?: number };

// Convierte los eventos en filas: se ocultan los test_started que ya tienen resultado y, si hay un test
// en marcha, se enseña como última fila. La duración sale de la diferencia entre inicio y fin.
function buildRows(events: RunEvent[]) {
  const started = new Map<string, number>();
  const rows: Row[] = [];
  let total = 0;
  let running: RunEvent | null = null;
  const finishedNames = new Set<string>();
  for (const ev of events) {
    const text = ev.message ?? '';
    if (ev.type === 'plan') { total = parseInt(text, 10) || 0; continue; }
    if (ev.type === 'test_started') { started.set(text, new Date(ev.created_at).getTime()); running = ev; continue; }
    if (ev.type === 'test_passed' || ev.type === 'test_failed' || ev.type === 'test_skipped') {
      finishedNames.add(text);
      const t0 = started.get(text);
      const secs = t0 ? Math.max(0, (new Date(ev.created_at).getTime() - t0) / 1000) : undefined;
      const kind = ev.type === 'test_passed' ? 'passed' : ev.type === 'test_failed' ? 'failed' : 'skipped';
      rows.push({ key: ev.id, kind, at: ev.created_at, text, secs });
      if (running && running.message === text) running = null;
      continue;
    }
    rows.push({ key: ev.id, kind: 'log', at: ev.created_at, text });
  }
  if (running && !finishedNames.has(running.message ?? '')) rows.push({ key: running.id, kind: 'running', at: running.created_at, text: running.message ?? '' });
  const count = (k: Row['kind']) => rows.filter((r) => r.kind === k).length;
  const passed = count('passed');
  const failed = count('failed');
  const skipped = count('skipped');
  return { rows, total, passed, failed, skipped, done: passed + failed + skipped };
}

function LiveRunContent() {
  const t = useT();
  const params = useParams();
  const runId = params.id as string;
  const { status, events, position } = useLiveRun(runId);
  const { rows, total, passed, failed, skipped, done } = useMemo(() => buildRows(events), [events]);
  const consoleRef = useRef<HTMLDivElement>(null);
  const finished = DONE.includes(status);

  // Mantiene la consola pegada al último evento mientras llegan.
  useEffect(() => {
    const el = consoleRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [rows.length]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t('Ejecución en vivo')}</h1>
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
          ● {t(runStatusLabel(status))}
        </span>
      </div>

      {status === 'waiting' && (
        <div className="rounded-[24px] bg-amber-500/10 border border-amber-500/30 p-5 text-sm">
          <p className="font-medium">{t('Tu ejecución está en cola')}{position ? ` (${t('posición {n}', { n: position })})` : ''}.</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">{t('El entorno de pruebas se comparte y solo admite un run a la vez. Se lanzará sola cuando quede libre; puedes dejar esta página abierta.')}</p>
        </div>
      )}

      <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">{t('Estado de la ejecución en tiempo real')}</h2>
          <span className="text-xs text-[var(--text-secondary)]">{t('{n} eventos', { n: events.length })}</span>
        </div>

        {total > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1.5">
              <span>{t('{done} de {total} tests', { done, total })}</span>
              <span>
                <span className="text-emerald-600 dark:text-emerald-400">✓ {passed}</span>
                {' · '}
                <span className={failed ? 'text-red-600 dark:text-red-400' : ''}>✗ {failed}</span>
                {skipped > 0 && <> · ○ {skipped}</>}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${failed ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, Math.round((done / total) * 100))}%` }}
              />
            </div>
          </div>
        )}

        <div
          ref={consoleRef}
          className="rounded-2xl bg-[#111211] text-neutral-200 p-5 font-mono text-xs sm:text-sm min-h-[340px] max-h-[500px] overflow-y-auto space-y-2"
        >
          {rows.length === 0 ? (
            <p className="text-neutral-500 italic">
              {finished
                ? t('La ejecución ha terminado sin eventos registrados. Mira el informe.')
                : status === 'waiting'
                  ? t('Esperando turno: el entorno de pruebas solo admite una ejecución a la vez.')
                  : t('El runner de GitHub Actions está arrancando el entorno. Los tests aparecerán aquí según se vayan ejecutando.')}
            </p>
          ) : (
            rows.map((r) => (
              <div key={`${r.kind}-${r.key}`} className="flex gap-3 leading-relaxed">
                <span className="text-neutral-500 shrink-0">{new Date(r.at).toLocaleTimeString()}</span>
                {r.kind === 'passed' && <span className="text-emerald-400 font-semibold shrink-0">✓</span>}
                {r.kind === 'failed' && <span className="text-red-400 font-semibold shrink-0">✗</span>}
                {r.kind === 'skipped' && <span className="text-neutral-500 font-semibold shrink-0">○</span>}
                {r.kind === 'running' && <span className="text-sky-300 font-semibold shrink-0 animate-pulse">▶</span>}
                {r.kind === 'log' && <span className="text-neutral-500 shrink-0">·</span>}
                <span
                  className={
                    r.kind === 'failed' ? 'text-red-300'
                    : r.kind === 'running' ? 'text-sky-300'
                    : r.kind === 'log' ? 'text-neutral-400'
                    : 'text-neutral-200'
                  }
                >
                  {r.text}
                  {r.secs !== undefined && <span className="text-neutral-500"> ({r.secs.toFixed(1)} s)</span>}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {finished && (
        <div className="flex justify-end">
          <Link
            href={`/runs/${runId}/results`}
            className="px-6 py-3 rounded-full bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] text-sm font-medium hover:opacity-90 transition"
          >
            {t('Ver informe y métricas')} →
          </Link>
        </div>
      )}
    </div>
  );
}

export default function LiveRunPage() {
  return (
    <main className="pb-12">
      <Suspense fallback={<div className="max-w-5xl mx-auto p-8 text-sm text-[var(--text-secondary)]">…</div>}>
        <LiveRunContent />
      </Suspense>
    </main>
  );
}
