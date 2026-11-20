'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';

export type NavTool = { slug: string; name: string; category: string; live: boolean };

// Orden y nombre visible de cada categoría (tools.category). Una categoría sin herramientas no sale.
const CATEGORIES: { id: string; label: string; hint: string }[] = [
  { id: 'front', label: 'Web E2E', hint: 'Navegador real contra la app' },
  { id: 'api', label: 'API', hint: 'Contratos y reglas por HTTP' },
  { id: 'mobile', label: 'Móvil', hint: 'App en dispositivo o emulador' },
  { id: 'performance', label: 'Rendimiento', hint: 'Carga y tiempos de respuesta' },
];

// Línea corta bajo cada herramienta en los desplegables.
const TOOL_HINTS: Record<string, string> = {
  playwright: 'TypeScript · auto-wait',
  'selenium-java': 'WebDriver · Java + JUnit',
  'selenium-python': 'WebDriver · Python + pytest',
  cucumber: 'BDD · Gherkin en español',
  cypress: 'Dentro del navegador · TypeScript',
  newman: 'Colecciones Postman',
  bruno: 'Colecciones Bruno',
  karate: 'DSL de API · Java',
  appium: 'Android / iOS',
};

function groupByCategory(tools: NavTool[]) {
  const known = CATEGORIES.map((c) => ({ ...c, tools: tools.filter((t) => t.category === c.id) }));
  const others = tools.filter((t) => !CATEGORIES.some((c) => c.id === t.category));
  if (others.length) known.push({ id: 'otros', label: 'Otras', hint: 'Otras herramientas', tools: others });
  return known.filter((c) => c.tools.length > 0);
}

/** Opción de herramienta en un desplegable; las que aún no se pueden lanzar llevan "Pronto". */
function ToolOption({ tool, onClick }: { tool: NavTool; onClick: () => void }) {
  return (
    <Link
      href={`/${tool.slug}`}
      onClick={onClick}
      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bg-surface-muted)] transition"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{tool.name}</p>
        {TOOL_HINTS[tool.slug] && <p className="text-xs text-[var(--text-secondary)] truncate">{TOOL_HINTS[tool.slug]}</p>}
      </div>
      {tool.live ? (
        <span className="text-xs text-[var(--text-secondary)]">→</span>
      ) : (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
          Pronto
        </span>
      )}
    </Link>
  );
}

export default function Navbar({ tools }: { tools: NavTool[] }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const categories = groupByCategory(tools);

  // Al navegar, se cierran los desplegables.
  useEffect(() => {
    setOpenCategory(null);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenCategory(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[var(--bg-canvas)]/85">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between gap-4">
        {/* Marca izquierda limpia */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-full bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] flex items-center justify-center font-bold text-sm tracking-tighter">
            QA
          </div>
          <div className="leading-tight">
            <p className="font-semibold text-base tracking-tight">Ivan QA Lab</p>
            <p className="text-xs text-[var(--text-secondary)]">Automation Studio</p>
          </div>
        </Link>

        {/* Píldora central: Studio · un desplegable por tipo de prueba · About me */}
        <nav ref={navRef} className="hidden md:flex items-center gap-1 p-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs">
          <Link
            href="/"
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${pathname === '/' ? 'bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            Studio
          </Link>

          {categories.map((cat) => {
            const isActive = cat.tools.some((t) => pathname === `/${t.slug}` || pathname.startsWith(`/${t.slug}/`))
              || (cat.id === 'front' && pathname.startsWith('/selenium'));
            const isOpen = openCategory === cat.id;
            return (
              <div key={cat.id} className="relative">
                <button
                  onClick={() => setOpenCategory(isOpen ? null : cat.id)}
                  aria-expanded={isOpen}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer ${isActive ? 'bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  {cat.label}
                  <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="absolute left-1/2 -translate-x-1/2 mt-3 w-64 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-lg p-1.5 z-50">
                    <p className="px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">{cat.hint}</p>
                    {cat.tools.map((tool) => (
                      <ToolOption key={tool.slug} tool={tool} onClick={() => setOpenCategory(null)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <Link
            href="/about"
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${pathname.startsWith('/about') ? 'bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            About me
          </Link>
        </nav>

        {/* Controles derecha: Acceso rápido móvil + Modo Día/Noche + Nuevo Run */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/about"
            className={`md:hidden px-3.5 py-2 rounded-full border text-xs font-medium transition ${
              pathname === '/about'
                ? 'bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] border-transparent'
                : 'bg-[var(--bg-surface)] border-[var(--border-subtle)]'
            }`}
          >
            About me
          </Link>

          <button
            onClick={toggleTheme}
            aria-label="Cambiar modo día y noche"
            title={theme === 'light' ? 'Activar modo noche' : 'Activar modo día'}
            className="w-10 h-10 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] hover:scale-105 transition cursor-pointer"
          >
            {theme === 'light' ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            )}
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="px-4 py-2 h-10 rounded-full bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] text-sm font-medium hover:opacity-90 transition flex items-center gap-2 cursor-pointer"
            >
              <span>+ Nuevo Run</span>
              <svg
                className={`w-3.5 h-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 max-h-[70vh] overflow-y-auto rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-lg p-1.5 z-50">
                {categories.map((cat) => (
                  <div key={cat.id}>
                    <p className="px-3 pt-2 pb-1 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      {cat.label}
                    </p>
                    {cat.tools.map((tool) => (
                      <ToolOption key={tool.slug} tool={tool} onClick={() => setMenuOpen(false)} />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}