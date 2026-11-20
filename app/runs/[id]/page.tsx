'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLiveRun } from '@/lib/hooks/useLiveRun';

function LiveRunContent() {
  const params = useParams();
  const runId = params.id as string;
  const { status, events } = useLiveRun(runId);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Ejecución en vivo</h1>
      <p className="text-gray-500 mb-6 font-mono text-sm">{runId}</p>
      
      <div className="mb-6 p-4 rounded bg-white shadow flex items-center gap-4">
        <span className="text-lg">Estado actual:</span>
        <span className={`px-3 py-1 rounded font-bold uppercase text-sm
          ${status === 'queued' ? 'bg-yellow-100 text-yellow-800' : ''}
          ${status === 'running' ? 'bg-blue-100 text-blue-800' : ''}
          ${status === 'finished' ? 'bg-green-100 text-green-800' : ''}
          ${status === 'failed' ? 'bg-red-100 text-red-800' : ''}
        `}>
          {status}
        </span>
      </div>

      <div className="bg-white border rounded shadow p-4">
        <h2 className="text-xl font-semibold mb-4">Terminal de eventos</h2>
        <div className="bg-black text-green-400 p-4 rounded font-mono text-sm min-h-[300px] overflow-y-auto space-y-2">
          {events.length === 0 ? (
            <p className="text-gray-500 italic">Esperando que el worker inicie y envíe eventos...</p>
          ) : (
            events.map((ev, idx) => (
              <div key={idx} className="flex gap-3">
                <span className="text-gray-500 shrink-0">
                  [{new Date(ev.created_at).toLocaleTimeString()}]
                </span>
                <span className="font-bold text-white shrink-0">[{ev.event_type}]</span>
                <span>
                  {ev.test_name && <span className="text-blue-300 mr-2">{ev.test_name}</span>}
                  {ev.message && <span className="text-gray-300">{ev.message}</span>}
                  {ev.error_message && <span className="text-red-400">{ev.error_message}</span>}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
      
      {status === 'finished' && (
        <div className="mt-8 text-center">
          <Link href={`/runs/${runId}/results`} className="bg-black text-white px-6 py-2 rounded font-medium inline-block">
            Ver Informe Completo y Métricas
          </Link>
        </div>
      )}
    </div>
  );
}

export default function LiveRunPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <Suspense fallback={<div className="max-w-4xl mx-auto p-8 text-center text-gray-500">Cargando terminal en vivo...</div>}>
        <LiveRunContent />
      </Suspense>
    </main>
  );
}