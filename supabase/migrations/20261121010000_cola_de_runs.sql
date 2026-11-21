-- Cola de ejecuciones: si hay un run activo (o el staging está reservado), la petición se guarda como 'waiting'
-- y la web la lanza cuando queda libre. 'waiting' NO entra en el índice one_active_run (solo queued y running).
-- Idempotente.

alter table runs drop constraint if exists runs_status_check;
alter table runs add constraint runs_status_check
  check (status in ('waiting', 'queued', 'running', 'finished', 'failed', 'timeout'));

-- Datos para lanzar el workflow cuando le toque (solo slugs y nombres de tests, nada sensible).
alter table runs add column if not exists queue_suite text;
alter table runs add column if not exists queue_grep text;

create index if not exists runs_waiting_idx on runs (created_at) where status = 'waiting';

-- Los runs en cola que llevan más de 30 minutos sin lanzarse caducan.
create or replace function expire_stale_runs(
  queued_minutes integer default 5,
  running_minutes integer default 15
) returns integer
language sql
security definer
set search_path = public
as $$
  with expired as (
    update runs
       set status = 'timeout', finished_at = now()
     where (status = 'queued'  and created_at < now() - make_interval(mins => queued_minutes))
        or (status = 'running' and coalesce(started_at, created_at) < now() - make_interval(mins => running_minutes))
        or (status = 'waiting' and created_at < now() - interval '30 minutes')
    returning 1
  )
  select count(*)::integer from expired;
$$;
revoke execute on function expire_stale_runs(integer, integer) from public, anon, authenticated;
