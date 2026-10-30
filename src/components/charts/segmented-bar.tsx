"use client";

import { Legend } from "./chart-card";
import { inkOn } from "./palette";

export interface Segment {
  label: string;
  value: number;
  color: string;
}

/**
 * Tall segmented bar (one whole split into ≤6 parts): 28px, 2px surface gaps,
 * 4px corners, share printed inside when it fits; names live in the legend.
 */
export function SegmentedBar({ segments, formatShare, formatValue }: {
  segments: Segment[];
  formatShare: (ratio: number) => string;
  formatValue: (v: number) => string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const visible = segments.filter((s) => s.value > 0);
  if (total === 0) return null;
  return (
    <div className="space-y-3">
      <div
        className="flex h-7 w-full gap-[2px]"
        role="img"
        aria-label={visible.map((s) => `${s.label}: ${formatValue(s.value)} (${formatShare(s.value / total)})`).join(", ")}
      >
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
