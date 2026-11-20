import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';

export function useLiveRun(runId: string) {
  const [status, setStatus] = useState('queued');
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    supabaseBrowser.from('runs').select('status').eq('id', runId).single()
      // Se añade el tipado { data: any } para evitar el error
      .then(({ data }: { data: any }) => {
        if (data) setStatus(data.status);
      });

    const runSub = supabaseBrowser
      .channel(`run_${runId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'runs', filter: `id=eq.${runId}` }, 
        // Tipamos el payload como any
        (payload: any) => setStatus(payload.new.status)
      )
      .subscribe();

    const eventsSub = supabaseBrowser
      .channel(`events_${runId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'run_events', filter: `run_id=eq.${runId}` }, 
        (payload: any) => setEvents(prev => [...prev, payload.new])
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(runSub);
      supabaseBrowser.removeChannel(eventsSub);
    };
  }, [runId]);

  return { status, events };
}