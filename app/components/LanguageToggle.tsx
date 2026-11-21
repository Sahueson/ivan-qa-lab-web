'use client';

import { useRouter } from 'next/navigation';
import { LOCALE_COOKIE } from '@/lib/i18n';
import { useI18n } from './I18nProvider';

/** Botón ES/EN, como el de modo día/noche: guarda la elección en una cookie y recarga los datos del servidor. */
export default function LanguageToggle() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const next = locale === 'es' ? 'en' : 'es';

  const change = () => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  return (
    <button
      onClick={change}
      aria-label={t('Cambiar idioma')}
      title={locale === 'es' ? 'View in English' : 'Ver en español'}
      className="h-10 px-3 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-semibold tracking-wide text-[var(--text-primary)] hover:scale-105 transition cursor-pointer"
    >
      {next.toUpperCase()}
    </button>
  );
}
