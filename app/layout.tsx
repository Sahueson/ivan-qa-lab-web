import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { ThemeProvider } from './components/ThemeProvider';
import NavbarServer from './components/NavbarServer';

export const metadata: Metadata = {
  title: 'Ivan QA Lab — Automation Studio',
  description: 'Orquestador de suites automatizadas y métricas en tiempo real',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen antialiased selection:bg-neutral-800 selection:text-white">
        <ThemeProvider>
          <Suspense fallback={<div className="h-20" />}>
            <NavbarServer />
          </Suspense>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}