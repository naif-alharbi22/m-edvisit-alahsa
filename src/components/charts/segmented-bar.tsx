"use client";

import { Legend } from "./chart-card";
import { inkOn } from "./palette";

export interface Segment {
  label: string;
  value: number;
  color: string;
}

interface SegmentedBarProps {
  segments: Segment[];
  formatShare: (ratio: number) => string;
  formatValue: (v: number) => string;
  /**
   * "tall": 28px blocks with shares printed inside and a names-only legend.
   * "thin": 8px bar above a list giving each part's name, amount and share.
   */
  variant?: "tall" | "thin";
}

/** One whole split into ≤6 parts, with 2px surface gaps between blocks. */
export function SegmentedBar({ segments, formatShare, formatValue, variant = "tall" }: SegmentedBarProps) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const visible = segments.filter((s) => s.value > 0);
  if (total === 0) return null;
  const aria = visible.map((s) => `${s.label}: ${formatValue(s.value)} (${formatShare(s.value / total)})`).join(", ");

  if (variant === "thin") {
    return (
      <div className="space-y-4">
        <div className="flex h-2 w-full gap-[2px]" role="img" aria-label={aria}>
          {visible.map((s) => (
            <div
              key={s.label}
              className="min-w-[3px] rounded-full"
              style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
              title={`${s.label}: ${formatValue(s.value)} (${formatShare(s.value / total)})`}
            />
          ))}
        </div>
        <ul className="divide-y text-sm">
          {segments.map((s) => (
            <li key={s.label} className="flex items-center gap-2 py-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} aria-hidden />
              <span className="flex-1 text-muted-foreground">{s.label}</span>
              <span className="font-medium tabular-nums">{formatValue(s.value)}</span>
              <span className="w-12 text-end text-xs tabular-nums text-muted-foreground">{formatShare(s.value / total)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex h-7 w-full gap-[2px]" role="img" aria-label={aria}>
        {visible.map((s) => {
          const share = s.value / total;
          return (
            <div
              key={s.label}
              className="flex min-w-[3px] items-center rounded-[4px] px-1.5 text-xs font-semibold"
              style={{ width: `${share * 100}%`, background: s.color, color: inkOn(s.color) }}
              title={`${s.label}: ${formatValue(s.value)} (${formatShare(share)})`}
            >
              {share >= 0.09 && <span className="truncate">{formatShare(share)}</span>}
            </div>
          );
        })}
      </div>
      <Legend items={visible.map((s) => ({ label: s.label, color: s.color }))} />
    </div>
  );
}
