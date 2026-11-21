import Link from 'next/link';
import AdminForm, { inputCls } from '@/app/components/AdminForm';
import { crearBug } from '../actions';

// Se puede abrir desde un test fallido (/bugs/nuevo?run=<id>&tool=newman&suite=a-auth&test=TC-A01...).
export default async function NuevoBugPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Nuevo bug</h1>
        <Link href="/bugs" className="text-sm text-[var(--text-secondary)] hover:underline">← Volver</Link>
      </div>
      <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6">
        <AdminForm action={crearBug} submit="Crear bug">
          <input name="title" required minLength={3} maxLength={160} placeholder="Título" defaultValue={q.test ? `Fallo en ${q.test}` : ''} className={inputCls} />
          <textarea name="description" rows={5} maxLength={4000} placeholder="Pasos para reproducir, resultado esperado y obtenido" className={inputCls} />
          <select name="severity" defaultValue="media" className={inputCls}>
            <option value="baja">Severidad baja</option>
            <option value="media">Severidad media</option>
            <option value="alta">Severidad alta</option>
            <option value="critica">Severidad crítica</option>
          </select>
          <div className="grid sm:grid-cols-2 gap-3">
            <input name="tool_slug" placeholder="Herramienta (p. ej. newman)" defaultValue={q.tool ?? ''} className={inputCls} />
            <input name="suite_slug" placeholder="Suite (p. ej. a-auth)" defaultValue={q.suite ?? ''} className={inputCls} />
          </div>
          <input name="test_name" placeholder="Test" defaultValue={q.test ?? ''} className={inputCls} />
          <input name="run_id" placeholder="Run (opcional)" defaultValue={q.run ?? ''} className={inputCls} />
          <input name="evidence_url" placeholder="Enlace a la evidencia (opcional)" defaultValue={q.evidence ?? ''} className={inputCls} />
        </AdminForm>
      </div>
    </div>
  );
}
