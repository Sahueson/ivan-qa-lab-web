-- Alta de Newman, Bruno, Karate (api) y JMeter (performance). Se puede ejecutar varias veces: no duplica.
-- live_execution = false ("Pronto" en el menú) hasta que pasen en CI; después:
--   update tools set live_execution = true where slug in ('newman','bruno','karate','jmeter');
-- Permite la categoría 'performance' (Rendimiento) en tools, para JMeter.
alter table tools drop constraint if exists tools_category_check;
alter table tools add constraint tools_category_check
  check (category in ('front', 'bdd', 'api', 'mobile', 'performance'));

insert into tools (slug, name, category, description, github_repo, workflow_file, enabled, live_execution) values
  ('newman', 'Newman', 'api',
   'Colecciones de Postman ejecutadas por línea de comandos: RLS y roles sobre la API REST de Supabase.',
   'Sahueson/qa-newman', 'run-tests.yml', true, false),
  ('bruno', 'Bruno', 'api',
   'Colecciones en ficheros .bru versionables con git: los mismos casos de API que Newman.',
   'Sahueson/qa-bruno', 'run-tests.yml', true, false),
  ('karate', 'Karate', 'api',
   'Pruebas de API en Gherkin con Karate: los mismos casos de API que Newman y Bruno.',
   'Sahueson/qa-karate', 'run-tests.yml', true, false),
  ('jmeter', 'JMeter', 'performance',
   'Prueba de carga ligera (5 usuarios virtuales) sobre la API, con umbral de percentil 95 por caso.',
   'Sahueson/qa-jmeter', 'run-tests.yml', true, false)
on conflict (slug) do nothing;

insert into suites (tool_id, target_id, slug, name, description, estimated_seconds)
select t.id, g.id, 'api', 'API · RLS y roles',
       '17 casos: acceso anónimo denegado, login y visibilidad de partidas por rol.', 70
from tools t, targets g
where t.slug in ('newman', 'bruno', 'karate') and g.slug = 'tactical-calendar'
  and not exists (select 1 from suites s where s.tool_id = t.id and s.slug = 'api');

insert into suites (tool_id, target_id, slug, name, description, estimated_seconds)
select t.id, g.id, 'carga', 'Carga ligera',
       '3 casos: ping, lectura anónima y lectura autenticada con p95 bajo umbral.', 90
from tools t, targets g
where t.slug = 'jmeter' and g.slug = 'tactical-calendar'
  and not exists (select 1 from suites s where s.tool_id = t.id and s.slug = 'carga');

-- Comprobación
select t.slug, t.category, t.live_execution, s.slug as suite, s.estimated_seconds
from tools t left join suites s on s.tool_id = t.id
where t.slug in ('newman', 'bruno', 'karate', 'jmeter') order by t.slug;
