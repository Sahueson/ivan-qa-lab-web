-- ============ Catálogo ============
create table tools (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null check (category in ('front', 'bdd', 'api', 'mobile')),
  description text,
  logo_url text,
  github_repo text not null,          -- ej. ivan/qa-playwright
  workflow_file text not null default 'run-tests.yml',
  enabled boolean not null default true,
  live_execution boolean not null default true  -- false = resultados pregrabados (Appium)
);

create table targets (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  type text not null check (type in ('web', 'api', 'mobile')),
  base_url text,
  description text
);

create table suites (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references tools(id) on delete cascade,
  target_id uuid not null references targets(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  estimated_seconds integer,
  unique (tool_id, slug)
);

-- ============ Ejecuciones ============
create table runs (
  id uuid primary key default gen_random_uuid(),
  suite_id uuid not null references suites(id),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'finished', 'failed', 'timeout')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  github_run_url text,
  ip_hash text
);

-- Solo una ejecución en curso a la vez (el staging es compartido)
create unique index one_running_run on runs ((true)) where status = 'running';
create index runs_status_idx on runs (status, created_at);
create index runs_ip_idx on runs (ip_hash, created_at);

create table run_events (
  id bigint generated always as identity primary key,
  run_id uuid not null references runs(id) on delete cascade,
  type text not null,                 -- log | test_started | test_passed | test_failed
  message text,
  created_at timestamptz not null default now()
);
create index run_events_run_idx on run_events (run_id, id);

create table test_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references runs(id) on delete cascade,
  name text not null,
  status text not null check (status in ('passed', 'failed', 'skipped')),
  duration_ms integer not null default 0,
  role text,                          -- usuario/rol con el que se ejecutó
  error text,
  evidence_url text
);
create index test_results_run_idx on test_results (run_id);

create table run_summary (
  run_id uuid primary key references runs(id) on delete cascade,
  total integer not null,
  passed integer not null,
  failed integer not null,
  skipped integer not null,
  duration_ms integer not null,
  pass_rate numeric(5,1) not null
);

-- ============ Seguridad (RLS) ============
-- Lectura pública. Sin políticas de escritura: solo escribe la service key
-- (API routes y runner), que se salta RLS.
alter table tools enable row level security;
alter table targets enable row level security;
alter table suites enable row level security;
alter table runs enable row level security;
alter table run_events enable row level security;
alter table test_results enable row level security;
alter table run_summary enable row level security;

create policy "public read" on tools for select using (true);
create policy "public read" on targets for select using (true);
create policy "public read" on suites for select using (true);
create policy "public read" on runs for select using (true);
create policy "public read" on run_events for select using (true);
create policy "public read" on test_results for select using (true);
create policy "public read" on run_summary for select using (true);

-- Ocultar la IP hasheada al público
revoke select (ip_hash) on runs from anon, authenticated;

-- ============ Realtime ============
alter publication supabase_realtime add table runs, run_events, test_results, run_summary;

-- ============ Storage para evidencias ============
insert into storage.buckets (id, name, public) values ('evidence', 'evidence', true)
on conflict do nothing;

create policy "public read evidence" on storage.objects
  for select using (bucket_id = 'evidence');