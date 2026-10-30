"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarDisplay({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden />
      <span className="text-sm font-medium">{value.toFixed(1)}</span>
    </span>
  );
}

interface StarInputProps {
  value: number;
  onChange: (value: number) => void;
  label: (n: number) => string;
}

export function StarInput({ value, onChange, label }: StarInputProps) {
  return (
    <div className="flex gap-1" role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={label(n)}
          onClick={() => onChange(n)}
          className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star className={cn("h-7 w-7 transition-colors", n <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40")} />
        </button>
      ))}
    </div>
  );
}
