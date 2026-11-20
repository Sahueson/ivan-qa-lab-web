import Link from 'next/link';

export default function Home() {
  const tools = [
    { slug: 'playwright', name: 'Playwright', tech: 'Node.js + TypeScript' },
    { slug: 'selenium-python', name: 'Selenium', tech: 'Python 3.12 + Pytest' },
    { slug: 'selenium-java', name: 'Selenium', tech: 'Java 21 + JUnit 6' },
  ];

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold mb-4 text-center">Iván QA Lab</h1>
        <p className="text-lg text-gray-600 mb-12 text-center">
          Elige una herramienta de automatización, selecciona sobre qué probar y visualiza la ejecución en vivo.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <Link 
              key={tool.slug} 
              href={`/${tool.slug}`} 
              className="block p-6 bg-white border rounded-lg shadow-sm hover:shadow-md hover:border-blue-400 transition"
            >
              <h2 className="text-2xl font-semibold mb-2">{tool.name}</h2>
              <p className="text-gray-500 text-sm">{tool.tech}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}