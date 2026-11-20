import { Suspense } from 'react';
import Link from 'next/link';
import { getAdminClient } from '@/lib/supabase/admin';

async function StudioDashboard() {
  const db = getAdminClient();

  const [toolsRes, runsRes] = await Promise.all([
    db.from('tools').select('*').order('name', { ascending: true }),
    db.from('runs').select('id, status, created_at, suites(slug, tools(name, slug))').order('created_at', { ascending: false }).limit(6),
  ]);

  const tools = toolsRes.data || [];
  const recentRuns = runsRes.data || [];
  const finishedCount = recentRuns.filter((r) => r.status === 'finished').length;
  const passRate = recentRuns.length > 0 ? Math.round((finishedCount / recentRuns.length) * 100) : 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-8">
      {/* Cabecera estilo Studio */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Studio</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Entorno staging conectado · {tools.length} herramientas registradas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Workers listos
          </span>
        </div>
      </div>

      {/* 4 Tarjetas KPI (La primera destacada en negro carbón como en Talmo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[24px] bg-[var(--bg-hero)] text-[var(--text-hero)] border border-[var(--border-subtle)] p-6 flex flex-col justify-between min-h-[156px]">
          <div className="flex items-center justify-between text-xs opacity-70">
            <span>Estabilidad reciente</span>
            <span>Últimos runs</span>
          </div>
          <div className="my-2">
            <span className="text-3xl font-semibold tracking-tight">{passRate}%</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
              Operativo
            </span>
            <span className="opacity-60">Pipeline CI/CD</span>
          </div>
        </div>

        <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 flex flex-col justify-between min-h-[156px]">
          <span className="text-xs text-[var(--text-secondary)]">Ejecuciones recientes</span>
          <span className="text-3xl font-semibold tracking-tight">{recentRuns.length}</span>
          <span className="text-xs text-[var(--text-secondary)]">{finishedCount} completadas con éxito</span>
        </div>

        <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 flex flex-col justify-between min-h-[156px]">
          <span className="text-xs text-[var(--text-secondary)]">Suites disponibles</span>
          <span className="text-3xl font-semibold tracking-tight">9</span>
          <span className="text-xs text-[var(--text-secondary)]">Módulos A – I configurados</span>
        </div>

        <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 flex flex-col justify-between min-h-[156px]">
          <span className="text-xs text-[var(--text-secondary)]">Tiempo medio arranque</span>
          <span className="text-3xl font-semibold tracking-tight">~39s</span>
          <span className="text-xs text-[var(--text-secondary)]">GitHub Actions Runner</span>
        </div>
      </div>

      {/* Grid inferior: Herramientas + Actividad reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Motores de Automatización</h2>
              <p className="text-xs text-[var(--text-secondary)]">Selecciona un framework para configurar y lanzar pruebas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(tools.length > 0 ? tools : [
              { id: '1', slug: 'playwright', name: 'Playwright E2E', enabled: true },
              { id: '2', slug: 'selenium', name: 'Selenium WebDriver', enabled: true },
            ]).map((tool: any) => (
              <Link
                key={tool.id}
                href={`/${tool.slug}`}
                className="group p-5 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] hover:border-[var(--text-primary)] transition flex flex-col justify-between gap-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-base capitalize">{tool.name || tool.slug}</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                    {tool.enabled !== false ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>Configurar tags y lanzar</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Panel derecho estilo "Next up" */}
        <div className="rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-1">Actividad reciente</h2>
            <p className="text-xs text-[var(--text-secondary)] mb-5">Últimas ejecuciones disparadas</p>

            <div className="space-y-3">
              {recentRuns.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] py-8 text-center">
                  Aún no hay ejecuciones registradas.
                </p>
              ) : (
                recentRuns.map((run: any) => (
                  <Link
                    key={run.id}
                    href={run.status === 'finished' ? `/runs/${run.id}/results` : `/runs/${run.id}`}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-surface-muted)] hover:opacity-80 transition"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {run.suites?.tools?.name || 'Suite'} · {run.suites?.slug || 'run'}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] font-mono truncate">
                        {run.id.slice(0, 8)}...
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase shrink-0 ${
                        run.status === 'finished'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : run.status === 'failed'
                          ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {run.status}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="pb-12">
      <Suspense fallback={<div className="max-w-7xl mx-auto p-8 text-sm text-[var(--text-secondary)]">Cargando Studio...</div>}>
        <StudioDashboard />
      </Suspense>
    </main>
  );
}