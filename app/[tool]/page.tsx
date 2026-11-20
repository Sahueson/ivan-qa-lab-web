import { Suspense } from 'react';
import { getAdminClient } from '@/lib/supabase/admin';
import RunSelector from '@/app/components/RunSelector';

async function ToolContent({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const suiteSlug = 'a-auth';
  const db = getAdminClient();

  const { data: tools } = await db.from('tools').select('slug, name');
  const slugs = (tools || []).map((t) => t.slug);

  const isSelenium = tool.startsWith('selenium');

  // Detecta el slug exacto en Supabase (soporta 'selenium-python' o 'selenium' clásico)
  const pythonSlug = slugs.includes('selenium-python')
    ? 'selenium-python'
    : slugs.includes('selenium')
    ? 'selenium'
    : 'selenium-python';

  const javaSlug = slugs.includes('selenium-java') ? 'selenium-java' : 'selenium-java';

  const seleniumVariants = isSelenium
    ? [
        { id: 'python', label: 'Python', slug: pythonSlug },
        { id: 'java', label: 'Java', slug: javaSlug },
      ]
    : undefined;

  const initialToolSlug =
    tool === 'selenium-java'
      ? javaSlug
      : isSelenium
      ? pythonSlug
      : tool;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold tracking-tight capitalize">
          {isSelenium ? 'Selenium' : tool.replace('-', ' ')}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Selecciona el stack y los escenarios que quieres incluir en la cola de ejecución
        </p>
      </div>

      <RunSelector
        initialToolSlug={initialToolSlug}
        suiteSlug={suiteSlug}
        variants={seleniumVariants}
      />
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