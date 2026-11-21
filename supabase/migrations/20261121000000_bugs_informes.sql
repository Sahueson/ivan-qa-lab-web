-- Mini Jira (bugs + comentarios) e informes ejecutivos guardados.
-- Lectura pública; escribe solo la service key (acciones de servidor protegidas con QA_ADMIN_KEY).
-- Idempotente: se puede pegar entero en el SQL Editor más de una vez.

create table if not exists bugs (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 3 and 160),
  description text not null default '',
  severity text not null default 'media' check (severity in ('baja', 'media', 'alta', 'critica')),
  status text not null default 'abierto' check (status in ('abierto', 'en_progreso', 'resuelto', 'cerrado')),
  tool_slug text,
  suite_slug text,
  test_name text,
  run_id uuid references runs(id) on delete set null,
  evidence_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bug_comments (
  id bigint generated always as identity primary key,
  bug_id bigint not null references bugs(id) on delete cascade,
  kind text not null default 'comentario' check (kind in ('comentario', 'resolucion', 'reapertura')),
  author text not null default 'QA',
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists bug_comments_bug_idx on bug_comments (bug_id, created_at);

create table if not exists informes (
  id bigint generated always as identity primary key,
  grupo text not null check (grupo in ('back', 'front', 'rendimiento')),
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table bugs enable row level security;
alter table bug_comments enable row level security;
alter table informes enable row level security;
drop policy if exists "public read" on bugs;
drop policy if exists "public read" on bug_comments;
drop policy if exists "public read" on informes;
create policy "public read" on bugs for select using (true);
create policy "public read" on bug_comments for select using (true);
create policy "public read" on informes for select using (true);

-- Bug real (confirmado en el staging el 20-nov, pendiente de corregir en la app). Los comentarios y el bug de ejemplo "[Ejemplo] TC-J01"
-- se gestionan con scripts/qa-lab.ts.
insert into bugs (title, description, severity, status, tool_slug, suite_slug)
select 'admin_mad crea y borra fechas de "Ambos equipos" (RLS de team_blackouts)',
       'Un admin de MAD puede crear y borrar fechas sin partida marcadas para ambos equipos por API, cuando solo debería gestionar las de su equipo.',
       'alta', 'abierto', 'newman', 'h-calendario'
where not exists (select 1 from bugs where title like 'admin_mad crea y borra fechas%');
