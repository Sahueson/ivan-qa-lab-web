'use client';

import { useT } from './I18nProvider';

export default function PrintButton() {
  const t = useT();
  return (
    <button onClick={() => window.print()} className="print:hidden px-4 py-2 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-sm font-medium hover:opacity-80 transition cursor-pointer">
      {t('Imprimir / guardar PDF')}
    </button>
  );
}
