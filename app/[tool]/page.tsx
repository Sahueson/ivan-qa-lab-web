import { Suspense } from 'react';
import RunSelector from '@/app/components/RunSelector';

async function ToolContent({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const suiteSlug = 'a-auth';

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 capitalize">
        Laboratorio QA - {tool.replace('-', ' ')}
      </h1>
      <RunSelector toolSlug={tool} suiteSlug={suiteSlug} />
    </div>
  );
}

export default function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <Suspense fallback={<div className="max-w-4xl mx-auto p-8 text-center text-gray-500">Cargando laboratorio...</div>}>
        <ToolContent params={params} />
      </Suspense>
    </main>
  );
}