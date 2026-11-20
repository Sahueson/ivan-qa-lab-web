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
    -- estimated_seconds: lo que espera el visitante, medido en CI contra STG (20-nov-2026, docs/tiempos-ejecucion.md).
    ('a-auth', 'Autenticación y perfiles', 'Login, bloqueo de usuarios, ficha de operador y qué ve cada rol', 80),
    ('b-eventos', 'Ciclo de vida de partidas', 'Crear, editar, cancelar, reactivar y eliminar; cerrar el acta y desbloquearla con aprobación', 100),
    ('c-inscripciones', 'Inscripciones y reglas', 'Equipación preseleccionada, regla de 48 h, excedencias, partidas cerradas', 100),
    ('d-asistencia', 'Motor de asistencia', '% anual, ponderación MilSim, descuento por excedencia y cierre de acta', 75),
    ('e-gobernanza', 'Gobernanza FOE', 'Expedientes, recusación, cierre por cuórum y escalado de faltas', 85),
    ('f-excedencias', 'Excedencias FOE', 'Solicitud, duración mínima, concesión por la Junta y nadie se concede la suya', 75),
    ('g-jugadores', 'Gestión de jugadores', 'Rol, bloqueo, equipos y órganos FOE (solo super admin) y qué jugadores ve cada admin', 70),
    ('h-calendario', 'Calendario y fechas sin partida', 'Vacaciones / No se juega por equipo: marcar, validar, ver y quitar', 85),
    ('i-normas', 'Normas del equipo', 'PDF en bucket privado: subida, enlace firmado, borrado del fichero y quién sube y ve', 105)
  ) as s(slug, name, description, secs)
where t.slug = 'playwright' and g.slug = 'tactical-calendar';

-- Selenium (Java y Python): mismo repo qa-selenium, un workflow por lenguaje. Mismos casos que
-- Playwright (suites A-I, 70 tests en cada lenguaje).
insert into tools (slug, name, category, description, github_repo, workflow_file, enabled, live_execution) values
  ('selenium-java', 'Selenium · Java', 'front',
   'WebDriver clásico con Java 21, JUnit 6 y page objects. Mismos casos que Playwright.',
   'Sahueson/qa-selenium', 'run-tests-java.yml', true, true),
  ('selenium-python', 'Selenium · Python', 'front',
   'WebDriver con Python 3.12, pytest y page objects. Mismos casos que Playwright.',
   'Sahueson/qa-selenium', 'run-tests-python.yml', true, true);

-- Las mismas 9 suites que Playwright (mismos casos); tiempo = el de Playwright en CI + 10 s
-- (la suite A midió 92 s en Python y 81 s en Java frente a 80 s en Playwright).
insert into suites (tool_id, target_id, slug, name, description, estimated_seconds)
select t.id, s.target_id, s.slug, s.name, s.description, s.estimated_seconds + 10
from tools t, suites s join tools pw on pw.id = s.tool_id and pw.slug = 'playwright'
where t.slug in ('selenium-java', 'selenium-python');

-- Cucumber: BDD en Gherkin en español (Cucumber-JS) ejecutado con Playwright. Suites C y E, con
-- los mismos casos que Playwright. live_execution pasa a true cuando qa-cucumber tiene sus secretos.
insert into tools (slug, name, category, description, github_repo, workflow_file, enabled, live_execution) values
  ('cucumber', 'Cucumber', 'front',
   'BDD: escenarios en Gherkin en español (Cucumber-JS) ejecutados con Playwright. Mismos casos que Playwright y Selenium.',
   'Sahueson/qa-cucumber', 'run-tests.yml', true, false);

insert into suites (tool_id, target_id, slug, name, description, estimated_seconds)
select t.id, s.target_id, s.slug, s.name, s.description, s.estimated_seconds
from tools t, suites s join tools pw on pw.id = s.tool_id and pw.slug = 'playwright'
where t.slug = 'cucumber' and s.slug in ('c-inscripciones', 'e-gobernanza');
