/** 12-point sparkline in the de-emphasis hue with the current period marked in the accent. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const points = values.slice(-12);
  if (points.length < 2) return null;
  const w = 96;
  const h = 28;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const coords = points.map((v, i) => [(i / (points.length - 1)) * (w - 6) + 3, h - 3 - ((v - min) / span) * (h - 6)] as const);
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = coords[coords.length - 1]!;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className={className} aria-hidden>
      <path d={path} fill="none" stroke="var(--chart-muted)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={3} fill="var(--chart-1)" stroke="var(--card)" strokeWidth={1.5} />
    </svg>
  );
}
