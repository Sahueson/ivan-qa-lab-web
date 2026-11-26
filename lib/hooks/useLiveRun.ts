import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';

export type RunEvent = {
  id: number;
  run_id: string;
  type: string; // log | plan | test_started | test_passed | test_failed | test_skipped
  message: string | null;
  created_at: string;
};

const FINAL = ['finished', 'failed', 'timeout'];

// Une eventos por id (Realtime y sondeo pueden traer el mismo) y los deja en orden de inserción.
function merge(prev: RunEvent[], incoming: RunEvent[]): RunEvent[] {
  if (!incoming.length) return prev;
  const byId = new Map(prev.map((e) => [e.id, e]));
  let changed = false;
  for (const e of incoming) {
    if (!byId.has(e.id)) { byId.set(e.id, e); changed = true; }
  }
  return changed ? [...byId.values()].sort((a, b) => a.id - b.id) : prev;
}

export function useLiveRun(runId: string) {
  const [status, setStatus] = useState('queued');
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [position, setPosition] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;

    const loadEvents = async () => {
      const { data } = await supabaseBrowser
        .from('run_events').select('id, run_id, type, message, created_at')
        .eq('run_id', runId).order('id', { ascending: true }).limit(1000);
      if (alive && data) setEvents((prev) => merge(prev, data as RunEvent[]));
    };

    const loadStatus = async () => {
      const { data } = await supabaseBrowser.from('runs').select('status, created_at').eq('id', runId).single();
      if (!alive || !data) return null;
      setStatus(data.status);
      return data as { status: string; created_at: string };
    };

    loadStatus();
    loadEvents();

    const runSub = supabaseBrowser
      .channel(`run_${runId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'runs', filter: `id=eq.${runId}` },
        (payload: any) => setStatus(payload.new.status))
      .subscribe();

    const eventsSub = supabaseBrowser
      .channel(`events_${runId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'run_events', filter: `run_id=eq.${runId}` },
        (payload: any) => setEvents((prev) => merge(prev, [payload.new as RunEvent])))
      .subscribe();

    // Respaldo: Realtime puede conectarse tarde o caerse; cada 3 s se vuelve a pedir el estado y los eventos
    // hasta que el run termina (un último sondeo tras el cierre recoge los eventos finales).
    let finalPolled = false;
    let lastQueueTick = 0;
    const tick = async () => {
      const me = await loadStatus();
      await loadEvents();
      if (!alive || !me) return;
      if (FINAL.includes(me.status)) { finalPolled = true; return; }
      // Run en cola: posición y aviso al servidor para que lance el siguiente si el entorno está libre (idempotente).
      if (me.status === 'waiting') {
        if (Date.now() - lastQueueTick < 8000) return;
        lastQueueTick = Date.now();
        const { count } = await supabaseBrowser.from('runs').select('id', { count: 'exact', head: true })
          .eq('status', 'waiting').lt('created_at', me.created_at);
        if (alive) setPosition((count ?? 0) + 1);
        fetch('/api/runs/advance', { method: 'POST' }).catch(() => {});
      } else {
        setPosition(null);
      }
    };
    tick();
    const timer = setInterval(() => { if (!finalPolled) tick(); }, 3000);

    return () => {
      alive = false;
      clearInterval(timer);
      supabaseBrowser.removeChannel(runSub);
      supabaseBrowser.removeChannel(eventsSub);
    };
  }, [runId]);

  return { status, events, position };
}
