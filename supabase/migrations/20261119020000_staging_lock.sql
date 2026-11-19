-- Reserva única del staging de tests. Idempotente.
-- El staging es compartido y cada ejecución de tests lo resetea al empezar: dos ejecuciones
-- a la vez (web, local, otro agente) se pisan los datos. Toda ejecución reserva antes de
-- resetear y libera al terminar; la reserva caduca sola por si el proceso muere.

create table if not exists staging_lock (
  id integer primary key default 1 check (id = 1),
  holder text,                 -- quién lo tiene, p. ej. "ci:qa-playwright#123" o "local:ivan-mamut:4711"
  acquired_at timestamptz,
  expires_at timestamptz
);
insert into staging_lock (id) values (1) on conflict do nothing;

-- Privada: solo la service key (API y runners).
alter table staging_lock enable row level security;
revoke all on staging_lock from anon, authenticated;

-- Reserva atómica. Se concede si está libre, caducada o ya es del mismo holder (renovación).
-- Devuelve si se ha conseguido y quién la tiene en ese momento.
create or replace function acquire_staging_lock(p_holder text, p_ttl_seconds integer default 600)
returns table (acquired boolean, holder text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    update staging_lock l
       set holder = p_holder,
           acquired_at = now(),
           expires_at = now() + make_interval(secs => p_ttl_seconds)
     where l.id = 1
       and (l.holder is null or l.expires_at < now() or l.holder = p_holder)
    returning true, l.holder, l.expires_at;
  if not found then
    return query select false, l.holder, l.expires_at from staging_lock l where l.id = 1;
  end if;
end $$;

-- Libera solo si la reserva es de quien la pide.
create or replace function release_staging_lock(p_holder text)
returns boolean
language sql
security definer
set search_path = public
as $$
  with released as (
    update staging_lock
       set holder = null, acquired_at = null, expires_at = null
     where id = 1 and holder = p_holder
    returning 1
  )
  select exists (select 1 from released);
$$;

revoke execute on function acquire_staging_lock(text, integer) from public, anon, authenticated;
revoke execute on function release_staging_lock(text) from public, anon, authenticated;
