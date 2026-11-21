// Traducción mínima sin librerías: el texto de la web está escrito en español y la clave ES el propio texto en español.
// En inglés se busca en EN; si falta, se enseña el español (nunca se rompe nada). Las variables se escriben {nombre}.
export type Locale = 'es' | 'en';
export const LOCALE_COOKIE = 'qa-lang';

export type Vars = Record<string, string | number>;

import { EN } from './i18n-en';

export function translate(locale: Locale, es: string, vars?: Vars): string {
  let out = locale === 'en' ? EN[es] ?? es : es;
  if (vars) out = out.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
  return out;
}

/** Código de idioma para fechas y números. */
export const dateLocale = (locale: Locale) => (locale === 'en' ? 'en-GB' : 'es-ES');
