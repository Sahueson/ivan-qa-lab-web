# Tiempos de ejecución medidos en CI (contra STG)

Medido el 20-nov-2026: una ejecución de cada suite de Playwright lanzada desde la API de la web
(GitHub Actions, `ubuntu-latest` + contenedor de Playwright, contra el demo de staging). Es una
media aproximada, suficiente para el contador "esto tardará ~X" de la web.
Los tests van ~1,6 veces más lentos que en local (234 s frente a 149 s en total) y, además, cada
ejecución paga ~1 min fijo (arranque de GitHub y preparación del staging).

## Cómo se calcula lo que espera el visitante

```
total ≈ FIJO + PREPARACIÓN + suma de los tests marcados
```

- **FIJO ≈ 39 s** (mediana; rango 31-41 s): cola de GitHub (~5 s),
  arranque del job (contenedor, checkout, `npm ci`: ~30 s) y cierre (subir resultados y capturas: ~5 s).
- **PREPARACIÓN ≈ 21 s** (mediana; rango 13-42 s): reserva + reset
  del staging + arranque de Playwright y los resets de `beforeAll` de cada suite.
- **Tests:** la duración de cada uno (tabla de abajo).

## Por suite

| Suite | Tests | Total visitante | Paso de tests | Suma de tests |
|---|---:|---:|---:|---:|
| a-auth | 13 | 78 s | 39 s | 25,9 s |
| b-eventos | 13 | 98 s | 67 s | 50,7 s |
| c-inscripciones | 7 | 100 s | 60 s | 28,9 s |
| d-asistencia | 5 | 77 s | 43 s | 19,9 s |
| e-gobernanza | 8 | 84 s | 45 s | 27,2 s |
| f-excedencias | 5 | 73 s | 39 s | 13,9 s |
| g-jugadores | 7 | 69 s | 37 s | 22,4 s |
| h-calendario | 7 | 83 s | 42 s | 20,9 s |
| i-normas | 5 | 106 s | 66 s | 24,3 s |

## Por test (segundos, CI)

| Suite | Test | s |
|---|---|---:|
| a-auth | TC-SMOKE La app carga y muestra el login QA | 0,4 |
| a-auth | TC-A01 Jugador con equipo entra y ve la navegación completa | 2,4 |
| a-auth | TC-A01b Usuario sin equipo queda pendiente de asignación | 1,9 |
| a-auth | TC-A02 Usuario bloqueado ve acceso denegado | 1,7 |
| a-auth | TC-A02b Usuario bloqueado no accede a ningún dato | 1,7 |
| a-auth | TC-A04 Contraseña incorrecta muestra error y no entra | 1,1 |
| a-auth | TC-A05 Cerrar sesión vuelve a la pantalla de login | 2,5 |
| a-auth | TC-A03 Editar la ficha de operador guarda equipaciones y roles | 4,0 |
| a-auth | TC-A06 Jugador MAD solo ve partidas MAD y no tiene pestaña FOE | 2,1 |
| a-auth | TC-A07 Jugador FOE ve las partidas FOE y ninguna MAD | 1,8 |
| a-auth | TC-A08 Super admin ve las partidas de ambos equipos | 2,3 |
| a-auth | TC-A09 Jugador FOE sin cargo no ve la Junta Directiva | 1,9 |
| a-auth | TC-A10 Miembro de la Junta Directiva ve su votación | 2,2 |
| b-eventos | TC-B01 Crear partida valida los campos obligatorios | 3,0 |
| b-eventos | TC-B01b Un admin crea una partida y aparece en la lista | 2,9 |
| b-eventos | TC-B02 Cancelar una partida sin contar asistencia | 4,0 |
| b-eventos | TC-B02b Cancelar una partida contando asistencia permite pasar lista | 3,8 |
| b-eventos | TC-B03 Cerrar el acta bloquea la partida en solo lectura | 3,8 |
| b-eventos | TC-B04 Un jugador no puede editar ni cancelar partidas ajenas | 3,1 |
| b-eventos | TC-B05 Un admin edita una partida de su equipo | 2,6 |
| b-eventos | TC-B06 Reactivar una partida cancelada | 3,5 |
| b-eventos | TC-B07 Eliminar una partida pide confirmación y la borra del servidor | 3,5 |
| b-eventos | TC-B08 Una partida cerrada no se puede editar ni eliminar desde la lista | 2,2 |
| b-eventos | TC-B09 Un jugador no puede pedir el desbloqueo de un acta | 3,0 |
| b-eventos | TC-B10 Desbloquear un acta MAD: la pide su admin y la aprueba el super admin | 5,9 |
| b-eventos | TC-B11 Desbloquear un acta FOE necesita a los otros dos responsables y se puede cancelar | 9,5 |
| c-inscripciones | TC-C01 Inscribirse preselecciona la equipación de la partida y avisa si no la tienes | 4,9 |
| c-inscripciones | TC-C07 Sin equipación en la partida se preselecciona la de la ficha del jugador | 4,0 |
| c-inscripciones | TC-C04 Darse de baja a más de 48 h libera la plaza | 4,4 |
| c-inscripciones | TC-C02 A menos de 48 h no se permite darse de baja | 3,5 |
| c-inscripciones | TC-C03 Con una excedencia aprobada no se puede inscribir en esas fechas | 3,9 |
| c-inscripciones | TC-C05 Una partida ya finalizada no admite inscripciones | 3,7 |
| c-inscripciones | TC-C06 Una partida cancelada no admite inscripciones | 4,6 |
| d-asistencia | TC-D01 El % anual se calcula sobre las partidas ya jugadas | 2,5 |
| d-asistencia | TC-D02 Una MilSim pesa x1,5 en la asistencia | 2,2 |
| d-asistencia | TC-D03 Las partidas durante una excedencia aprobada no restan | 2,4 |
| d-asistencia | TC-D04 Cerrar el acta con asistencia actualiza el % del jugador | 4,6 |
| d-asistencia | TC-D05 Una marca hecha nada más abrir la partida no se pierde con la recarga | 8,2 |
| e-gobernanza | TC-E01 La Junta Directiva abre un expediente sancionador | 2,7 |
| e-gobernanza | TC-E02 El propuesto para sanción queda recusado y no puede votar | 2,3 |
| e-gobernanza | TC-E03 El expediente se cierra solo al votar el último miembro habilitado | 4,3 |
| e-gobernanza | TC-E04 La 3ª falta leve en un año se escala a Grave | 4,4 |
| e-gobernanza | TC-E05 La 3ª falta grave en un año se escala a Muy Grave | 4,0 |
| e-gobernanza | TC-E06 Con mayoría en contra el expediente se cierra sin sanción | 3,5 |
| e-gobernanza | TC-E07 Solo quien convoca (o el super admin) puede cerrar una votación a mano | 2,1 |
| e-gobernanza | TC-E08 Quien convocó la votación puede cerrarla a mano | 3,8 |
| f-excedencias | TC-F01 Un jugador solicita una excedencia y queda pendiente de la Junta | 3,5 |
| f-excedencias | TC-F02 Una excedencia de menos de 1 mes se rechaza | 3,0 |
| f-excedencias | TC-F03 La Junta Directiva concede una solicitud pendiente | 2,8 |
| f-excedencias | TC-F04 Nadie puede concederse su propia excedencia | 2,2 |
| f-excedencias | TC-F05 Un jugador sin cargo no puede conceder excedencias | 2,4 |
| g-jugadores | TC-G01 El super admin asciende a un jugador a admin y este gestiona partidas | 4,1 |
| g-jugadores | TC-G02 El super admin bloquea a un jugador y este pierde el acceso | 4,2 |
| g-jugadores | TC-G03 Asignar equipo a un jugador sin equipo le da acceso a ese equipo | 3,8 |
| g-jugadores | TC-G04 Quitar la Junta Directiva a un miembro le oculta sus votaciones | 4,2 |
| g-jugadores | TC-G05 Un admin que no es super admin no puede cambiar permisos | 2,0 |
| g-jugadores | TC-G06 El super admin no puede cambiarse el rol ni bloquearse a sí mismo | 2,1 |
| g-jugadores | TC-G07 Un admin de equipo solo ve a los jugadores de su equipo | 2,1 |
| h-calendario | TC-H01 Un admin marca fechas sin partida para su equipo | 3,4 |
| h-calendario | TC-H02 La fecha de fin no puede ser anterior a la de inicio | 3,2 |
| h-calendario | TC-H03 Un admin de un solo equipo no puede marcar fechas para ambos | 2,4 |
| h-calendario | TC-H04 El super admin puede marcar fechas para ambos equipos | 2,6 |
| h-calendario | TC-H05 Cada equipo solo ve sus fechas y un jugador no puede quitarlas | 2,5 |
| h-calendario | TC-H06 Un admin quita las fechas de su equipo y no persisten al recargar | 4,4 |
| h-calendario | TC-H07 Un día sin partida se avisa al seleccionarlo en el calendario | 2,4 |
| i-normas | TC-I01 Subir unos estatutos: se ven con enlace firmado y la URL pública no los sirve | 4,4 |
| i-normas | TC-I02 Eliminar un documento borra también el fichero | 5,6 |
| i-normas | TC-I03 El formulario exige título y solo acepta PDF | 2,8 |
| i-normas | TC-I04 Un jugador ve las normas de su equipo pero no puede subir ni borrar | 5,6 |
| i-normas | TC-I05 Un jugador de otro equipo no ve las normas del FOE | 5,9 |

Nota: TC-I02 falló en esta medición (luego se corrigió el test). Su tiempo vale igual, y el
reset extra que hace Playwright tras un fallo infla un poco la preparación de i-normas.
Para volver a medir: `env -u GITHUB_TOKEN gh api repos/<repo>/actions/runs/<id>/jobs` para los
tramos del job y `test_results.duration_ms` para cada test (ver CLAUDE.md, paso 6).
