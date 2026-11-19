-- Endurecimiento tras la revisión del 19-nov-2026.
-- Idempotente: se puede ejecutar más de una vez.

-- ============ 1. ip_hash fuera de la tabla pública ============
-- Un REVOKE de columna no anula el GRANT de tabla que Supabase da a anon/authenticated,
-- así que `revoke select (ip_hash)` no ocultaba nada. La IP hasheada pasa a una tabla
-- con RLS y sin políticas: solo la service key (API) puede leerla o escribirla.
create table if not exists run_requests (
  run_id uuid primary key references runs(id) on delete cascade,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists run_requests_ip_idx on run_requests (ip_hash, created_at);
create index if not exists run_requests_created_idx on run_requests (created_at);
alter table run_requests enable row level security;
revoke all on run_requests from anon, authenticated;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'runs' and column_name = 'ip_hash') then
    insert into run_requests (run_id, ip_hash, created_at)
      select id, ip_hash, created_at from runs where ip_hash is not null
      on conflict do nothing;
    drop index if exists runs_ip_idx;
    alter table runs drop column ip_hash;
  end if;
end $$;

-- ============ 2. Una sola ejecución activa (en cola o en curso) ============
-- Antes solo se bloqueaba 'running': dos peticiones seguidas creaban dos runs 'queued'
-- y lanzaban dos workflows contra el mismo staging.
drop index if exists one_running_run;
create unique index if not exists one_active_run on runs ((true))
  where status in ('queued', 'running');

-- ============ 3. Barrido de runs colgados ============
-- Si el runner muere sin avisar (job cancelado, fallo antes de 'start', GitHub caído),
-- el run se quedaría activo para siempre y el índice de arriba bloquearía todo.
-- La API lo llama antes de crear un run nuevo.
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
    returning 1
  )
  select count(*)::integer from expired;
$$;
revoke execute on function expire_stale_runs(integer, integer) from public, anon, authenticated;
