'use client';
import { useState, useMemo, useEffect } from 'react';

const TIEMPO_FIJO = 39;
const TIEMPO_PREP = 21;
const SUT_DEV_URL =
  process.env.NEXT_PUBLIC_SUT_DEV_URL || 'https://tactical-calendar-dev.vercel.app/';
const ACCESS_MAILTO =
  'mailto:ivancabanillas93@gmail.com?subject=Solicitud%20de%20acceso%20-%20Tactical%20Calendar%20(QA%20Lab)&body=Hola%20Iv%C3%A1n%2C%0A%0AHe%20estado%20probando%20Ivan%20QA%20Lab%20y%20me%20gustar%C3%ADa%20solicitar%20un%20usuario%20de%20prueba%20para%20explorar%20Tactical%20Calendar%20en%20el%20entorno%20dev.%0A%0AUn%20saludo.';

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

  const [activeSuiteSlug, setActiveSuiteSlug] = useState<string>(suites[0]?.slug || 'a-auth');
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const nextSuites = suitesByTool[activeToolSlug] || [];
    setActiveSuiteSlug(nextSuites[0]?.slug || 'a-auth');
    setSelectedTestIds([]);
    setSearchQuery('');
    setErrorMsg(null);
  }, [activeToolSlug, suitesByTool]);

  const hasSuiteMapping = useMemo(
    () => allTests.some((t) => Boolean(t.suiteSlug)),
    [allTests]
  );

  // Busca solo por nombre/ID del escenario o @tag (sin coincidir con rutas internas como rbac.spec.ts)
  const visibleTests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      return allTests.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.tag?.toLowerCase().includes(q)
      );
    }

    if (!hasSuiteMapping || activeSuiteSlug === 'all') return allTests;
    return allTests.filter((t) => t.suiteSlug === activeSuiteSlug);
  }, [allTests, activeSuiteSlug, hasSuiteMapping, searchQuery]);

  const selectedSuites = useMemo(() => {
    const set = new Set<string>();
    for (const t of allTests) {
      if (selectedTestIds.includes(t.id)) {
        set.add(t.suiteSlug || activeSuiteSlug);
      }
    }
    return Array.from(set);
  }, [allTests, selectedTestIds, activeSuiteSlug]);

  const toggleTest = (id: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleVisibleSuite = () => {
    const visibleIds = visibleTests.map((t) => t.id);
    const allVisibleSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedTestIds.includes(id));

    if (allVisibleSelected) {
      setSelectedTestIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedTestIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const toggleAllSuites = () => {
    if (selectedTestIds.length === allTests.length && allTests.length > 0) {
      setSelectedTestIds([]);
    } else {
      setSelectedTestIds(allTests.map((t) => t.id));
    }
  };

  const estimatedTime = useMemo(() => {
    if (selectedTestIds.length === 0) return 0;
    const sum = allTests
      .filter((t) => selectedTestIds.includes(t.id))
      .reduce((acc, t) => acc + t.duration, 0);
    return TIEMPO_FIJO + TIEMPO_PREP + sum;
  }, [selectedTestIds, allTests]);

  const handleLaunch = async () => {
    if (selectedTestIds.length === 0) return;
    setIsLaunching(true);
    setErrorMsg(null);

    const selectedObjects = allTests.filter((t) => selectedTestIds.includes(t.id));
    const grepValues = selectedObjects.map((t) => t.grepValue);
    const suitesToRun = selectedSuites.length > 0 ? selectedSuites : [activeSuiteSlug];

    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: activeToolSlug,
          suite: suitesToRun[0],
          suites: suitesToRun,
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

  const allGlobalSelected = allTests.length > 0 && selectedTestIds.length === allTests.length;
  const allCurrentSuiteSelected =
    visibleTests.length > 0 && visibleTests.every((t) => selectedTestIds.includes(t.id));

  return (
    <div className="space-y-6">
      {/* Banner de contexto: Sistema Bajo Prueba (SUT) */}
      <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
              Sistema bajo prueba (SUT)
            </span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">Tactical Calendar</span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl">
            Aplicación de gestión de partidas, inscripciones, roles (MAD / FOE) y gobernanza. Los tests automatizados corren sobre <strong className="font-medium text-[var(--text-primary)]">staging</strong>; si quieres explorar la app manualmente en <strong className="font-medium text-[var(--text-primary)]">dev</strong>, solicítame un usuario base y te lo facilito al momento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <a
            href={ACCESS_MAILTO}
            className="px-4 py-2.5 rounded-full bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] text-xs font-medium hover:opacity-90 transition inline-flex items-center gap-1.5"
          >
            <span>Solicitar usuario</span>
          </a>

          <a
            href={SUT_DEV_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-full bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-xs font-medium hover:border-[var(--text-primary)] transition inline-flex items-center gap-1.5"
          >
            <span>Abrir entorno dev</span>
            <span>↗</span>
          </a>
        </div>
      </div>

      {/* Tarjeta principal del Selector */}
      <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 sm:p-8 space-y-6">
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

        {/* Selector de Suites con soporte multi-suite */}
        {suites.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Suites / Módulos ({suites.length} disponibles)
                </label>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Puedes navegar entre suites y acumular tests de varias antes de lanzar
                </p>
              </div>

              {allTests.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAllSuites}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                    allGlobalSelected
                      ? 'bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] border-transparent'
                      : 'bg-[var(--bg-surface-muted)] border-[var(--border-subtle)] hover:border-[var(--text-primary)]'
                  }`}
                >
                  {allGlobalSelected
                    ? `Desmarcar todas (${allTests.length} tests)`
                    : `Seleccionar todas las suites (${allTests.length} tests)`}
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {suites.map((s) => {
                const isViewing = activeSuiteSlug === s.slug;
                const suiteTests = allTests.filter((t) => t.suiteSlug === s.slug);
                const selectedInSuite = suiteTests.filter((t) => selectedTestIds.includes(t.id)).length;

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setActiveSuiteSlug(s.slug);
                      setSearchQuery('');
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer inline-flex items-center gap-2 ${
                      isViewing
                        ? 'bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] border-transparent'
                        : selectedInSuite > 0
                        ? 'bg-[var(--bg-surface-muted)] border-[var(--text-primary)] text-[var(--text-primary)]'
                        : 'bg-[var(--bg-surface-muted)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span>{s.name}</span>
                    {suiteTests.length > 0 && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                          selectedInSuite > 0
                            ? 'bg-emerald-500/20 text-emerald-500 font-semibold'
                            : 'opacity-60'
                        }`}
                      >
                        {selectedInSuite > 0 ? `${selectedInSuite}/${suiteTests.length}` : suiteTests.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Lista de escenarios */}
        <div className="pt-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                {searchQuery.trim()
                  ? `Resultados de búsqueda (${visibleTests.length})`
                  : `Escenarios en ${activeSuiteSlug} (${visibleTests.length})`}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {selectedSuites.length > 1
                  ? `${selectedTestIds.length} tests marcados en ${selectedSuites.length} suites distintas`
                  : 'Marca los escenarios que quieras incluir en esta ejecución'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {visibleTests.length > 0 && (
                <button
                  type="button"
                  onClick={toggleVisibleSuite}
                  className="px-3.5 py-1.5 rounded-full bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-xs font-medium hover:opacity-80 transition cursor-pointer"
                >
                  {allCurrentSuiteSelected ? 'Desmarcar esta suite' : 'Marcar esta suite'}
                </button>
              )}
              {selectedTestIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTestIds([])}
                  className="px-3 py-1.5 rounded-full text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
                >
                  Limpiar ({selectedTestIds.length})
                </button>
              )}
            </div>
          </div>

          {allTests.length > 4 && (
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código (ej. TC-B), título o @tag..."
              className="w-full px-4 py-2.5 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-sm focus:outline-none focus:border-[var(--text-primary)]"
            />
          )}

          {visibleTests.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-center space-y-1">
              <p className="text-sm font-medium">No se encontraron escenarios en esta vista</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Prueba otra suite o limpia el filtro de búsqueda.
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
              disabled={selectedTestIds.length === 0 || isLaunching}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] text-sm font-medium disabled:opacity-40 hover:opacity-90 transition cursor-pointer"
            >
              {isLaunching
                ? 'Despachando workflow...'
                : selectedTestIds.length === 0
                ? 'Selecciona al menos 1 test'
                : selectedSuites.length > 1
                ? `Lanzar ${selectedTestIds.length} tests (${selectedSuites.length} suites)`
                : `Lanzar ${selectedTestIds.length} ${selectedTestIds.length === 1 ? 'test' : 'tests'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}