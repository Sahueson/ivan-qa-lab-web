@AGENTS.md

# Ivan QA Lab: contexto del proyecto

## Objetivo
Web pública de portfolio (https://ivan-qa-lab.vercel.app, Vercel gratis) donde el visitante elige una
herramienta de automatización, elige sobre qué probar, lanza la ejecución, la ve en vivo y consulta
resultados con métricas. Usuario de GitHub: Sahueson. Idioma de trabajo: español.

## Arquitectura (decisión clave)
Vercel NO ejecuta tests (serverless). La web solo orquesta y muestra:
1. Web (Next.js 16 + Tailwind) -> POST /api/runs -> valida, rate limit, crea fila en `runs` (Supabase).
2. La API dispara `workflow_dispatch` en el repo de la herramienta (inputs: run_id, suite).
3. GitHub Actions ejecuta los tests y los reporters envían eventos/resultados a Supabase.
4. La web escucha con Supabase Realtime y pinta el progreso; al final, métricas.
Solo una ejecución a la vez (el staging es compartido). Lista cerrada de targets/suites: nunca
aceptar URLs ni comandos del usuario.

## Estructura local (~/Genexys/app-ivan/ivan-qa-lab/), un repo por herramienta
ivan-qa-lab-web, ivan-qa-lab-shared, qa-playwright, qa-selenium, qa-cucumber, qa-karate,
qa-newman, qa-bruno, qa-appium (todos creados en GitHub bajo Sahueson; solo web, shared y
playwright tienen contenido real; selenium/cucumber/newman/bruno solo `npm init` + dependencias).
App a probar: Airsoft-Tactical-Calendar (~/Genexys/app-ivan/Airsoft-Tactical-Calendar, Vite + React + Zustand).

## Proyectos Supabase (cuenta Gmail nueva, plan gratis, límite 2)
- ivan-qa-lab (ref exukogfrnsivvibcqejl): datos de esta web.
  Tablas: tools, targets, suites, runs, run_events, test_results, run_summary (lectura pública por
  RLS) + run_requests (ip_hash, SIN acceso público: solo service key). Realtime activo, bucket
  `evidence`. Índice único `one_active_run` (un solo run en queued|running). Función
  `expire_stale_runs()` (queued >5 min / running >15 min -> timeout; la llama la API).
  Migraciones en supabase/migrations/ (init + hardening). Seed: tool playwright
  (repo Sahueson/qa-playwright), target tactical-calendar, suites a-auth y b-eventos.
  Ojo: un `revoke select (col)` NO oculta una columna en Supabase (anon tiene GRANT de tabla);
  lo privado va en tabla aparte sin políticas.
- tactical-calendar-staging (ref rpxdxitntsmgcbbnuyox): destino de los tests. Esquema copiado de
  PROD (10 tablas, 35 políticas, idéntico), buckets event-images y team-documents con 7 políticas.
- PROD de la app (ref eczgrfvmeksvqjrphkwg): SOLO LECTURA. Nunca escribir ni ejecutar tests contra él.
  El DEV está desfasado, no usarlo como fuente.

## Hecho y validado
- shared: schema/result.schema.json, schema/example.json, send-to-supabase.js
  (start | event | finish | fail). start guarda github_run_url; finish es repetible (borra y
  reinserta test_results, upsert de run_summary) y con 0 tests marca failed; los PATCH solo tocan
  runs activos (no reabren un run cerrado por timeout).
- web: lib/supabase/{browser,admin}.ts, lib/github/dispatch.ts, app/api/runs/route.ts en la RAÍZ
  (no en src/: con app/ en la raíz Next ignora src/app, y `@/*` apunta a `./*`).
  POST /api/runs {tool, suite} (slugs) -> 201 {run_id} | 400 | 404 | 409 ocupado/no en vivo |
  429 (3/h por IP, 50/día global) | 502 dispatch rechazado (run -> failed).
- qa-playwright: reporter propio (reporters/qa-lab-reporter.ts -> result.json normalizado), solo
  proyecto chromium, workers 1 en serie (staging compartido), tsconfig node16, smoke test
  tests/a-auth/smoke.spec.ts. El reporter guarda solo el intento final de cada test (con
  retries un flaky cuenta passed) y quita los códigos ANSI de los errores. Workflow
  .github/workflows/run-tests.yml con container mcr.microsoft.com/playwright:v1.65.1-noble
  (37 s), con paso final `fail` (if: failure() || cancelled()). Secretos del repo: SUPABASE_URL,
  SUPABASE_SERVICE_KEY, TARGET_BASE_URL.
  Circuito completo probado a mano con `gh workflow run`: runs -> test_results -> run_summary OK.
- staging: esquema, buckets y políticas aplicados. reset-staging/ en shared: create-users.js,
  users.json y storage.sql (subidos) + schema*.sql (solo local, gitignored).

## La app Tactical Calendar (para escribir tests y seed)
- Roles: profiles.app_role = player | admin | super_admin; equipos en profiles.squads
  ("MAD Irregulars", "FOE"); Junta en foe_subroles (junta_operativa, junta_directiva);
  is_blocked bloquea. La pestaña FOE solo se ve con "FOE" en squads o siendo super admin.
- Login QA por email+contraseña, visible si VITE_ENABLE_QA_LOGIN=true (solo en el demo, nunca en PROD).
- Tablas: events, event_registrations, player_leaves, team_blackouts, team_documents,
  foe_infractions, foe_polls, foe_poll_votes, profiles, keep_alive.
- No hay trigger en auth.users: el perfil lo crea la app. protect_profile_sensitive_fields deja
  pasar si auth.uid() es null (el seed con conexión directa puede fijar roles).
- Los eventos de PROD están vacíos: el seed los crea (reset-staging/reset.js).
- NO existe evento "global": la política SELECT de events solo deja ver squad ∈ squads del usuario
  (o super admin). Con squad='' solo lo vería el super admin; la app siempre asigna MAD o FOE.
- Desde cbf909b el cierre de votaciones, las faltas y el escalado van en la BD (close_foe_poll);
  la ponderación MilSim y el % de asistencia se siguen calculando en el front (RosterView). Solo hay CHECKs de enums:
  events.event_type normal|milsim; foe_polls.board junta_operativa|junta_directiva, status
  open|closed; foe_infractions.severity apercibimiento|leve|grave|muy_grave, status
  active|resolved; player_leaves.status pending|approved|rejected; team_documents.category
  statutes|bof. events.date "YYYY-MM-DD" y hour "HH:MM" son text en hora local.
- Regla de las 48 h: SÍ está implementada (el resumen de funcionalidades está desfasado).
  `removeRegistration` (src/store/use-calendar-store.js) la bloquea con un toast "Faltan menos de
  48 horas..." usando getEventLockStatus (src/lib/calendar-utils.js); no deshabilita el botón,
  así que TC-C02 debe comprobar el toast y que la inscripción sigue en BD. Lo que está en roadmap
  son las multas de 5 € por reincidencia. Falta además un test para 3 graves -> Muy Grave (TC-E05).

## 8 usuarios QA (users.json, contraseña común en QA_PASSWORD, emails qa.*@example.com)
superadmin, admin_mad, admin_foe, junta2 (2º miembro para cuórum/recusación), player_foe,
player_mad, blocked, sinequipo.

## Pendiente, en este orden
1. ~~Crear usuarios QA~~ HECHO 19-nov: `node reset-staging/create-users.js` (con
   `set -a; source ~/.qa-lab.env; set +a`) -> 8 OK; perfiles con roles/squads/subroles correctos
   y login por contraseña 200 en staging. Es idempotente: re-ejecutarlo resetea contraseña y perfil.
2. ~~seed + reset~~ HECHO 19-nov: `npm run reset-staging` en shared (JS con service key, sin SQL
   ni contraseña de BD -> vale igual en GitHub Actions; necesita STG_URL, STG_SECRET_KEY,
   QA_PASSWORD). Asegura usuarios, vacía las 8 tablas de datos y carga: QA MAD · Partida próxima
   (+10 d), QA FOE · Partida próxima (+10 d), QA FOE · MilSim próxima (+20 d, x1.5), QA FOE ·
   Partida en menos de 48 h (+24 h, player_foe inscrito -> TC-C02), QA FOE · Partida finalizada
   (-7 d, player_foe y admin_foe con asistencia), y 1 votación general de la Junta Directiva.
   Salvaguardas: solo URL del staging y aborta si hay perfiles no-QA. Verificado por RLS con login
   real: superadmin 5 eventos/1 votación; admin_foe 4/1; player_foe 4/0; admin_mad y player_mad
   1/0; blocked y sinequipo 0/0. Pendiente: no limpia ficheros de Storage (solo filas).
3. ~~Demo en Vercel~~ HECHO 19-nov: proyecto Vercel `tactical-calendar-demo` (2º proyecto del repo
   Airsoft-Tactical-Calendar, rama main) -> https://tactical-calendar-demo.vercel.app, con
   VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY del STAGING y VITE_ENABLE_QA_LOGIN=true. Verificado:
   el bundle lleva el ref del staging y su anon key (no la secret); login QA por data-testid
   (qa-email-input, qa-password-input, qa-login-btn); player_mad ve 1 partida, player_foe 4.
   Su cron /api/keep-alive (cada 3 días) mantiene vivo el staging. targets.base_url y el secret
   TARGET_BASE_URL de qa-playwright apuntan al demo; run por la API -> finished 1/1.
   OJO: https://airsoft-tactical-calendar.vercel.app es PROD (ref eczgrfvmeksvqjrphkwg) y
   …-sahueson.vercel.app son previews con login de Vercel: NUNCA tests contra ellas, y no tocar
   las variables de ese proyecto. Tras cambiar variables en Vercel hay que hacer Redeploy (Vite
   las hornea en el build).
4. ~~GITHUB_TOKEN + probar POST /api/runs~~ HECHO 19-nov: token fine-grained con Actions
   read/write en todos los qa-* (si se crea un repo nuevo hay que añadirlo al token o el
   dispatch da 403 "Resource not accessible by personal access token"). Circuito API -> GitHub -> Supabase
   verificado: 201, run finished con github_run_url, summary, test_results y run_events.
5. ~~Playwright~~ HECHO 19/20-nov: 9 suites, 70 tests, 70/70 en local contra el demo (3,1 min)
   (a-auth 13, b-eventos 13, c-inscripciones 7, d-asistencia 5, e-gobernanza 8, f-excedencias 5,
   g-jugadores 7, h-calendario 7, i-normas 5; todas registradas en `suites` del lab y en
   supabase/seed.sql con estimated_seconds medido). Cada suite B-I hace
   resetStaging() en beforeAll (parte del seed; no depende del orden). Esperas:
   app.waitForQuietNetwork() (cuenta peticiones en vuelo) — NO usar waitForLoadState
   ("networkidle"): en una SPA solo ocurre una vez por navegación y luego no espera nada.
   El seed (shared reset.js) tiene datos específicos por suite: partidas C (inscripción abierta
   con uniforme Tiger Stripe, cancelada, pasada abierta, MAD en excedencia), D (MilSim pasada;
   asistencia exacta player_foe 29 % 1/3,5, junta2 60 % 1,5/2,5 con excedencia), E (5
   expedientes a falta del voto de junta2 + faltas previas para escalados), F (solicitudes
   pendientes de player_foe y de admin_foe), B (MAD a editar, a eliminar y cerrada con
   player_mad), H (un día sin partida FOE +25..26 y otro MAD +27). I sube sus PDF en el test;
   el reset borra filas de team_documents Y sus ficheros del bucket privado. ensureUsers fija
   siempre is_blocked/is_super_admin=false salvo lo que diga users.json (la suite G bloquea y
   asciende). Junta Directiva = superadmin, admin_foe, junta2.
   Desbloqueo de actas (RPC request/approve/cancel_event_unlock): aprueban todos los
   responsables menos quien pide: MAD = super admin (1); FOE = super admin + admin/Junta
   Operativa del FOE (2 si pide admin_foe). Cancelar: solo quien pidió o el super admin.
   loginAs() admite cambiar de usuario dentro de un test (borra localStorage y recarga).
   playerCard(nick) admite los sufijos " [BLOQUEADO]" y " (Tú)" del título de la ficha.
   Formulario de fechas sin partida: "Hasta" lleva min="Desde" -> el navegador bloquea el envío
   y el mensaje de la app ("La fecha de fin no puede ser anterior...") nunca llega a salir.
   El aviso "No tienes «X» marcada" solo sale si la ficha tiene alguna equipación marcada.
   Detalle de la base: tests/a-auth/{auth,rbac}.spec.ts, tests/b-eventos/eventos.spec.ts, fixtures/qa.ts
   (loginAs con users.json de shared + espera de 1,5 s sin peticiones), pages/app-page.ts,
   global-setup.ts (reserva el staging -> reset -> teardown libera). retries 0 (los tests mutan
   el staging). CI sube como artefacto solo capturas .png de fallos (las trazas llevan la
   contraseña QA y el repo es público). Local: `ln -s ../ivan-qa-lab-shared shared` (gitignored)
   y `set -a; . ~/.qa-lab.env; set +a; BASE_URL=https://tactical-calendar-demo.vercel.app npx
   playwright test` (el BASE_URL de ~/.qa-lab.env es la preview git-dev, NO el demo). Con
   --reporter=list/dot NO corre qa-lab-reporter (result.json queda viejo). Tests contra
   origin/main del calendario (lo que despliega el demo), nunca la copia local (otro agente la
   edita).
   RESERVA DEL STAGING (staging_lock, migración 20261119020000): toda ejecución (web/CI, local,
   otro agente, `npm run reset-staging`) reserva con shared/reset-staging/lock.js antes de
   resetear; atómica, TTL 3 min renovado cada minuto mientras vive el proceso (antes 10 min
   fijos: la suite completa del otro agente tardó 14,7 min y la reserva caducó a mitad), espera
   hasta 5 min y luego falla claro. La API responde
   409 si está reservado. Credenciales: SUPABASE_URL/SUPABASE_SERVICE_KEY (CI) o
   LAB_URL/LAB_SERVICE_KEY (~/.qa-lab.env). Sin ella, dos ejecuciones simultáneas se resetean
   el staging mutuamente (causó fallos intermitentes de TC-B02).
   Bugs de la app encontrados (pasados al agente del calendario):
   (a) RLS "Lectura de perfiles por unidad": el bloqueado no podía leer su propio perfil ->
       "Pendiente de asignación" en vez de "Acceso denegado". CORREGIDO en staging (¿PROD?).
   (b) Doble loadCloudData tras el login: la 2ª carga pisaba un cambio guardado. CORREGIDO
       (cbf909b); workaround retirado.
   (c) EventDetailModal: al abrirse lanza loadCloudData y el efecto que inicializa el borrador
       de asistencia depende de `registrations` -> si el admin marca casillas antes de que
       termine la recarga, se borran sin avisar, se guarda attended=false con toast de éxito y
       la partida queda BLOQUEADA con la asistencia mal. CORREGIDO (bfdc0e2, en main con
       545128c); TC-D05 es su regresión (retrasa 1,5 s la recarga y marca antes). Ojo: en el
       primer pintado del modal el borrador está vacío (casilla desmarcada un instante): esperar
       el estado inicial antes de tocar una casilla.
   (d) RLS team_blackouts (baseline_prod.sql 450-464): `squad = 'ALL'` pasa para cualquier
       admin -> un admin de un solo equipo crea Y borra días sin partida de "Ambos equipos" por
       API (la UI lo oculta, TC-H03). CONFIRMADO en STG el 20-nov con sesión de admin_mad
       (insert ALL 201; delete del ALL del super admin 200; control FOE 403). PENDIENTE (agente
       del calendario). Cuando haya suite de API, test de regresión.
   Desde cbf909b la lógica FOE vive en la BD: close_foe_poll (recuento, sanción y escalado),
   request/approve/cancel_event_unlock, votos anónimos solo legibles por su autor, bucket
   team-documents privado; FOE: solo la Junta Operativa crea partidas.
   EVIDENCIAS (19-nov): fixtures/qa.ts hace una captura JPEG (calidad 60, ~30-60 KB, <1 MB por
   ejecución) al final de cada test; el reporter la sube con shared uploadEvidence al bucket
   público `evidence` (runs/<run_id>/<slug-del-test>.jpg) y rellena test_results.evidence_url;
   enmascara QA_PASSWORD en errores; pruneEvidence() borra al final las de runs con >14 días.
   NUNCA se publican trazas, vídeos ni logs (llevan contraseña y tokens). Solo sube en CI (con
   RUN_ID); en local no. Verificado en CI: 6/6 con 6 URLs 200.
   Para pruebas repetidas desde la API: el límite 3/h por IP muerde; en desarrollo se libera
   borrando run_requests propias (BD del lab, service key).
   SELENIUM: HECHO 20-nov. Un solo repo, qa-selenium:
   - java/: Java 21 + JUnit 6 + Maven; suites = @Tag -> `mvn test -Dgroups=a-auth`.
   - python/: Python 3.12 + pytest; suites = carpetas -> `pytest tests/a-auth`.
   Mismos 70 casos y nombres que Playwright (9 suites): 70/70 en local contra el demo en
   los dos lenguajes (Python 3 min 51 s, Java 3 min 56 s; Playwright 3 min 07 s).
   CI vía la web: la suite A 13/13 en ambos (Python 92 s, Java 81 s).
   Un workflow por lenguaje (run-tests-java.yml, run-tests-python.yml) en ubuntu-latest sin
   contenedor: trae Chrome y Selenium Manager pone el chromedriver.
   En `tools` hay dos herramientas (selenium-java, selenium-python), mismo repo,
   live_execution=true. Sus 9 suites tienen estimated_seconds = el de Playwright + 10 s.
   Piezas nuevas en shared, que valen para cualquier herramienta que no sea Node:
   - reset-staging/with-staging.js -- <cmd>: reserva + reset + tests + libera; el hijo hereda
     QA_LOCK_HELD=1 y reset.js no vuelve a pedir la reserva;
   - publish-results.js result.json: sube las evidence_path, tapa QA_PASSWORD y cierra el run.
   Cada suite resetea al empezar (Java: @BeforeAll en cada clase; Python: fixture de módulo).
   Script inyectado por CDP (Page.addScriptToEvaluateOnNewDocument), window.__qa, envuelve fetch:
   - cuenta en vuelo/total -> waitForQuietNetwork y openEvent (espera la petición lanzada tras
     el clic);
   - retraso opcional de GET (`__qa.delay = {pattern, ms}`) -> TC-D05;
   - guarda la apikey pública -> TC-I02 pregunta a Storage.
   Diferencias con Playwright que hubo que resolver:
   - getText()/.text es texto renderizado (CSS uppercase -> "QA JUGADOR MAD"): comparar con
     textContent, como toContainText;
   - React parte en varios nodos los textos con variables ("…(iniciada por", " ", "QA Admin
     MAD", ")"): buscar el elemento más interno cuyo texto completo lo contiene (como
     getByText), no text()[contains()];
   - sin getByRole: XPath por texto visible (button("…"), heading("…"));
   - inputs date/time: setter nativo + eventos input/change (send_keys depende del idioma);
   - sin auto-wait: cada comprobación es una espera explícita de 10 s.
   Secretos del repo: los mismos 6 que qa-playwright. El primer intento dejó vacío
   SUPABASE_SERVICE_KEY, y entonces el job ni siquiera puede marcar el run como fallido y se
   queda en `queued`: se cerró a mano.
   Gotcha de Playwright: si un test falla, Playwright reinicia el worker y vuelve a ejecutar el
   beforeAll (resetStaging) para los tests siguientes, y borra lo que hubieran creado los
   anteriores.
   Gotcha de Storage: tras borrar un fichero, su enlace firmado puede seguir sirviéndose desde la
   CDN hasta ~60 s. Para comprobar el borrado se pide un enlace nuevo al servidor (TC-I02).
   Después: Cucumber (C y E en Given/When/Then),
   Newman/Bruno/Karate (suite D y comprobación de RLS por API), Appium al final (resultados pregrabados).
6. Solo cuando las herramientas funcionen: la web (home, página de herramienta con selector y botón
   Lanzar, pantalla en vivo con Realtime, resultados con métricas), Turnstile, ping keep-alive
   a ambos proyectos Supabase (se pausan a los 7 días sin actividad).
   Referencia visual que pasó Iván (20-nov): https://www.threads.com/share/_9wj4GkUH
   (post de @_code_and_chill_, "Architecture studio planner dashboard", React; es un vídeo).
   No se ha podido ver el diseño desde aquí (la descarga solo trae el texto del post): antes de
   maquetar, pedir a Iván capturas o una descripción de lo que le gusta de él.
   SELECTOR CON TIEMPO ESTIMADO (idea de Iván, 20-nov):
   - Cada herramienta tiene sus tests etiquetados por funcionalidad (login, roles, partidas,
     inscripciones, asistencia, gobernanza, excedencias, jugadores, calendario, normas...).
   - En la web se marcan o desmarcan funcionalidades, suites y tests sueltos.
   - Cada test lleva su duración media medida (agregar test_results.duration_ms por nombre).
   - Un contador ("esto tardará ~X, ¿lo lanzas?") sube al marcar y baja al desmarcar.
   Implica:
   - tags homogéneos en todas las herramientas (Playwright: `tag: ['@login']`);
   - que POST /api/runs acepte una selección de tags o tests, no solo la suite;
   - que el workflow filtre (Playwright: `--grep`).
   Límites: expire_stale_runs (15 min) y la reserva del staging.
   TIEMPOS PARA EL CONTADOR: HECHO 20-nov, medidos en CI contra STG (una ejecución por suite;
   es una media aproximada). Tabla por test y por suite en docs/tiempos-ejecucion.md.
   Fórmula: total ≈ FIJO (~39 s: cola de GitHub ~5 + arranque del job ~30 + cierre ~5)
   + PREPARACIÓN (~21 s: reserva + reset + arranque de la herramienta)
   + la suma de los tests marcados.
   En CI los tests van ~1,6 veces más lentos que en local.
   suites.estimated_seconds = total del visitante medido en CI: entre 70 s (g) y 105 s (i).
   Método para volver a medir:
   - test_results.duration_ms por test (runs de CI);
   - tramos del job con `env -u GITHUB_TOKEN gh api repos/<repo>/actions/runs/<id>/jobs`
     (el id sale de runs.github_run_url);
   - completed_at del job puede venir vacío si se lee justo al acabar: usar total - paso de tests.

## Reglas de trabajo
- `gh` con el .env.local cargado usa su GITHUB_TOKEN (solo Actions) y da 403 en secrets: usar
  `env -u GITHUB_TOKEN gh ...` para operar con la sesión del keyring.
- A GitHub (repos públicos) solo se sube lo necesario para que funcione. Nada sensible: ni claves,
  ni contraseñas, ni volcados de esquema/datos de PROD o staging (reset-staging/schema*.sql están
  en .gitignore y se quedan en local).
- Commits con ivancabanillas93@gmail.com (git config local de cada repo; el global es el de Génexys).
- Una herramienta cada vez; primero funciona en local con result.json normalizado, luego workflow, luego web.
- Nunca imprimir ni commitear claves. Secretos en ~/.qa-lab.env (incluye LAB_*/STG_* keys,
  BASE_URL y QA_* de usuarios; ya no hay .env en la raíz de ivan-qa-lab/) (fuera de los repos, chmod 600) y
  en GitHub Secrets / variables de Vercel. SUPABASE_SERVICE_KEY solo en servidor, nunca NEXT_PUBLIC_.
- Antes de cualquier comando que escriba en una base de datos, comprobar que el ref es el del staging.
- Contraseñas de base de datos sin símbolos (# % & @ / :) para que no rompan las cadenas de conexión.
- Formato de resultados común (shared/schema): tool, target, suite, started_at, finished_at,
  duration_ms, summary{total,passed,failed,skipped}, tests[{name,status,duration_ms,role,error,evidence_url}].
- Pegar heredocs largos en el terminal corrompe archivos: mejor que Claude Code los escriba directamente.
## Rediseño de la web (referencia visual "Talmo", vídeo de @_code_and_chill_, visto 20-nov)
Rama de trabajo: `wip/diseno-talmo` (un commit por cambio que funciona; subir siempre para poder seguir desde otro equipo).
Estilo de la referencia: fondo off-white, tarjetas blancas con borde fino y esquinas 16-24 px, negro puro como único acento
(estado activo, tarjeta destacada, panel de detalle), sin sombras, pastillas monocromas; el color solo en puntos de estado.
La web ya copia: cabecera con navegación en píldora, modo noche, botón negro "+ Nuevo Run", tarjeta KPI negra.
- HECHO 20-nov: sparkline blanca de tasa de éxito acumulada en la tarjeta negra de la home (app/page.tsx, SVG puro).
- HECHO 20-nov: Toast negro abajo en el centro (app/components/Toast.tsx + @keyframes toast-in en globals.css), usado para
  los errores de lanzamiento en RunSelector (409 ocupado, 429 límite, etc.). Tras un 201 la página navega a /runs/<id>, así
  que ahí no hay toast.
- HECHO 20-nov: panel negro "Último run" en la home (LastRunPanel en app/page.tsx): tarjeta interior con estado, fecha,
  tests y botón "Ver resultados"/"Ver en vivo", y lista de anteriores con punto de color. Sustituye a "Actividad reciente".
  Pide run_summary(total, passed, failed, duration_ms) en la consulta de runs. Un único `any` previo sigue en el mapeo de tools.
- HECHO 20-nov: "Mapa de suites" (app/components/SuiteGrid.tsx, debajo de los motores en la home): filas = herramientas,
  columnas = letra de la suite (A–I). Celda = último run de esa pareja: píldora negra si superado (✓ p/t), blanca con punto
  ámbar (con fallos) o rojo (fallido), punteada si nunca se ha lanzado, "·" si la herramienta no tiene esa suite (Cucumber
  solo C y E). Usa las últimas 80 runs; se guardan 4 por herramienta, así que muchas celdas salen "sin ejecutar".
- PENDIENTE, por orden: (1) gráficos de área/barras grises (última barra en negro) en la página de resultados;
  (2) buscador ⌘K en la cabecera (opcional).
- PENDIENTE de revisión de maquetación: hueco en la tarjeta "Motores" de la home, anchos de contenedor distintos entre
  páginas (home 7xl vs herramienta ~780 px), scroll interno en la lista de escenarios, contraste de textos secundarios,
  etiquetas de estado en inglés/mayúsculas, texto "Configurar tags y lanzar" (ya no hay tags), "Estabilidad 50%" por los
  fallos de i-normas en Selenium Python.
- Verificación visual: Claude in Chrome (extensión) funciona; el dev server (`next dev -p 3100`) debe reiniciarse si Tailwind
  deja de generar clases (síntoma: página negra sin estilos). Para probar errores sin lanzar un run real, sustituir
  `window.fetch` por un stub que devuelva 409 para POST /api/runs.
