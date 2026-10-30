"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch, ApiClientError, fieldErrorsFrom } from "@/lib/api-client";
import { EntityForm, toFormValues, toPayload, type FieldDef, type FormValues } from "./entity-form";

export interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

interface CrudManagerProps<T extends { id: string }> {
  rows: T[];
  columns: Column<T>[];
  fields: FieldDef[];
  /** Collection endpoint, e.g. /api/hospital/doctors */
  endpoint: string;
  /** Extra query string appended to every request (e.g. ?facilityId=...) */
  query?: string;
  addLabel: string;
  editLabel: string;
  emptyText: string;
  emptyIcon?: LucideIcon;
  defaults?: FormValues;
  allowDelete?: boolean;
  /** Extra per-row actions rendered before edit/delete. */
  rowActions?: (row: T) => React.ReactNode;
}

export function CrudManager<T extends { id: string }>({
  rows,
  columns,
  fields,
  endpoint,
  query = "",
  addLabel,
  editLabel,
  emptyText,
  emptyIcon,
  defaults,
  allowDelete = true,
  rowActions,
}: CrudManagerProps<T>) {
  const tc = useTranslations("common");
  const router = useRouter();
  const [editing, setEditing] = useState<T | "new" | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<T | null>(null);

  const openEditor = (row: T | "new") => {
    setEditing(row);
    setErrors({});
    setValues(toFormValues(fields, row === "new" ? null : (row as unknown as Record<string, unknown>), defaults));
  };

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    setErrors({});
    try {
      const url = editing === "new" ? `${endpoint}${query}` : `${endpoint}/${editing.id}${query}`;
      await apiFetch(url, { method: editing === "new" ? "POST" : "PATCH", body: toPayload(fields, values) });
      toast.success(tc("saved"));
      setEditing(null);
      router.refresh();
    } catch (err) {
      setErrors(fieldErrorsFrom(err));
      toast.error(err instanceof ApiClientError ? err.message : tc("error"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      const result = await apiFetch<{ deleted?: boolean; deactivated?: boolean } | undefined>(`${endpoint}/${deleting.id}${query}`, {
        method: "DELETE",
      });
      toast.success(result?.deactivated ? tc("deactivatedInstead") : tc("deleted"));
      setDeleting(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : tc("error"));
    }
  };

  return (
    <Card className="shadow-none">
      <div className="flex justify-end border-b p-3">
        <Button onClick={() => openEditor("new")}>
          <Plus className="h-4 w-4" /> {addLabel}
        </Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyText} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.header} className={c.className}>
                  {c.header}
                </TableHead>
              ))}
              <TableHead className="text-end">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {columns.map((c) => (
                  <TableCell key={c.header} className={c.className}>
                    {c.cell(row)}
                  </TableCell>
                ))}
                <TableCell className="text-end">
                  <div className="flex items-center justify-end gap-1">
                    {rowActions?.(row)}
                    <Button size="icon" variant="ghost" onClick={() => openEditor(row)} aria-label={tc("edit")}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {allowDelete && (
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleting(row)} aria-label={tc("delete")}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && !busy && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? addLabel : editLabel}</DialogTitle>
          </DialogHeader>
          <EntityForm id="crud-form" fields={fields} values={values} onChange={setValues} errors={errors} onSubmit={save} busy={busy} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>
              {tc("cancel")}
            </Button>
            <Button type="submit" form="crud-form" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={tc("delete")}
        description={tc("confirmDelete")}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        destructive
        onConfirm={remove}
      />
    </Card>
  );
}
