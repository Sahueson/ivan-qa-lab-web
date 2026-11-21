-- Último resultado de cada herramienta × suite, guardado para siempre (una fila por pareja, ~90 filas en total).
-- Las runs se borran (solo se guardan las 4 últimas por herramienta), pero el informe ejecutivo necesita ver las 9 suites:
-- esta tabla se rellena al terminar cada run (lib/suite-results.ts) y es la fuente de los informes.
-- Lectura pública; escribe solo la service key. Idempotente.

create table if not exists suite_results (
  tool_slug text not null,
  suite_letter char(1) not null,
  suite_slug text,
  passed integer not null default 0,
  failed integer not null default 0,
  skipped integer not null default 0,
  total integer not null default 0,
  duration_ms integer not null default 0,
  run_id uuid,                                  -- sin FK: la run puede haberse borrado ya
  failures jsonb not null default '[]'::jsonb,  -- [{ test, error }] (máx. 10, error recortado)
  slowest jsonb not null default '[]'::jsonb,   -- [{ test, ms }] (los 5 más lentos, para rendimiento)
  finished_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (tool_slug, suite_letter)
);

alter table suite_results enable row level security;
drop policy if exists "public read" on suite_results;
create policy "public read" on suite_results for select using (true);
