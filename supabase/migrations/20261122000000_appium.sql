-- Appium (Android): pruebas dentro de la app (APK de Capacitor) en un emulador, lanzadas desde la web.
-- Una suite (A · Autenticación) con 4 casos por ahora. Verificada en CI (4/4, ~3 min 16 s con el emulador).
insert into tools (slug, name, category, description, github_repo, workflow_file, enabled, live_execution)
select 'appium', 'Appium', 'mobile',
  'Pruebas dentro de la app Android (Capacitor) en un emulador, con Appium y WebdriverIO. Mismos casos de login que Playwright.',
  'Sahueson/qa-appium', 'run-tests.yml', true, true
where not exists (select 1 from tools where slug = 'appium');

insert into suites (tool_id, target_id, slug, name, description, estimated_seconds)
select t.id, s.target_id, s.slug, s.name, s.description, 240
from tools t, suites s join tools pw on pw.id = s.tool_id and pw.slug = 'playwright'
where t.slug = 'appium' and s.slug = 'a-auth'
  and not exists (select 1 from suites x where x.tool_id = t.id and x.slug = 'a-auth');
