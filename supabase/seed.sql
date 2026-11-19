insert into tools (slug, name, category, description, github_repo) values
  ('playwright', 'Playwright', 'front', 'E2E moderno con múltiples navegadores, trazas y vídeo.', 'Sahueson/qa-playwright');

insert into targets (slug, name, type, base_url, description) values
  ('tactical-calendar', 'Tactical Calendar (demo)', 'web',
   'https://tactical-calendar-demo.vercel.app',
   'Gestión de clubes de airsoft con roles, asistencia y disciplina.');

insert into suites (tool_id, target_id, slug, name, description, estimated_seconds)
select t.id, g.id, s.slug, s.name, s.description, s.secs
from tools t, targets g,
  (values
    ('a-auth', 'Autenticación y perfiles', 'Login, bloqueo de usuarios y ficha de operador', 60),
    ('b-eventos', 'Ciclo de vida de eventos', 'Creación, cancelación y bloqueo de acta', 90)
  ) as s(slug, name, description, secs)
where t.slug = 'playwright' and g.slug = 'tactical-calendar';