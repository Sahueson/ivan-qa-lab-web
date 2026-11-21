export const ESTADOS: Record<string, string> = { abierto: 'Abierto', en_progreso: 'En progreso', resuelto: 'Resuelto', cerrado: 'Cerrado' };
export const SEVERIDADES: Record<string, string> = { baja: 'Baja', media: 'Media', alta: 'Alta', critica: 'Crítica' };
export const TIPOS: Record<string, string> = { comentario: 'Comentario', resolucion: 'Resolución', reapertura: 'Reapertura' };

export const estadoCls = (s: string) =>
  s === 'abierto' ? 'bg-red-500/15 text-red-600 dark:text-red-400'
  : s === 'en_progreso' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
  : s === 'resuelto' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
  : 'bg-[var(--bg-surface-muted)] text-[var(--text-secondary)]';
