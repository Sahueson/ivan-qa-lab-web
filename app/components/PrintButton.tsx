'use client';

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="print:hidden px-4 py-2 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-sm font-medium hover:opacity-80 transition cursor-pointer">
      Imprimir / guardar PDF
    </button>
  );
}
