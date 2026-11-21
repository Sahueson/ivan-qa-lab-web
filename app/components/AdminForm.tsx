'use client';

import { useActionState } from 'react';
import type { FormState } from '@/app/bugs/actions';

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export const inputCls =
  'w-full rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] px-3 py-2 text-sm';

/** Formulario con la clave del dueño: la lectura es pública, escribir exige QA_ADMIN_KEY. */
export default function AdminForm({
  action, children, submit,
}: { action: Action; children: React.ReactNode; submit: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, undefined);
  return (
    <form action={formAction} className="space-y-3">
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <input type="password" name="clave" required placeholder="Clave de administración" autoComplete="off" className={`${inputCls} sm:max-w-xs`} />
        <button disabled={pending} className="px-4 py-2 rounded-full bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] text-sm font-medium disabled:opacity-60 cursor-pointer">
          {pending ? 'Guardando…' : submit}
        </button>
      </div>
      {state?.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
    </form>
  );
}
