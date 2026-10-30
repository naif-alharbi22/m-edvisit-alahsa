import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: string;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + hint/error with proper aria wiring via ids. */
export function Field({ id, label, error, hint, optional, className, children }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="flex items-center gap-1">
        {label}
        {optional && <span className="text-xs font-normal text-muted-foreground">({optional})</span>}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
