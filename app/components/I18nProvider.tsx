'use client';

import { createContext, useCallback, useContext, useEffect } from 'react';
import { translate, type Locale, type Vars } from '@/lib/i18n';

const I18nContext = createContext<{ locale: Locale; t: (es: string, vars?: Vars) => string }>({
  locale: 'es',
  t: (es, vars) => translate('es', es, vars),
});

// El servidor decide el idioma (cookie) y lo pasa aquí: el HTML y la hidratación coinciden siempre.
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const t = useCallback((es: string, vars?: Vars) => translate(locale, es, vars), [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <I18nContext.Provider value={{ locale, t }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
export const useT = () => useContext(I18nContext).t;
