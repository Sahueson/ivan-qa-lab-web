'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';

const NAV_ITEMS = [
  { label: 'Studio', href: '/' },
  { label: 'Playwright', href: '/playwright' },
  { label: 'Selenium', href: '/selenium' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[var(--bg-canvas)]/85">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between gap-4">
        {/* Marca izquierda */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-full bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] flex items-center justify-center font-bold text-sm tracking-tighter">
            QA
          </div>
          <div className="leading-tight">
            <p className="font-semibold text-base tracking-tight">Ivan QA Lab</p>
            <p className="text-xs text-[var(--text-secondary)]">Automation Studio</p>
          </div>
        </Link>

        {/* Píldora central de navegación */}
        <nav className="hidden md:flex items-center gap-1 p-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Controles derecha: Botón Día/Noche + Acción rápida */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleTheme}
            aria-label="Cambiar modo día y noche"
            title={theme === 'light' ? 'Activar modo noche' : 'Activar modo día'}
            className="w-10 h-10 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] hover:scale-105 transition cursor-pointer"
          >
            {theme === 'light' ? (
              /* Luna (Modo Noche) */
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              /* Sol (Modo Día) */
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            )}
          </button>

          <Link
            href="/playwright"
            className="px-4 py-2 rounded-full bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] text-sm font-medium hover:opacity-90 transition"
          >
            + Nuevo Run
          </Link>
        </div>
      </div>
    </header>
  );
}