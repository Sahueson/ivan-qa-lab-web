import { getT } from '@/lib/i18n-server';

const EXPERIENCE = [
  {
    role: 'QA Automation Engineer',
    company: 'Genexys Technology Ltd.',
    period: '01/2026 — Actualidad',
    highlight: true,
    summary:
      'Responsable de calidad y automatización E2E para un vehículo de movilidad personal autónomo y su plataforma cloud de gestión de flota. Diseño y desarrollo desde cero de la plataforma interna de QA desplegada en AWS.',
    bullets: [
      'Validación de IA embarcada y sistemas ADAS sobre hardware real (NVIDIA Jetson y AWS Greengrass): percepción, asistente de voz, detección de fatiga y entrenamiento wake-word multilingüe.',
      'QA de microservicios en AWS (RBAC, multi-tenant, MFA), migración de Postman/Newman a Bruno con gate en CI, E2E en Playwright y carga en JMeter.',
      'Auditoría de seguridad cloud con Prowler (hallazgos reales antes de producción) y validación de pipelines de telemetría.',
    ],
  },
  {
    role: 'QA Automation Engineer',
    company: 'Zemsania SL · Santander',
    period: '04/2025 — 01/2026',
    summary:
      'Automatización funcional y de rendimiento en los dominios de Ahorro e Inversión y Banca Privada utilizando Postman, JMeter y Cilantrum (framework basado en Selenium).',
    bullets: [
      'Análisis de logs, soporte en despliegues (RLSE) y validación completa para promoción a producción.',
      'Configuración de integración continua en preproducción y mentoría a perfiles QA senior.',
    ],
  },
  {
    role: 'QA Automation Engineer',
    company: 'Alpha Xperience',
    period: '09/2023 — 01/2025',
    summary:
      'Automatización back-end con Postman, E2E front-end con Cypress y pruebas de rendimiento con JMeter.',
    bullets: [
      'Implementación de pipelines CI en Jenkins con ejecución automática tras cada commit.',
      'Planificación técnica y reparto de tareas para equipos de desarrollo front-end y back-end.',
    ],
  },
  {
    role: 'QA Junior Automation',
    company: 'LucaTic',
    period: '06/2022 — 09/2023',
    summary:
      'Desarrollo y mantenimiento de suites automatizadas con Selenium, Cucumber, Node.js y Java, junto con análisis de datos en tiempo real en Kibana.',
    bullets: [],
  },
];

const SKILLS = [
  'Playwright',
  'Selenium',
  'Cypress',
  'Bruno',
  'Postman / Newman',
  'JMeter',
  'Python',
  'Java',
  'JavaScript / Node.js',
  'AWS',
  'NVIDIA Jetson / Greengrass',
  'CI/CD & Jenkins',
  'Prowler',
  'SQL & MongoDB',
  'Kibana',
  'Cucumber',
  'Jira & Confluence',
];

const EDUCATION = [
  {
    title: 'QA Automation Testing',
    place: 'LucaTic, Madrid · 2022',
  },
  {
    title: 'Certificado de Profesionalidad en Desarrollo de Aplicaciones Web',
    place: 'Fedeto, Toledo · 2021',
  },
  {
    title: 'Técnico Superior en Producción de Audiovisuales y Espectáculos',
    place: 'IES Puerta Bonita · 2015 — 2017',
  },
  {
    title: 'Grado en Química',
    place: 'Universidad Complutense de Madrid · 2011 — 2014',
  },
];

export default async function AboutPage() {
  const { t } = await getT();
  return (
    <main className="pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 space-y-8">
        {/* Cabecera */}
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">{t('Sobre mí')}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Iván Cabanillas · QA Automation Engineer · Madrid, {t('España')}
          </p>
        </div>

        {/* Tarjeta principal: Retrato + Perfil + Acciones (CV y LinkedIn) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Foto bien encuadrada sin recortes */}
          <div className="lg:col-span-4 rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 flex flex-col justify-between">
            <div className="w-full h-[340px] sm:h-[380px] rounded-2xl overflow-hidden bg-[var(--bg-surface-muted)]">
              <img
                src="/avatar.jpg"
                alt="Iván Cabanillas"
                className="w-full h-full object-cover object-center"
              />
            </div>

            <div className="pt-4 px-1 flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>Valdemoro, Madrid</span>
              <span>{t('Español · Inglés (B2)')}</span>
            </div>
          </div>

          {/* Resumen profesional y enlaces directos */}
          <div className="lg:col-span-8 rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                End-to-End Quality & Automation
              </div>

              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-snug">
                {t('De la IA embarcada y los sistemas ADAS al backend cloud, la seguridad y el frontend.')}
              </h2>

              <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                {t('No me quedo en reproducir un fallo: analizo el código hasta dar con la causa raíz para entregar a desarrollo un diagnóstico concreto y no solo un síntoma. He diseñado y desplegado desde cero plataformas internas de QA, automatizando suites funcionales, de carga y de seguridad bajo metodologías Agile y Scrum.')}
              </p>

              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {t('Este laboratorio (')}<strong className="text-[var(--text-primary)] font-medium">Ivan QA Lab</strong>{t(') es un entorno real conectado a GitHub Actions y Supabase donde cualquiera puede lanzar ejecuciones en vivo y auditar métricas y evidencias.')}
              </p>
            </div>

            {/* Botones CV y LinkedIn */}
            <div className="pt-6 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-3">
              <a
                href="/CV%2C%20Ivan%20Cabanillas.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-full bg-[var(--pill-active-bg)] text-[var(--pill-active-text)] text-sm font-medium hover:opacity-90 transition inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>{t('Ver / Descargar CV (PDF)')}</span>
              </a>

              <a
                href="https://www.linkedin.com/in/ivan-antonio-cabanillas-vozmediano-a1127b175"
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-full bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-sm font-medium hover:opacity-80 transition inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                </svg>
                <span>LinkedIn ↗</span>
              </a>
            </div>
          </div>
        </div>

        {/* Experiencia Profesional */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">{t('Experiencia profesional')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EXPERIENCE.map((exp) => (
              <div
                key={exp.company}
                className={`rounded-[24px] p-6 border border-[var(--border-subtle)] flex flex-col justify-between gap-4 ${
                  exp.highlight
                    ? 'bg-[var(--bg-hero)] text-[var(--text-hero)]'
                    : 'bg-[var(--bg-surface)]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold text-base">{exp.role}</h3>
                      <p className={`text-xs ${exp.highlight ? 'opacity-75' : 'text-[var(--text-secondary)]'}`}>
                        {exp.company}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-mono shrink-0 ${
                        exp.highlight
                          ? 'bg-white/10 text-white'
                          : 'bg-[var(--bg-surface-muted)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {t(exp.period)}
                    </span>
                  </div>

                  <p className={`text-xs sm:text-sm leading-relaxed mt-3 ${exp.highlight ? 'opacity-90' : 'text-[var(--text-secondary)]'}`}>
                    {t(exp.summary)}
                  </p>

                  {exp.bullets.length > 0 && (
                    <ul className={`mt-3 space-y-1.5 text-xs leading-relaxed list-disc list-inside ${exp.highlight ? 'opacity-80' : 'text-[var(--text-secondary)]'}`}>
                      {exp.bullets.map((b, i) => (
                        <li key={i}>{t(b)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stack Técnico y Formación */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6">
            <h2 className="text-base font-semibold mb-1">{t('Stack & Herramientas')}</h2>
            <p className="text-xs text-[var(--text-secondary)] mb-5">{t('Tecnologías habituales en automatización, cloud y CI/CD')}</p>
            <div className="flex flex-wrap gap-2">
              {SKILLS.map((skill) => (
                <span
                  key={skill}
                  className="px-3.5 py-1.5 rounded-full bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-xs font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6">
            <h2 className="text-base font-semibold mb-1">{t('Formación')}</h2>
            <p className="text-xs text-[var(--text-secondary)] mb-5">{t('Trayectoria académica y especialización')}</p>
            <div className="space-y-3">
              {EDUCATION.map((ed) => (
                <div key={ed.title} className="p-3 rounded-2xl bg-[var(--bg-surface-muted)]">
                  <p className="text-xs sm:text-sm font-medium">{t(ed.title)}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t(ed.place)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}