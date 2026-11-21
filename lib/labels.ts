// Estados en español para mostrar en la web (los valores de la base de datos siguen en inglés).
export const RUN_STATUS: Record<string, string> = {
  waiting: 'En cola',
  queued: 'Lanzando',
  running: 'En curso',
  finished: 'Terminada',
  failed: 'Fallida',
  timeout: 'Caducada',
};
export const TEST_STATUS: Record<string, string> = { passed: 'Pasa', failed: 'Falla', skipped: 'Omitido' };
export const runStatusLabel = (s: string) => RUN_STATUS[s] ?? s;
export const testStatusLabel = (s: string) => TEST_STATUS[s] ?? s;
