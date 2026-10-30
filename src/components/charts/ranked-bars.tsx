"use client";

import { SERIES } from "./palette";

export interface RankedItem {
  label: string;
  value: number;
  /** Optional secondary text shown after the value (e.g. a share). */
  note?: string;
}

/**
 * Ranked horizontal bars, one hue, largest first. Values are printed at the bar
 * tip so nothing depends on hover. Bars are 10px with a 4px rounded data-end.
 */
export function RankedBars({
  items,
  formatValue,
  color = SERIES[0],
  maxItems = 8,
}: {
  items: RankedItem[];
  formatValue: (v: number) => string;
  color?: string;
  maxItems?: number;
}) {
  const shown = items.slice(0, maxItems);
  const max = Math.max(1, ...shown.map((i) => i.value));
  return (
    <ul className="space-y-2.5">
      {shown.map((item) => {
        const pct = (item.value / max) * 100;
        return (
          <li key={item.label} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 text-sm">
            <span className="truncate text-muted-foreground" title={item.label}>
              {item.label}
            </span>
            <div className="flex min-w-0 items-center gap-2">
              <div
                className="h-2.5 rounded-e-[4px]"
                style={{ width: `${Math.max(pct, item.value > 0 ? 1.5 : 0)}%`, background: color }}
                aria-hidden
              />
              <span className="shrink-0 font-medium tabular-nums">
                {formatValue(item.value)}
                {item.note && <span className="ms-1 text-xs font-normal text-muted-foreground">{item.note}</span>}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
