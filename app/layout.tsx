import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { ThemeProvider } from './components/ThemeProvider';
import NavbarServer from './components/NavbarServer';
import { I18nProvider } from './components/I18nProvider';
import { getLocale } from '@/lib/i18n-server';

export const metadata: Metadata = {
  title: 'Ivan QA Lab — Automation Studio',
  description: 'Orquestador de suites automatizadas y métricas en tiempo real',
};

// El idioma lo decide el servidor (cookie qa-lang o idioma del navegador): el HTML sale ya traducido y no hay desfase al hidratar.
async function LocaleShell({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <I18nProvider locale={locale}>
      <Suspense fallback={<div className="h-20" />}>
        <NavbarServer />
      </Suspense>
      {children}
    </I18nProvider>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen antialiased selection:bg-neutral-800 selection:text-white">
        <ThemeProvider>
          <Suspense fallback={<div className="h-20" />}>
            <LocaleShell>{children}</LocaleShell>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}