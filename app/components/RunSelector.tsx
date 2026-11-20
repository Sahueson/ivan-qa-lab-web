'use client';
import { useState, useMemo } from 'react';

const AVAILABLE_TESTS = [
  { id: 'TC-A01', name: 'Login válido y redirección al panel', duration: 3.2, tags: ['@login'] },
  { id: 'TC-B02', name: 'Crear partida y verificar persistencia', duration: 4.5, tags: ['@eventos'] },
];

const TIEMPO_FIJO = 39;
const TIEMPO_PREP = 21;

type Variant = {
  id: string;
  label: string;
  slug: string;
};

export default function RunSelector({
  initialToolSlug,
  suiteSlug,
  variants,
}: {
  initialToolSlug: string;
  suiteSlug: string;
  variants?: Variant[];
}) {
  const [activeToolSlug, setActiveToolSlug] = useState(initialToolSlug);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const estimatedTime = useMemo(() => {
    if (selectedTags.length === 0) return 0;
    const testSum = AVAILABLE_TESTS
      .filter((t) => t.tags.some((tag) => selectedTags.includes(tag)))
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
          tool: activeToolSlug,
          suite: suiteSlug,
          selectedTags,
        }),
      });

      if (res.status === 201) {
        const { run_id } = await res.json();
        window.location.href = `/runs/${run_id}`;
      } else {
        const { error } = await res.json();
        setErrorMsg(error);
      }
    } catch {
      setErrorMsg('Error de conexión al lanzar los tests.');
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 sm:p-8">
      {/* Selector de lenguaje (Python / Java) cuando aplica */}
      {variants && variants.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-6 mb-6 border-b border-[var(--border-subtle)]">
          <div>
            <p className="text-sm font-medium">Implementación / Lenguaje</p>
            <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
              Target: {activeToolSlug}
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)]">
            {variants.map((v) => {
              const isSelected = activeToolSlug === v.slug;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setActiveToolSlug(v.slug);
                    setErrorMsg(null);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Casos de prueba disponibles</h2>
        <span className="px-3 py-1 rounded-full bg-[var(--bg-surface-muted)] text-xs font-medium text-[var(--text-secondary)]">
          {selectedTags.length} seleccionados
        </span>
      </div>

      <div className="space-y-3 mb-8">
        {AVAILABLE_TESTS.map((test) => {
          const checked = selectedTags.includes(test.tags[0]);
          return (
            <label
              key={test.id}
              className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition ${
                checked
                  ? 'bg-[var(--bg-surface-muted)] border-[var(--text-primary)]'
                  : 'border-[var(--border-subtle)] hover:bg-[var(--bg-surface-muted)]/60'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleTag(test.tags[0])}
                  className="h-4 w-4 accent-neutral-900 rounded"
                />
                <div>
                  <p className="font-medium text-sm">{test.name}</p>
                  <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
                    {test.id} · {test.tags[0]}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-mono">
                ~{test.duration}s
              </span>
            </label>
          );
        })}
      </div>

      <div className="pt-6 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-xs text-[var(--text-secondary)]">Duración estimada en runner</p>
          <p className="text-2xl font-semibold tracking-tight">~{Math.round(estimatedTime)}s</p>
        </div>

        <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
          {errorMsg && <p className="text-xs text-red-500 font-medium">{errorMsg}</p>}
          <button
            onClick={handleLaunch}
            disabled={selectedTags.length === 0 || isLaunching}
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] text-sm font-medium disabled:opacity-40 hover:opacity-90 transition cursor-pointer"
          >
            {isLaunching ? 'Despachando workflow...' : 'Lanzar ejecución'}
          </button>
        </div>
      </div>
    </div>
  );
}