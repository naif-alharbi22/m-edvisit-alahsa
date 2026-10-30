"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CalendarCheck, FileText, MoreHorizontal } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form-field";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/portal/status-badge";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { APPOINTMENT_TRANSITIONS, type AppointmentStatusValue } from "@/lib/status";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/format";
import { useFormatters } from "./use-formatters";

export interface StaffAppointmentRow {
  id: string;
  reference: string;
  status: AppointmentStatusValue;
  scheduledAt: Date | string;
  specialty: string;
  price: number | null;
  currency: string;
  patientNotes: string | null;
  adminNotes: string | null;
  cancelledReason: string | null;
  user: { name: string | null; email: string; phone: string | null; nationality: string | null };
  facility: { name: string; nameAr: string | null };
  doctor: { name: string; nameAr: string | null } | null;
  package: { name: string; nameAr: string | null } | null;
  report: { fileName: string; urgency: string | null; summary: string | null } | null;
}

type Mode = "details" | "reschedule" | "cancel";

export function AppointmentsTable({ rows, showFacility = false }: { rows: StaffAppointmentRow[]; showFacility?: boolean }) {
  const t = useTranslations("hospital");
  const tp = useTranslations("portal");
  const tc = useTranslations("common");
  const ta = useTranslations("analytics");
  const f = useFormatters();
  const router = useRouter();
  const [active, setActive] = useState<StaffAppointmentRow | null>(null);
  const [mode, setMode] = useState<Mode>("details");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [newTime, setNewTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());

  const loc = (o: { name: string; nameAr: string | null } | null) => (o ? (f.locale === "ar" && o.nameAr ? o.nameAr : o.name) : null);

  const open = (row: StaffAppointmentRow, m: Mode = "details") => {
    setActive(row);
    setMode(m);
    setNotes(row.adminNotes ?? "");
    setReason("");
    setNewTime(toLocalInputValue(row.scheduledAt));
  };

  const update = async (row: StaffAppointmentRow, body: Record<string, unknown>, success = tp("updated")) => {
    setBusy(true);
    try {
      await apiFetch(`/api/hospital/appointments/${row.id}`, { method: "PATCH", body });
      toast.success(success);
      setActive(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : tc("error"));
    } finally {
      setBusy(false);
    }
  };

  const actionLabel: Partial<Record<AppointmentStatusValue, string>> = {
    CONFIRMED: t("actions.confirm"),
    COMPLETED: t("actions.complete"),
    NO_SHOW: t("actions.noShow"),
  };

  if (rows.length === 0) {
    return <EmptyState icon={CalendarCheck} title={tc("noResults")} />;
  }

  const transitions = active ? APPOINTMENT_TRANSITIONS[active.status] : [];
  const isPast = active ? new Date(active.scheduledAt).getTime() < now : false;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tp("patient")}</TableHead>
            {showFacility && <TableHead>{ta("facility")}</TableHead>}
            <TableHead>{t("scheduled")}</TableHead>
            <TableHead>{t("doctorPackage")}</TableHead>
            <TableHead>{tc("status")}</TableHead>
            <TableHead className="text-end">{t("price")}</TableHead>
            <TableHead className="text-end">{tc("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <p className="font-medium">{row.user.name ?? row.user.email}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{row.reference}</span>
                  {row.user.nationality && ` · ${f.country(row.user.nationality)}`}
                </p>
              </TableCell>
              {showFacility && <TableCell className="max-w-[180px] truncate text-sm">{loc(row.facility)}</TableCell>}
              <TableCell className="whitespace-nowrap text-sm tabular-nums">{f.dateTime(row.scheduledAt)}</TableCell>
              <TableCell className="text-sm">
                <p>{row.specialty}</p>
                <p className="max-w-[220px] truncate text-xs text-muted-foreground">
                  {[loc(row.doctor), loc(row.package)].filter(Boolean).join(" · ") || "—"}
                </p>
              </TableCell>
              <TableCell>
                <StatusBadge kind="appointment" status={row.status} />
              </TableCell>
              <TableCell className="text-end text-sm tabular-nums">{f.currency(row.price, row.currency)}</TableCell>
              <TableCell className="text-end">
                <div className="flex items-center justify-end gap-1">
                  {row.status === "PENDING" && (
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => update(row, { status: "CONFIRMED" })}>
                      {t("actions.confirm")}
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => open(row)} aria-label={tp("openRecord")}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={Boolean(active)} onOpenChange={(o) => !o && !busy && setActive(null)}>
        {active && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                <span className="font-mono">{active.reference}</span>
                <StatusBadge kind="appointment" status={active.status} />
              </DialogTitle>
              <DialogDescription>
                {active.user.name ?? active.user.email} · {f.dateTime(active.scheduledAt)}
              </DialogDescription>
            </DialogHeader>

            {mode === "details" && (
              <div className="space-y-4 text-sm">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <dt className="text-muted-foreground">{tp("patient")}</dt>
                  <dd>
                    <p>{active.user.name}</p>
                    <a href={`mailto:${active.user.email}`} className="text-xs text-primary hover:underline">
                      {active.user.email}
                    </a>
                    {active.user.phone && (
                      <a href={`tel:${active.user.phone}`} className="block text-xs text-primary hover:underline" dir="ltr">
                        {active.user.phone}
                      </a>
                    )}
                  </dd>
                  <dt className="text-muted-foreground">{t("doctorPackage")}</dt>
                  <dd>{[active.specialty, loc(active.doctor), loc(active.package)].filter(Boolean).join(" · ")}</dd>
                  <dt className="text-muted-foreground">{t("price")}</dt>
                  <dd className="tabular-nums">{f.currency(active.price, active.currency)}</dd>
                  {active.cancelledReason && (
                    <>
                      <dt className="text-muted-foreground">{tp("cancelReason")}</dt>
                      <dd>{active.cancelledReason}</dd>
                    </>
                  )}
                </dl>
                {active.patientNotes && (
                  <div className="rounded-md bg-muted/60 p-3">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">{t("patientNotes")}</p>
                    <p>{active.patientNotes}</p>
                  </div>
                )}
                {active.report && (
                  <div className="rounded-md border p-3">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" /> {t("attachedReport")}
                      {active.report.urgency && <StatusBadge kind="urgency" status={active.report.urgency} className="ms-auto" />}
                    </p>
                    <p className="text-xs">{active.report.fileName}</p>
                    {active.report.summary && <p className="mt-1">{active.report.summary}</p>}
                  </div>
                )}
                <Field id="admin-notes" label={tp("internalNotes")}>
                  <Textarea id="admin-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={tp("internalNotesPlaceholder")} maxLength={2000} />
                </Field>
                <div className="flex flex-wrap gap-2">
                  {transitions
                    .filter((s) => s !== "CANCELLED")
                    .map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={s === "CONFIRMED" ? "default" : "secondary"}
                        disabled={busy || ((s === "COMPLETED" || s === "NO_SHOW") && !isPast)}
                        onClick={() => update(active, { status: s })}
                      >
                        {actionLabel[s]}
                      </Button>
                    ))}
                  {(active.status === "PENDING" || active.status === "CONFIRMED") && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => setMode("reschedule")}>
                      {t("actions.reschedule")}
                    </Button>
                  )}
                  {transitions.includes("CANCELLED") && (
                    <Button size="sm" variant="outline" className="text-destructive" disabled={busy} onClick={() => setMode("cancel")}>
                      {t("actions.cancel")}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {mode === "reschedule" && (
              <Field id="new-time" label={t("newTime")}>
                <Input id="new-time" type="datetime-local" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
              </Field>
            )}

            {mode === "cancel" && (
              <Field id="cancel-reason" label={tp("cancelReason")}>
                <Textarea id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tp("cancelReasonPlaceholder")} maxLength={500} />
              </Field>
            )}

            <DialogFooter>
              {mode === "details" ? (
                <>
                  <Button variant="outline" onClick={() => setActive(null)} disabled={busy}>
                    {tc("close")}
                  </Button>
                  <Button disabled={busy || notes === (active.adminNotes ?? "")} onClick={() => update(active, { adminNotes: notes }, tp("notesSaved"))}>
                    {t("actions.saveNotes")}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setMode("details")} disabled={busy}>
                    {tc("back")}
                  </Button>
                  {mode === "reschedule" ? (
                    <Button disabled={busy || !newTime} onClick={() => update(active, { scheduledAt: fromLocalInputValue(newTime) })}>
                      {t("actions.reschedule")}
                    </Button>
                  ) : (
                    <Button variant="destructive" disabled={busy} onClick={() => update(active, { status: "CANCELLED", cancelledReason: reason || null })}>
                      {t("actions.cancel")}
                    </Button>
                  )}
                </>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
