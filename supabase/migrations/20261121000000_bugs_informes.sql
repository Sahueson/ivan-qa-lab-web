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

-- Bug de ejemplo (real: pendiente de corregir en la app) con su ciclo comentario, resolución, comentario.
insert into bugs (title, description, severity, status, tool_slug, suite_slug, test_name)
select 'admin_mad crea y borra fechas de "Ambos equipos" (RLS de team_blackouts)',
       'Un admin de MAD puede crear y borrar fechas sin partida marcadas para ambos equipos, cuando solo debería gestionar las de su equipo.' || chr(10) ||
       'Pasos: iniciar sesión como admin MAD, crear una fecha sin partida con alcance "Ambos equipos" y borrarla. Esperado: 401/403. Obtenido: la operación se completa.',
       'alta', 'abierto', 'newman', 'h-calendario', 'TC-H04 Jugador MAD no crea fechas sin partida'
where not exists (select 1 from bugs where title like 'admin_mad crea y borra fechas%');

insert into bug_comments (bug_id, kind, author, body, created_at)
select b.id, v.kind, v.author, v.body, now() - v.ago
from bugs b
cross join (values
  ('comentario', 'QA', 'Reproducido en staging con el usuario QA admin MAD. Adjunto la petición y la respuesta del caso de API.', interval '3 hours'),
  ('comentario', 'Desarrollo', 'Confirmado: la política de INSERT/DELETE de team_blackouts no distingue el alcance "Ambos equipos". Se corrige en la próxima migración.', interval '2 hours'),
  ('resolucion', 'Desarrollo', 'Política corregida: solo super admin gestiona fechas de ambos equipos. Pendiente de verificación por QA.', interval '1 hour')
) as v(kind, author, body, ago)
where b.title like 'admin_mad crea y borra fechas%'
  and not exists (select 1 from bug_comments c where c.bug_id = b.id);
