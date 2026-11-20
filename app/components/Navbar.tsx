'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';

const NAV_ITEMS = [
  { label: 'Studio', href: '/' },
  { label: 'Playwright', href: '/playwright' },
  { label: 'Selenium', href: '/selenium' },
];

const RUN_OPTIONS = [
  { label: 'Playwright', sub: 'TypeScript E2E', href: '/playwright' },
  { label: 'Selenium · Python', sub: 'WebDriver Python', href: '/selenium-python' },
  { label: 'Selenium · Java', sub: 'WebDriver Java', href: '/selenium-java' },
];

// Cambia esto por tu URL real de LinkedIn
const LINKEDIN_URL = 'https://www.linkedin.com/in/ivan-antonio-cabanillas-vozmediano-a1127b175';

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[var(--bg-canvas)]/85">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between gap-4">
        {/* Marca izquierda con tu foto circular */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          {!avatarError ? (
            <img
              src="/avatar.jpg"
              alt="Iván Cabanillas"
              onError={() => setAvatarError(true)}
              className="w-10 h-10 rounded-full object-cover border border-[var(--border-subtle)] group-hover:scale-105 transition"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] flex items-center justify-center font-bold text-sm tracking-tighter">
              QA
            </div>
          )}
          <div className="leading-tight">
            <p className="font-semibold text-base tracking-tight">Ivan QA Lab</p>
            <p className="text-xs text-[var(--text-secondary)]">Automation Studio</p>
          </div>
        </Link>

        {/* Píldora central de navegación */}
        <nav className="hidden md:flex items-center gap-1 p-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : item.href === '/selenium'
                ? pathname.startsWith('/selenium')
                : pathname.startsWith(item.href);

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

        {/* Controles derecha: CV + LinkedIn + Modo Día/Noche + Nuevo Run */}
        <div className="flex items-center gap-2">
          <a
            href="/CV, Ivan Cabanillas.pdf"
            target="_blank"
            rel="noopener noreferrer"
            title="Descargar CV"
            className="hidden sm:flex items-center gap-1.5 px-3.5 h-10 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] hover:opacity-80 transition"
          >
            <svg className="w-3.5 h-3.5 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>CV</span>
          </a>

          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Perfil de LinkedIn"
            title="LinkedIn"
            className="w-10 h-10 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] hover:scale-105 transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
            </svg>
          </a>

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
              <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-lg p-1.5 z-50">
                <p className="px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Elegir herramienta
                </p>
                {RUN_OPTIONS.map((opt) => (
                  <Link
                    key={opt.href}
                    href={opt.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[var(--bg-surface-muted)] transition"
                  >
                    <div>
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{opt.sub}</p>
                    </div>
                    <span className="text-xs text-[var(--text-secondary)]">→</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}