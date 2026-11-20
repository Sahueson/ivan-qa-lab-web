'use client';
import { useState, useMemo, useEffect } from 'react';

const TIEMPO_FIJO = 39;
const TIEMPO_PREP = 21;

export type Variant = {
  id: string;
  label: string;
  slug: string;
};

export type SuiteItem = {
  id: string;
  slug: string;
  name: string;
};

export type DiscoveredTest = {
  id: string;
  name: string;
  grepValue: string;
  tag?: string;
  suiteSlug?: string;
  duration: number;
  filePath?: string;
};

export default function RunSelector({
  initialToolSlug,
  variants,
  suitesByTool,
  testsByTool,
}: {
  initialToolSlug: string;
  variants?: Variant[];
  suitesByTool: Record<string, SuiteItem[]>;
  testsByTool: Record<string, DiscoveredTest[]>;
}) {
  const [activeToolSlug, setActiveToolSlug] = useState(initialToolSlug);
  const suites = suitesByTool[activeToolSlug] || [];
  const allTests = testsByTool[activeToolSlug] || [];

  const [selectedSuiteSlug, setSelectedSuiteSlug] = useState<string>(suites[0]?.slug || 'a-auth');
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sincronizar suite por defecto al cambiar entre Python / Java
  useEffect(() => {
    const nextSuites = suitesByTool[activeToolSlug] || [];
    setSelectedSuiteSlug(nextSuites[0]?.slug || 'a-auth');
    setSelectedTestIds([]);
    setSearchQuery('');
    setErrorMsg(null);
  }, [activeToolSlug, suitesByTool]);

  // Tests visibles según la suite activa y el buscador
  const visibleTests = useMemo(() => {
    const hasSuiteMapping = allTests.some((t) => Boolean(t.suiteSlug));
    const bySuite =
      selectedSuiteSlug === 'all' || !hasSuiteMapping
        ? allTests
        : allTests.filter((t) => t.suiteSlug === selectedSuiteSlug);

    if (!searchQuery.trim()) return bySuite;
    const q = searchQuery.toLowerCase();
    return bySuite.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.filePath?.toLowerCase().includes(q) ||
        t.tag?.toLowerCase().includes(q)
    );
  }, [allTests, selectedSuiteSlug, searchQuery]);

  const toggleTest = (id: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = visibleTests.map((t) => t.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedTestIds.includes(id));
    if (allSelected) {
      setSelectedTestIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedTestIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const estimatedTime = useMemo(() => {
    if (selectedTestIds.length > 0) {
      const sum = allTests
        .filter((t) => selectedTestIds.includes(t.id))
        .reduce((acc, t) => acc + t.duration, 0);
      return TIEMPO_FIJO + TIEMPO_PREP + sum;
    }
    // Si no hay tests individuales marcados, estima la suite completa
    const suiteSum =
      visibleTests.length > 0
        ? visibleTests.reduce((acc, t) => acc + t.duration, 0)
        : 15;
    return TIEMPO_FIJO + TIEMPO_PREP + suiteSum;
  }, [selectedTestIds, allTests, visibleTests]);

  const handleLaunch = async () => {
    setIsLaunching(true);
    setErrorMsg(null);

    const selectedObjects = allTests.filter((t) => selectedTestIds.includes(t.id));
    const grepValues = selectedObjects.map((t) => t.grepValue);

    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: activeToolSlug,
          suite: selectedSuiteSlug,
          selectedTags: grepValues,
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
    <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 sm:p-8 space-y-6">
      {/* Selector de lenguaje (Python / Java) cuando aplica */}
      {variants && variants.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-[var(--border-subtle)]">
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
                  onClick={() => setActiveToolSlug(v.slug)}
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

      {/* Selector de Suites / Módulos de Supabase */}
      {suites.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Suite / Módulo ({suites.length} disponibles)
            </label>
            <span className="text-xs font-mono text-[var(--text-secondary)]">
              suite: {selectedSuiteSlug}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {suites.map((s) => {
              const active = selectedSuiteSlug === s.slug;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedSuiteSlug(s.slug);
                    setSelectedTestIds([]);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                    active
                      ? 'bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] border-transparent'
                      : 'bg-[var(--bg-surface-muted)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Cabecera de tests + buscador + seleccionar todos */}
      <div className="pt-2 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              Escenarios detectados ({visibleTests.length})
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Marca casos concretos o deja 0 marcados para ejecutar la suite entera
            </p>
          </div>

          <div className="flex items-center gap-2">
            {visibleTests.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAllVisible}
                className="px-3 py-1.5 rounded-full bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-xs font-medium hover:opacity-80 transition cursor-pointer"
              >
                {visibleTests.every((t) => selectedTestIds.includes(t.id))
                  ? 'Deseleccionar todos'
                  : 'Seleccionar todos'}
              </button>
            )}
            <span className="px-3 py-1.5 rounded-full bg-[var(--bg-surface-muted)] text-xs font-medium text-[var(--text-secondary)]">
              {selectedTestIds.length} marcados
            </span>
          </div>
        </div>

        {allTests.length > 4 && (
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar test por nombre, archivo o @tag..."
            className="w-full px-4 py-2.5 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-sm focus:outline-none focus:border-[var(--text-primary)]"
          />
        )}

        {visibleTests.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-center space-y-1">
            <p className="text-sm font-medium">Suite lista para ejecución completa</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Pulsa el botón inferior para ejecutar todos los tests de <span className="font-mono">{selectedSuiteSlug}</span>.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {visibleTests.map((test) => {
              const checked = selectedTestIds.includes(test.id);
              return (
                <label
                  key={test.id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition ${
                    checked
                      ? 'bg-[var(--bg-surface-muted)] border-[var(--text-primary)]'
                      : 'border-[var(--border-subtle)] hover:bg-[var(--bg-surface-muted)]/60'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTest(test.id)}
                      className="h-4 w-4 accent-neutral-900 rounded shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{test.name}</p>
                      <p className="text-xs text-[var(--text-secondary)] font-mono truncate mt-0.5">
                        {test.filePath || test.suiteSlug}
                        {test.tag ? ` · ${test.tag}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-mono shrink-0">
                    ~{test.duration}s
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Pie de lanzamiento */}
      <div className="pt-6 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-xs text-[var(--text-secondary)]">Duración estimada en runner</p>
          <p className="text-2xl font-semibold tracking-tight">~{Math.round(estimatedTime)}s</p>
        </div>

        <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
          {errorMsg && <p className="text-xs text-red-500 font-medium">{errorMsg}</p>}
          <button
            onClick={handleLaunch}
            disabled={isLaunching}
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] text-sm font-medium disabled:opacity-40 hover:opacity-90 transition cursor-pointer"
          >
            {isLaunching
              ? 'Despachando workflow...'
              : selectedTestIds.length > 0
              ? `Lanzar ${selectedTestIds.length} ${selectedTestIds.length === 1 ? 'test' : 'tests'}`
              : `Lanzar suite (${selectedSuiteSlug})`}
          </button>
        </div>
      </div>
    </div>
  );
}