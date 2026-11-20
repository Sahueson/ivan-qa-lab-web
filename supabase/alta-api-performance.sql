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

-- Las 9 suites (A-I) de cada herramienta de API y rendimiento, con los nombres de las de Playwright. Mismos dominios:
-- los casos de API (57, TC-API01..58) y de carga (16, PERF-01..16) se reparten por suite. Tiempo: estimado, se reajusta con CI.
insert into suites (tool_id, target_id, slug, name, description, estimated_seconds)
select t.id, s.target_id, s.slug, s.name,
       case when t.slug = 'jmeter' then 'Rendimiento (p95 por caso): ' else 'API (RLS y roles): ' end || s.description,
       case when t.slug = 'jmeter' then 80 else 70 end
from tools t, suites s join tools pw on pw.id = s.tool_id and pw.slug = 'playwright'
where t.slug in ('newman', 'bruno', 'karate', 'jmeter')
  and not exists (select 1 from suites x where x.tool_id = t.id and x.slug = s.slug);

-- Comprobación
select t.slug, t.category, t.live_execution, s.slug as suite, s.estimated_seconds
from tools t left join suites s on s.tool_id = t.id
where t.slug in ('newman', 'bruno', 'karate', 'jmeter') order by t.slug;
