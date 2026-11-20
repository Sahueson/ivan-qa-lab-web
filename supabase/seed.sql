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
    -- estimated_seconds: duración media medida de los tests + reset (20-nov-2026, sin el arranque de CI).
    ('a-auth', 'Autenticación y perfiles', 'Login, bloqueo de usuarios, ficha de operador y qué ve cada rol', 25),
    ('b-eventos', 'Ciclo de vida de partidas', 'Crear, editar, cancelar, reactivar y eliminar; cerrar el acta y desbloquearla con aprobación', 45),
    ('c-inscripciones', 'Inscripciones y reglas', 'Equipación preseleccionada, regla de 48 h, excedencias, partidas cerradas', 25),
    ('d-asistencia', 'Motor de asistencia', '% anual, ponderación MilSim, descuento por excedencia y cierre de acta', 20),
    ('e-gobernanza', 'Gobernanza FOE', 'Expedientes, recusación, cierre por cuórum y escalado de faltas', 25),
    ('f-excedencias', 'Excedencias FOE', 'Solicitud, duración mínima, concesión por la Junta y nadie se concede la suya', 15),
    ('g-jugadores', 'Gestión de jugadores', 'Rol, bloqueo, equipos y órganos FOE (solo super admin) y qué jugadores ve cada admin', 25),
    ('h-calendario', 'Calendario y fechas sin partida', 'Vacaciones / No se juega por equipo: marcar, validar, ver y quitar', 20),
    ('i-normas', 'Normas del equipo', 'PDF en bucket privado: subida, enlace firmado, borrado del fichero y quién sube y ve', 25)
  ) as s(slug, name, description, secs)
where t.slug = 'playwright' and g.slug = 'tactical-calendar';