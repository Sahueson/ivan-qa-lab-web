import 'server-only';
import { cookies, headers } from 'next/headers';
import { LOCALE_COOKIE, translate, type Locale, type Vars } from './i18n';

/** Idioma del visitante: su elección (cookie); si no ha elegido, el de su navegador (inglés si empieza por "en"), si no español. */
export async function getLocale(): Promise<Locale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (saved === 'en' || saved === 'es') return saved;
  const accept = (await headers()).get('accept-language') ?? '';
  return /^en/i.test(accept) ? 'en' : 'es';
}

/** Para componentes de servidor: const { t, locale } = await getT(); */
export async function getT() {
  const locale = await getLocale();
  return { locale, t: (es: string, vars?: Vars) => translate(locale, es, vars) };
}
