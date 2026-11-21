'use client';

import { useT } from './I18nProvider';
import { useEffect } from 'react';

type Props = {
  message: string | null;
  onClose: () => void;
  /** Milisegundos hasta que se oculta solo. */
  duration?: number;
  tone?: 'info' | 'error';
};

// Aviso flotante abajo en el centro: píldora negra, como el toast del diseño de referencia (Talmo).
export default function Toast({ message, onClose, duration = 6000, tone = 'info' }: Props) {
  const t = useT();
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onClose, duration);
    return () => clearTimeout(id);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 pointer-events-none">
      <div
        role={tone === 'error' ? 'alert' : 'status'}
        className="pointer-events-auto flex items-center gap-3 max-w-md rounded-full bg-[var(--bg-hero)] text-[var(--text-hero)] border border-white/10 shadow-lg pl-4 pr-2 py-2 text-sm animate-[toast-in_0.2s_ease-out]"
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${tone === 'error' ? 'bg-red-400' : 'bg-emerald-400'}`}
          aria-hidden
        />
        <span className="leading-snug">{message}</span>
        <button
          onClick={onClose}
          aria-label={t('Cerrar aviso')}
          className="ml-1 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium transition cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
