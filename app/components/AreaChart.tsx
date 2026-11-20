// Gráfico de área en SVG puro (sin dependencias), estilo "Fees earned" de la referencia:
// área gris suave, línea negra, rejilla punteada y punto en el último valor.
type Point = { label: string; value: number };

const W = 800;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 52 };

const fmt = (v: number) => (v >= 10 ? `${Math.round(v)}s` : `${v.toFixed(1)}s`);

export default function AreaChart({ points, ariaLabel }: { points: Point[]; ariaLabel: string }) {
  if (points.length < 2) return null;

  const max = Math.max(...points.map((p) => p.value), 1);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const xy = points.map((p, i) => [
    PAD.left + (i / (points.length - 1)) * innerW,
    PAD.top + (1 - p.value / max) * innerH,
  ]);

  // Curva suave: tramos cúbicos con las x de control en el punto medio entre vecinos.
  const line = xy.reduce((d, [x, y], i) => {
    if (i === 0) return `M${x.toFixed(1)},${y.toFixed(1)}`;
    const [px, py] = xy[i - 1];
    const cx = ((px + x) / 2).toFixed(1);
    return `${d} C${cx},${py.toFixed(1)} ${cx},${y.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
  }, '');
  const baseY = PAD.top + innerH;
  const area = `${line} L${xy[xy.length - 1][0].toFixed(1)},${baseY} L${xy[0][0].toFixed(1)},${baseY} Z`;

  const ticks = [0, max / 2, max];
  // Con muchos escenarios solo se rotulan algunos para que no se pisen.
  const step = Math.ceil(points.length / 10);
  const [lx, ly] = xy[xy.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={ariaLabel}>
      {ticks.map((t) => {
        const y = PAD.top + (1 - t / max) * innerH;
        return (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y}
              y2={y}
              stroke="var(--border-subtle)"
              strokeDasharray={t === 0 ? undefined : '3 4'}
            />
            <text x={PAD.left - 8} y={y + 3.5} textAnchor="end" fontSize="11" fill="var(--text-secondary)">
              {fmt(t)}
            </text>
          </g>
        );
      })}

      <path d={area} fill="var(--text-primary)" opacity="0.07" />
      <path d={line} fill="none" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" />

      {xy.map(([x], i) =>
        i % step === 0 || i === points.length - 1 ? (
          <text key={points[i].label + i} x={x} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--text-secondary)">
            {points[i].label}
          </text>
        ) : null,
      )}

      <circle cx={lx} cy={ly} r="4.5" fill="var(--text-primary)" stroke="var(--bg-surface)" strokeWidth="2" />
    </svg>
  );
}
