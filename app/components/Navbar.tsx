'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { useT } from './I18nProvider';
import LanguageToggle from './LanguageToggle';
import { groupByCategory, TOOL_HINTS } from '@/lib/tool-categories';

export type NavTool = { slug: string; name: string; category: string; live: boolean };

/** Opción de herramienta en un desplegable; las que aún no se pueden lanzar llevan "Pronto". */
function ToolOption({ tool, onClick }: { tool: NavTool; onClick: () => void }) {
  const t = useT();
  return (
    <Link
      href={`/${tool.slug}`}
      onClick={onClick}
      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bg-surface-muted)] transition"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{tool.name}</p>
        {TOOL_HINTS[tool.slug] && <p className="text-xs text-[var(--text-secondary)] truncate">{t(TOOL_HINTS[tool.slug])}</p>}
      </div>
      {tool.live ? (
        <span className="text-xs text-[var(--text-secondary)]">→</span>
      ) : (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
          {t('Pronto')}
        </span>
      )}
    </Link>
  );
}

export default function Navbar({ tools }: { tools: NavTool[] }) {
  const t = useT();
  const pathname = usePathname();
  const { toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const categories = groupByCategory(tools);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const activeTools = categories.find((c) => c.id === activeCat) ?? null;
  const toolsActive = tools.some((x) => pathname === `/${x.slug}` || pathname.startsWith(`/${x.slug}/`)) || pathname.startsWith('/selenium');

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
    <header className="md:sticky md:top-0 z-40 w-full backdrop-blur-md bg-[var(--bg-canvas)]/85 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 md:h-20 flex items-center justify-between gap-2 lg:gap-4">
        {/* Marca izquierda limpia */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="w-10 h-10 rounded-full bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] flex items-center justify-center font-bold text-sm tracking-tighter">
            QA
          </div>
          <div className="hidden min-[380px]:block leading-tight whitespace-nowrap">
            <p className="font-semibold text-base tracking-tight">Ivan QA Lab</p>
            <p className="hidden sm:block text-xs text-[var(--text-secondary)]">Automation Studio</p>
          </div>
        </Link>

        {/* Píldora central: Studio · un desplegable por tipo de prueba · About me */}
        <nav ref={navRef} className="hidden lg:flex items-center gap-0.5 xl:gap-1 p-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs">
          <Link
            href="/"
            className={`px-2.5 xl:px-3 2xl:px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${pathname === '/' ? 'bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            {t('Inicio')}
          </Link>

          {/* Un solo desplegable "Herramientas": a la izquierda los tipos de prueba; al elegir uno, a su derecha solo sus herramientas */}
          <div className="relative">
            <button
              onClick={() => { setOpenCategory(openCategory ? null : 'menu'); setActiveCat((c) => c ?? categories[0]?.id ?? null); }}
              aria-expanded={Boolean(openCategory)}
              className={`px-2.5 xl:px-3 2xl:px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${toolsActive ? 'bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {t('Herramientas')}
              <svg className={`w-3 h-3 transition-transform ${openCategory ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {openCategory && (
              <div className="absolute left-0 mt-3 flex items-start gap-2 z-50">
                <div className="w-60 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-lg p-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onMouseEnter={() => setActiveCat(cat.id)}
                      onClick={() => setActiveCat(cat.id)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left cursor-pointer transition ${activeCat === cat.id ? 'bg-[var(--bg-surface-muted)]' : 'hover:bg-[var(--bg-surface-muted)]'}`}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{t(cat.label)}</span>
                        <span className="block text-xs text-[var(--text-secondary)] truncate">{t(cat.hint)}</span>
                      </span>
                      <span className="text-[var(--text-secondary)]" aria-hidden>›</span>
                    </button>
                  ))}
                </div>
                {activeTools && (
                  <div className="w-72 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-lg p-1.5">
                    <p className="px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">{t(activeTools.label)}</p>
                    {activeTools.tools.map((tool) => (
                      <ToolOption key={tool.slug} tool={tool} onClick={() => setOpenCategory(null)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>


          <Link
            href="/informes"
            className={`px-2.5 xl:px-3 2xl:px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${pathname.startsWith('/informes') ? 'bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            {t('Informes')}
          </Link>
          <Link
            href="/demo-fallos"
            className={`px-2.5 xl:px-3 2xl:px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${pathname.startsWith('/demo-fallos') ? 'bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            {t('Fallos')}
          </Link>
          <Link
            href="/bugs"
            className={`px-2.5 xl:px-3 2xl:px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${pathname.startsWith('/bugs') ? 'bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            Bugs
          </Link>
          <Link
            href="/about"
            className={`px-2.5 xl:px-3 2xl:px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${pathname.startsWith('/about') ? 'bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            {t('Sobre mí')}
          </Link>
        </nav>

        {/* Controles derecha: Acceso rápido móvil + Modo Día/Noche + Nuevo Run */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <LanguageToggle />

          <button
            onClick={toggleTheme}
            aria-label={t('Cambiar modo día y noche')}
            title={t('Cambiar modo día y noche')}
            className="w-10 h-10 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] hover:scale-105 transition cursor-pointer"
          >
            {/* Los dos iconos van siempre: el CSS enseña uno u otro según la clase `dark` de <html>. Así el HTML no depende del tema y
                la hidratación no falla cuando el tema guardado es "noche" (React #418). */}
            <svg className="theme-icon-moon w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            <svg className="theme-icon-sun w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="px-3.5 sm:px-4 py-2 h-10 rounded-full bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] text-sm font-medium whitespace-nowrap hover:opacity-90 transition flex items-center gap-1.5 sm:gap-2 cursor-pointer"
            >
              <span className="sm:hidden">{t('+ Nuevo')}</span>
              <span className="hidden sm:inline">{t('+ Nuevo Run')}</span>
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
                      {t(cat.label)}
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

      {/* Móvil: los enlaces van en su propia fila (desplazable), no apretados junto a los botones */}
      <nav className="lg:hidden flex items-center gap-2 overflow-x-auto px-4 pb-3 -mt-1" aria-label={t('Secciones')}>
        {[
          { href: '/', label: 'Inicio' },
          { href: '/informes', label: 'Informes' },
          { href: '/demo-fallos', label: 'Fallos' },
          { href: '/bugs', label: 'Bugs' },
          { href: '/about', label: 'Sobre mí' },
        ].map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 px-3.5 py-1.5 rounded-full border text-xs font-medium transition ${
                active ? 'bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] border-transparent' : 'bg-[var(--bg-surface)] border-[var(--border-subtle)]'
              }`}
            >
              {t(item.label)}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}