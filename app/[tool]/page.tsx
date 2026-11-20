import RunSelector from '@/app/components/RunSelector';

// Le dice a Next.js que esta ruta se renderiza en tiempo real, no en el build estático
export const dynamic = 'force-dynamic';

export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const resolvedParams = await params;
  const toolSlug = resolvedParams.tool;
  const suiteSlug = 'a-auth'; 

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 capitalize">
          Laboratorio QA - {toolSlug.replace('-', ' ')}
        </h1>
        
        <RunSelector toolSlug={toolSlug} suiteSlug={suiteSlug} />
      </div>
    </main>
  );
}