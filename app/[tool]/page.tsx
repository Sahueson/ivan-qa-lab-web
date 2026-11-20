import { Suspense } from 'react';
import RunSelector from '@/app/components/RunSelector';

async function ToolContent({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const suiteSlug = 'a-auth';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold tracking-tight capitalize">
          {tool.replace('-', ' ')}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Selecciona los escenarios que quieres incluir en la cola de ejecución
        </p>
      </div>
      <RunSelector toolSlug={tool} suiteSlug={suiteSlug} />
    </div>
  );
}

export default function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  return (
    <main className="pb-12">
      <Suspense fallback={<div className="max-w-4xl mx-auto p-8 text-sm text-[var(--text-secondary)]">Cargando selector...</div>}>
        <ToolContent params={params} />
      </Suspense>
    </main>
  );
}