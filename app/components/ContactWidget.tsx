'use client';

import { useState } from 'react';
import { useT } from './I18nProvider';

// Datos de contacto públicos: se definen en variables NEXT_PUBLIC_* (Vercel / .env.local).
// Si falta alguno, esa opción no se muestra; si faltan todos, no aparece el widget.
const PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim(); // p. ej. +34600000000
const WHATSAPP = (process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || PHONE || '').replace(/[^\d]/g, ''); // solo dígitos, con prefijo de país
const EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();

const ICONS = {
  tel: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  wa: (
    <>
      <path d="M3 21l1.7-5A9 9 0 1 1 8 19.3L3 21z" />
      <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .7a4 4 0 0 1-1.7-1.7l.7-1-1-2z" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
};

function Icon({ k, size = 22 }: { k: keyof typeof ICONS; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[k]}
    </svg>
  );
}

/** Contacto rápido en todas las páginas: píldora lateral en escritorio (A) y botón flotante que se abre en móvil (D). */
export default function ContactWidget() {
  const t = useT();
  const [open, setOpen] = useState(false);

  const items = [
    PHONE && { k: 'tel' as const, label: t('Llamar'), href: `tel:${PHONE}` },
    WHATSAPP && { k: 'wa' as const, label: 'WhatsApp', href: `https://wa.me/${WHATSAPP}` },
    EMAIL && { k: 'mail' as const, label: 'Email', href: `mailto:${EMAIL}` },
  ].filter(Boolean) as { k: keyof typeof ICONS; label: string; href: string }[];

  if (items.length === 0) return null;

  const external = (href: string) => (href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {});

  return (
    <div className="print:hidden">
      {/* Escritorio: píldora vertical pegada al borde derecho */}
      <nav
        aria-label={t('Contacto rápido')}
        className="hidden md:flex fixed right-4 top-1/2 -translate-y-1/2 z-40 flex-col gap-1.5 p-2 rounded-full bg-[var(--bg-hero)] text-[var(--text-hero)] border border-white/15"
      >
        {items.map((i) => (
          <a
            key={i.k}
            href={i.href}
            {...external(i.href)}
            aria-label={i.label}
            title={i.label}
            className="group relative flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/15 focus-visible:bg-white/15 focus-visible:outline-none transition-colors"
          >
            <Icon k={i.k} />
            <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
              {i.label}
            </span>
          </a>
        ))}
      </nav>

      {/* Móvil: botón flotante que abre las opciones hacia arriba */}
      <div className="md:hidden fixed right-4 bottom-4 z-40 flex flex-col items-end gap-2">
        {open &&
          items.map((i) => (
            <a
              key={i.k}
              href={i.href}
              {...external(i.href)}
              className="flex items-center gap-2.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] py-2 pl-2 pr-4 text-sm font-semibold"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-hero)] text-[var(--text-hero)]">
                <Icon k={i.k} size={18} />
              </span>
              {i.label}
            </a>
          ))}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={t('Contacto rápido')}
          className="flex h-14 items-center gap-2.5 rounded-full bg-[var(--bg-hero)] text-[var(--text-hero)] border border-white/15 pl-5 pr-6 text-sm font-semibold"
        >
          <Icon k="wa" />
          {open ? t('Cerrar') : t('¿Hablamos?')}
        </button>
      </div>
    </div>
  );
}
