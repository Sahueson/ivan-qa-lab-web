'use client';
import { useState, useMemo } from 'react';

const AVAILABLE_TESTS = [
  { id: 'TC-A01', name: 'Login válido', duration: 3.2, tags: ['@login'] },
  { id: 'TC-B02', name: 'Crear partida', duration: 4.5, tags: ['@eventos'] },
];

const TIEMPO_FIJO = 39;
const TIEMPO_PREP = 21;

export default function RunSelector({ toolSlug, suiteSlug }: { toolSlug: string, suiteSlug: string }) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const estimatedTime = useMemo(() => {
    if (selectedTags.length === 0) return 0;
    const testSum = AVAILABLE_TESTS
      .filter(t => t.tags.some(tag => selectedTags.includes(tag)))
      .reduce((acc, test) => acc + test.duration, 0);
    return TIEMPO_FIJO + TIEMPO_PREP + testSum;
  }, [selectedTags]);

  const handleLaunch = async () => {
    setIsLaunching(true);
    setErrorMsg(null);
    
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: toolSlug,
          suite: suiteSlug,
          selectedTags
        })
      });
      
      if (res.status === 201) {
        const { run_id } = await res.json();
        window.location.href = `/runs/${run_id}`;
      } else {
        const { error } = await res.json();
        setErrorMsg(error);
      }
    } catch (e) {
      setErrorMsg("Error de conexión al lanzar los tests.");
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg border max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Selecciona los tests a ejecutar</h2>
      
      <div className="space-y-2 mb-6">
        {AVAILABLE_TESTS.map(test => (
          <label key={test.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 cursor-pointer">
            <input 
              type="checkbox" 
              onChange={() => toggleTag(test.tags[0])}
              className="h-4 w-4 text-blue-600"
            />
            <span className="flex-1">{test.name}</span>
            <span className="text-gray-500 text-sm">~{test.duration}s</span>
          </label>
        ))}
      </div>

      <div className="border-t pt-4 flex flex-col items-center gap-4">
        <p className="text-lg">
          Tiempo estimado: <strong>~{Math.round(estimatedTime)}s</strong>
        </p>

        {errorMsg && <p className="text-red-600">{errorMsg}</p>}

        <button 
          onClick={handleLaunch}
          disabled={selectedTags.length === 0 || isLaunching}
          className="bg-black text-white px-6 py-2 rounded font-medium disabled:opacity-50"
        >
          {isLaunching ? 'Lanzando...' : 'Lanzar Tests'}
        </button>
      </div>
    </div>
  );
}