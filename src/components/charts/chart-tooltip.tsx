"use client";

export interface TooltipRow {
  label: string;
  value: string;
  color: string;
}

/** Tooltip body: values lead (strong), series names follow, keyed by short line strokes. */
export function ChartTooltipContent({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="min-w-[140px] rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-muted-foreground">{title}</p>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2">
            <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden />
            <span className="font-semibold tabular-nums text-foreground">{r.value}</span>
            <span className="text-muted-foreground">{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
