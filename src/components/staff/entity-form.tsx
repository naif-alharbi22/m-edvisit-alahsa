"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { splitList } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export type FieldType = "text" | "textarea" | "number" | "switch" | "list" | "select" | "email" | "url" | "time";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  span?: 1 | 2;
  placeholder?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  ltr?: boolean;
}

export type FormValues = Record<string, string | boolean>;

/** Converts an entity to string/boolean form state. */
export function toFormValues(fields: FieldDef[], entity: Record<string, unknown> | null | undefined, defaults: FormValues = {}): FormValues {
  const out: FormValues = {};
  for (const field of fields) {
    const v = entity?.[field.name];
    if (field.type === "switch") out[field.name] = typeof v === "boolean" ? v : (defaults[field.name] as boolean | undefined) ?? true;
    else if (field.type === "list") out[field.name] = Array.isArray(v) ? v.join(", ") : ((defaults[field.name] as string) ?? "");
    else out[field.name] = v === null || v === undefined ? ((defaults[field.name] as string) ?? "") : String(v);
  }
  return out;
}

/** Converts form state to a JSON payload matching the API schemas. */
export function toPayload(fields: FieldDef[], values: FormValues): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    const v = values[field.name];
    if (field.type === "switch") out[field.name] = Boolean(v);
    else if (field.type === "list") out[field.name] = splitList(String(v ?? ""));
    else if (field.type === "number") out[field.name] = v === "" || v === undefined ? null : Number(v);
    else out[field.name] = typeof v === "string" ? v.trim() : v;
  }
  return out;
}

interface EntityFormProps {
  id: string;
  fields: FieldDef[];
  values: FormValues;
  onChange: (values: FormValues) => void;
  errors?: Record<string, string>;
  onSubmit: () => void;
  submitLabel?: string;
  busy?: boolean;
  footer?: React.ReactNode;
}

export function EntityForm({ id, fields, values, onChange, errors = {}, onSubmit, submitLabel, busy, footer }: EntityFormProps) {
  const tc = useTranslations("common");
  const set = (name: string, value: string | boolean) => onChange({ ...values, [name]: value });

  return (
    <form
      id={id}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {fields.map((field) => {
        const fid = `${id}-${field.name}`;
        const value = values[field.name];
        const className = cn(field.span === 2 || field.type === "textarea" ? "sm:col-span-2" : "");
        if (field.type === "switch") {
          return (
            <div key={field.name} className={cn("flex items-center justify-between gap-3 rounded-md border px-3 py-2.5", className)}>
              <label htmlFor={fid} className="text-sm font-medium">
                {field.label}
              </label>
              <Switch id={fid} checked={Boolean(value)} onCheckedChange={(c) => set(field.name, c)} />
            </div>
          );
        }
        return (
          <Field
            key={field.name}
            id={fid}
            label={field.label}
            error={errors[field.name]}
            hint={field.type === "list" ? (field.hint ?? tc("commaSeparated")) : field.hint}
            optional={field.required ? undefined : tc("optional")}
            className={className}
          >
            {field.type === "textarea" ? (
              <Textarea id={fid} value={String(value ?? "")} onChange={(e) => set(field.name, e.target.value)} placeholder={field.placeholder} rows={3} />
            ) : field.type === "select" ? (
              <Select value={String(value ?? "")} onValueChange={(v) => set(field.name, v)}>
                <SelectTrigger id={fid}>
                  <SelectValue placeholder={field.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={fid}
                type={field.type === "list" ? "text" : field.type}
                value={String(value ?? "")}
                onChange={(e) => set(field.name, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                min={field.min}
                max={field.max}
                step={field.step ?? (field.type === "number" ? "any" : undefined)}
                dir={field.ltr || field.type === "email" || field.type === "url" ? "ltr" : undefined}
                aria-invalid={Boolean(errors[field.name])}
              />
            )}
          </Field>
        );
      })}
      {(submitLabel || footer) && (
        <div className="flex justify-end gap-2 sm:col-span-2">
          {footer}
          {submitLabel && (
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          )}
        </div>
      )}
    </form>
  );
}
