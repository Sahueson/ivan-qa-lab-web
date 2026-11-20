// Orden de los casos de prueba, igual en todas las herramientas y pantallas:
// TC-SMOKE, TC-A01, TC-A01b, TC-A02, ..., TC-B01... (por suite, número y sufijo).
// Ordenar el texto tal cual mezcla B02b, B02, B08 y deja SMOKE al final.

type CaseKey = [number, string, number, string];

export function caseKey(name: string): CaseKey {
  const m = name.match(/^TC-([A-Z]+)(\d*)([a-z]?)\b/);
  if (!m) return [2, name, 0, ''];
  if (m[1] === 'SMOKE') return [0, '', 0, ''];
  return [1, m[1], Number(m[2] || 0), m[3]];
}

export function compareCaseNames(a: string, b: string): number {
  const ka = caseKey(a);
  const kb = caseKey(b);
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] < kb[i]) return -1;
    if (ka[i] > kb[i]) return 1;
  }
  return 0;
}

/** Código corto del caso ("TC-D05") para etiquetas estrechas; el nombre entero si no lo tiene. */
export function caseCode(name: string): string {
  return name.match(/^TC-[A-Z]+\d*[a-z]?\b/)?.[0] ?? name;
}
