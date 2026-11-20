import { Suspense } from 'react';
import { getAdminClient } from '@/lib/supabase/admin';
import RunSelector, { DiscoveredTest, SuiteItem } from '@/app/components/RunSelector';

function normalizeRepo(repo: string): string {
  return repo
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '')
    .trim();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function discoverTestsFromGitHub(
  githubRepo: string | null | undefined,
  toolSlug: string,
  suites: SuiteItem[]
): Promise<DiscoveredTest[]> {
  if (!githubRepo) return [];
  const cleanRepo = normalizeRepo(githubRepo);
  if (!cleanRepo.includes('/')) return [];

  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
  };

  try {
    // 1. Obtener rama por defecto del repositorio
    const repoRes = await fetch(`https://api.github.com/repos/${cleanRepo}`, {
      headers,
      next: { revalidate: 300 },
    });
    if (!repoRes.ok) return [];
    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch || 'main';

    // 2. Obtener árbol de archivos
    const treeRes = await fetch(
      `https://api.github.com/repos/${cleanRepo}/git/trees/${defaultBranch}?recursive=1`,
      { headers, next: { revalidate: 300 } }
    );
    if (!treeRes.ok) return [];
    const treeData = await treeRes.json();
    const files: { path: string; type: string }[] = treeData.tree || [];

    const isPython = toolSlug.includes('python');
    const isJava = toolSlug.includes('java');

    const testFiles = files
      .filter((f) => {
        if (f.type !== 'blob') return false;
        if (isJava) return /Test\.java$/.test(f.path);
        if (isPython) return /(^|\/)test_.*\.py$|_test\.py$/.test(f.path);
        return /\.(spec|test)\.(ts|js|tsx|jsx)$/.test(f.path);
      })
      .slice(0, 35);

    const discovered: DiscoveredTest[] = [];

    // 3. Leer contenido de los ficheros de test en paralelo
    await Promise.all(
      testFiles.map(async (file) => {
        const contentRes = await fetch(
          `https://api.github.com/repos/${cleanRepo}/contents/${encodeURIComponent(file.path)}?ref=${defaultBranch}`,
          { headers, next: { revalidate: 300 } }
        );
        if (!contentRes.ok) return;
        const fileJson = await contentRes.json();
        if (!fileJson.content) return;

        const content = Buffer.from(fileJson.content, 'base64').toString('utf-8');

        // Detectar a qué suite pertenece según la ruta del archivo
        const lowerPath = file.path.toLowerCase();
        const matchedSuite = suites.find((s) => {
          if (s.slug === 'all') return false;
          const shortSlug = s.slug.replace(/^[a-z]-/, '');
          // Playwright y Python: carpeta tests/a-auth/; Java: paquete tests/a_auth/.
          return lowerPath.includes(s.slug.toLowerCase()) || lowerPath.includes(s.slug.toLowerCase().replace(/-/g, '_'))
            || (shortSlug.length > 2 && lowerPath.includes(shortSlug));
        });

        if (isJava) {
          // Nombre visible = @DisplayName("TC-A01 ...") (el mismo que en Playwright); el filtro
          // (grep) usa el nombre del método (tcA01_...), que es lo que entiende surefire.
          const javaRegex = /@Test\b((?:(?!@Test\b)[\s\S]){0,400}?)(?:public\s+)?void\s+([a-zA-Z0-9_]+)\s*\(/g;
          let m: RegExpExecArray | null;
          while ((m = javaRegex.exec(content)) !== null) {
            const displayName = m[1].match(/@DisplayName\(\s*"([^"]+)"\s*\)/)?.[1];
            const methodName = m[2];
            discovered.push({
              id: `${file.path}:${methodName}`,
              name: displayName ?? methodName.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim(),
              grepValue: methodName,
              suiteSlug: matchedSuite?.slug,
              duration: 4.0,
              filePath: file.path,
            });
          }
        } else if (isPython) {
          // Nombre visible = @pytest.mark.case("TC-A01 ...") (el mismo que en Playwright); el
          // filtro (grep) usa el nombre de la función (test_tc_a01_...), que es lo que entiende -k.
          const pyRegex = /(?:@pytest\.mark\.case\(\s*"([^"]+)"\s*\)\s*\n(?:\s*@[^\n]*\n)*)?\s*def\s+(test_[a-zA-Z0-9_]+)\s*\(/g;
          let m: RegExpExecArray | null;
          while ((m = pyRegex.exec(content)) !== null) {
            const caseName = m[1];
            const fnName = m[2];
            discovered.push({
              id: `${file.path}:${fnName}`,
              name: caseName ?? fnName.replace(/^test_/, '').replace(/_/g, ' '),
              grepValue: fnName,
              suiteSlug: matchedSuite?.slug,
              duration: 4.0,
              filePath: file.path,
            });
          }
        } else {
          // Playwright (.spec.ts / .spec.js)
          const pwRegex = /\b(?:test|it)(?:\.(?:only|skip))?\s*\(\s*(['"`])([\s\S]*?)\1/g;
          let m: RegExpExecArray | null;
          while ((m = pwRegex.exec(content)) !== null) {
            const title = m[2].trim();
            if (!title) continue;
            const tagMatch = title.match(/@[a-zA-Z0-9_-]+/);
            discovered.push({
              id: `${file.path}:${title}`,
              name: title,
              grepValue: escapeRegex(title),
              tag: tagMatch ? tagMatch[0] : undefined,
              suiteSlug: matchedSuite?.slug,
              duration: 3.5,
              filePath: file.path,
            });
          }
        }
      })
    );

    return discovered.sort((a, b) => a.id.localeCompare(b.id));
  } catch {
    return [];
  }
}

async function ToolContent({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const db = getAdminClient();

  const { data: tools } = await db.from('tools').select('*');
  const allTools = tools || [];
  const slugs = allTools.map((t) => t.slug);

  const isSelenium = tool.startsWith('selenium');

  const pythonSlug = slugs.includes('selenium-python')
    ? 'selenium-python'
    : slugs.includes('selenium')
    ? 'selenium'
    : 'selenium-python';

  const javaSlug = 'selenium-java';

  const seleniumVariants = isSelenium
    ? [
        { id: 'python', label: 'Python', slug: pythonSlug },
        { id: 'java', label: 'Java', slug: javaSlug },
      ]
    : undefined;

  const initialToolSlug =
    tool === 'selenium-java' ? javaSlug : isSelenium ? pythonSlug : tool;

  const targetSlugs = isSelenium ? [pythonSlug, javaSlug] : [tool];
  const relevantTools = allTools.filter((t) => targetSlugs.includes(t.slug));
  const relevantToolIds = relevantTools.map((t) => t.id);

  // Cargar todas las suites registradas en Supabase para estas herramientas
  const { data: suitesData } = relevantToolIds.length > 0
    ? await db
        .from('suites')
        .select('*')
        .in('tool_id', relevantToolIds)
        .order('slug', { ascending: true })
    : { data: [] };

  const suitesByTool: Record<string, SuiteItem[]> = {};
  const testsByTool: Record<string, DiscoveredTest[]> = {};

  await Promise.all(
    targetSlugs.map(async (slug) => {
      const toolRow = allTools.find((t) => t.slug === slug);
      const toolSuites: SuiteItem[] = (suitesData || [])
        .filter((s: any) => s.tool_id === toolRow?.id)
        .map((s: any) => ({
          id: s.id,
          slug: s.slug,
          name: s.name || s.slug,
        }));

      suitesByTool[slug] = toolSuites;
      testsByTool[slug] = await discoverTestsFromGitHub(
        toolRow?.github_repo,
        slug,
        toolSuites
      );
    })
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold tracking-tight capitalize">
          {isSelenium ? 'Selenium' : tool.replace('-', ' ')}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Elige una suite completa o filtra escenarios individuales para lanzar en el runner
        </p>
      </div>

      <RunSelector
        initialToolSlug={initialToolSlug}
        variants={seleniumVariants}
        suitesByTool={suitesByTool}
        testsByTool={testsByTool}
      />
    </div>
  );
}

export default function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  return (
    <main className="pb-12">
      <Suspense fallback={<div className="max-w-5xl mx-auto p-8 text-sm text-[var(--text-secondary)]">Cargando suites y casos de prueba...</div>}>
        <ToolContent params={params} />
      </Suspense>
    </main>
  );
}