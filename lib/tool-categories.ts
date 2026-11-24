// Tipos de prueba (tools.category) y líneas de cada herramienta: los usan el menú "Herramientas" y la página de inicio.
// Orden y nombre visible de cada categoría. Una categoría sin herramientas no sale.
export const CATEGORIES: { id: string; label: string; hint: string }[] = [
  { id: 'front', label: 'Web E2E', hint: 'Navegador real contra la app' },
  { id: 'api', label: 'API', hint: 'Contratos y reglas por HTTP' },
  { id: 'mobile', label: 'Móvil', hint: 'App en dispositivo o emulador' },
  { id: 'performance', label: 'Rendimiento', hint: 'Carga y tiempos de respuesta' },
];

// Línea corta bajo cada herramienta.
export const TOOL_HINTS: Record<string, string> = {
  playwright: 'TypeScript · auto-wait',
  'selenium-java': 'WebDriver · Java + JUnit',
  'selenium-python': 'WebDriver · Python + pytest',
  cucumber: 'BDD · Gherkin en español',
  cypress: 'Dentro del navegador · TypeScript',
  newman: 'Colecciones Postman',
  bruno: 'Colecciones Bruno',
  karate: 'DSL de API · Java',
  jmeter: 'Carga y tiempos con JMeter',
  appium: 'Android / iOS',
};

export function groupByCategory<T extends { category: string }>(tools: T[]) {
  const known = CATEGORIES.map((c) => ({ ...c, tools: tools.filter((t) => t.category === c.id) }));
  const others = tools.filter((t) => !CATEGORIES.some((c) => c.id === t.category));
  if (others.length) known.push({ id: 'otros', label: 'Otras', hint: 'Otras herramientas', tools: others });
  return known.filter((c) => c.tools.length > 0);
}
