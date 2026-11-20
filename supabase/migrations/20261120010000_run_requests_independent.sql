-- run_requests es el historial del límite de ejecuciones (3/h por IP, 50/día). Hasta ahora
-- colgaba de runs con ON DELETE CASCADE, así que al guardar solo las 4 últimas runs por
-- herramienta (pruneOldRunsForTool) se borraba también ese historial y el límite diario nunca
-- llegaba a alcanzarse. Ahora es independiente: si la run se borra, la fila se queda (run_id a
-- null) y sigue contando para el límite.
alter table run_requests drop constraint if exists run_requests_run_id_fkey;
alter table run_requests drop constraint if exists run_requests_pkey;
alter table run_requests add column if not exists id bigint generated always as identity primary key;
alter table run_requests alter column run_id drop not null;
alter table run_requests
  add constraint run_requests_run_id_fkey foreign key (run_id) references runs(id) on delete set null;
create index if not exists run_requests_run_idx on run_requests (run_id);
-- Las filas de más de 2 días ya no sirven para el límite: se pueden borrar sin más.
