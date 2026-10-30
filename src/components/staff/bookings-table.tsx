"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Accessibility, ClipboardList, MoreHorizontal, Stethoscope } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form-field";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/portal/status-badge";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { BOOKING_TRANSITIONS, type BookingStatusValue } from "@/lib/status";
import { nightsBetween } from "@/lib/utils";
import { useFormatters } from "./use-formatters";

export interface StaffBookingRow {
  id: string;
  reference: string;
  status: BookingStatusValue;
  checkIn: Date | string;
  checkOut: Date | string;
  guests: number;
  rooms: number;
  totalPrice: number;
  currency: string;
  specialRequests: string | null;
  managerNotes: string | null;
  cancelledReason: string | null;
  user: { name: string | null; email: string; phone: string | null; nationality: string | null };
  hotel: { name: string; nameAr: string | null };
  roomType: { name: string; nameAr: string | null; accessible: boolean };
  appointment: { reference: string; scheduledAt: Date | string; facility: { name: string; nameAr: string | null } } | null;
}

export function BookingsTable({ rows, showHotel = false }: { rows: StaffBookingRow[]; showHotel?: boolean }) {
  const t = useTranslations("hotelPortal");
  const tp = useTranslations("portal");
  const tc = useTranslations("common");
  const ta = useTranslations("analytics");
  const f = useFormatters();
  const router = useRouter();
  const [active, setActive] = useState<StaffBookingRow | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const loc = (o: { name: string; nameAr: string | null }) => (f.locale === "ar" && o.nameAr ? o.nameAr : o.name);
  const today = new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);

  const open = (row: StaffBookingRow) => {
    setActive(row);
    setCancelling(false);
    setNotes(row.managerNotes ?? "");
    setReason("");
  };

  const update = async (row: StaffBookingRow, body: Record<string, unknown>, success = tp("updated")) => {
    setBusy(true);
    try {
      await apiFetch(`/api/hotel/bookings/${row.id}`, { method: "PATCH", body });
      toast.success(success);
      setActive(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : tc("error"));
    } finally {
      setBusy(false);
    }
  };

  const actionLabel: Partial<Record<BookingStatusValue, string>> = {
    CONFIRMED: t("actions.confirm"),
    CHECKED_IN: t("actions.checkIn"),
    CHECKED_OUT: t("actions.checkOut"),
  };

  if (rows.length === 0) return <EmptyState icon={ClipboardList} title={tc("noResults")} />;

  const transitions = active ? BOOKING_TRANSITIONS[active.status] : [];
  const nights = (r: StaffBookingRow) => nightsBetween(new Date(r.checkIn), new Date(r.checkOut));
  const checkInDay = (r: StaffBookingRow) => new Date(r.checkIn).toISOString().slice(0, 10);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("guest")}</TableHead>
            {showHotel && <TableHead>{ta("hotel")}</TableHead>}
            <TableHead>{t("stay")}</TableHead>
            <TableHead>{t("room")}</TableHead>
            <TableHead>{tc("status")}</TableHead>
            <TableHead className="text-end">{t("total")}</TableHead>
            <TableHead className="text-end">{tc("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <p className="flex items-center gap-1.5 font-medium">
                  {row.user.name ?? row.user.email}
                  {row.appointment && <Stethoscope className="h-3.5 w-3.5 text-primary" aria-label={t("medicalVisit")} />}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{row.reference}</span>
                  {row.user.nationality && ` · ${f.country(row.user.nationality)}`}
                </p>
              </TableCell>
              {showHotel && <TableCell className="max-w-[180px] truncate text-sm">{loc(row.hotel)}</TableCell>}
              <TableCell className="whitespace-nowrap text-sm">
                <p className="tabular-nums">
                  {f.dateOnly(row.checkIn)} – {f.dateOnly(row.checkOut)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tc("nights", { count: nights(row) })} · {tc("guests", { count: row.guests })}
                </p>
              </TableCell>
              <TableCell className="text-sm">
                <p className="flex items-center gap-1.5">
                  {loc(row.roomType)}
                  {row.roomType.accessible && <Accessibility className="h-3.5 w-3.5 text-primary" />}
                </p>
                {row.rooms > 1 && <p className="text-xs text-muted-foreground">{tc("rooms", { count: row.rooms })}</p>}
              </TableCell>
              <TableCell>
                <StatusBadge kind="booking" status={row.status} />
              </TableCell>
              <TableCell className="text-end text-sm tabular-nums">{f.currency(row.totalPrice, row.currency)}</TableCell>
              <TableCell className="text-end">
                <div className="flex items-center justify-end gap-1">
                  {row.status === "PENDING" && (
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => update(row, { status: "CONFIRMED" })}>
                      {t("actions.confirm")}
                    </Button>
                  )}
                  {row.status === "CONFIRMED" && checkInDay(row) <= today && (
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => update(row, { status: "CHECKED_IN" })}>
                      {t("actions.checkIn")}
                    </Button>
                  )}
                  {row.status === "CHECKED_IN" && (
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => update(row, { status: "CHECKED_OUT" })}>
                      {t("actions.checkOut")}
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
                <StatusBadge kind="booking" status={active.status} />
              </DialogTitle>
              <DialogDescription>
                {active.user.name ?? active.user.email} · {f.dateOnly(active.checkIn)} – {f.dateOnly(active.checkOut)}
              </DialogDescription>
            </DialogHeader>
            {!cancelling ? (
              <div className="space-y-4 text-sm">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <dt className="text-muted-foreground">{t("guest")}</dt>
                  <dd>
                    <a href={`mailto:${active.user.email}`} className="text-xs text-primary hover:underline">
                      {active.user.email}
                    </a>
                    {active.user.phone && (
                      <a href={`tel:${active.user.phone}`} className="block text-xs text-primary hover:underline" dir="ltr">
                        {active.user.phone}
                      </a>
                    )}
                  </dd>
                  <dt className="text-muted-foreground">{t("room")}</dt>
                  <dd>
                    {loc(active.roomType)} × {active.rooms}
                  </dd>
                  <dt className="text-muted-foreground">{t("stay")}</dt>
                  <dd>
                    {tc("nights", { count: nights(active) })} · {tc("guests", { count: active.guests })}
                  </dd>
                  <dt className="text-muted-foreground">{t("total")}</dt>
                  <dd className="tabular-nums">{f.currency(active.totalPrice, active.currency)}</dd>
                  {active.appointment && (
                    <>
                      <dt className="text-muted-foreground">{t("medicalVisit")}</dt>
                      <dd>
                        {loc(active.appointment.facility)} · {f.dateTime(active.appointment.scheduledAt)}
                        <span className="block font-mono text-xs text-muted-foreground">{active.appointment.reference}</span>
                      </dd>
                    </>
                  )}
                  {active.cancelledReason && (
                    <>
                      <dt className="text-muted-foreground">{tp("cancelReason")}</dt>
                      <dd>{active.cancelledReason}</dd>
                    </>
                  )}
                </dl>
                {active.specialRequests && (
                  <div className="rounded-md bg-muted/60 p-3">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">{t("specialRequests")}</p>
                    <p>{active.specialRequests}</p>
                  </div>
                )}
                <Field id="manager-notes" label={tp("internalNotes")}>
                  <Textarea id="manager-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={tp("internalNotesPlaceholder")} maxLength={2000} />
                </Field>
                <div className="flex flex-wrap gap-2">
                  {transitions
                    .filter((s) => s !== "CANCELLED")
                    .map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={s === "CONFIRMED" ? "default" : "secondary"}
                        disabled={busy || (s === "CHECKED_IN" && checkInDay(active) > today)}
                        onClick={() => update(active, { status: s })}
                      >
                        {actionLabel[s]}
                      </Button>
                    ))}
                  {transitions.includes("CANCELLED") && (
                    <Button size="sm" variant="outline" className="text-destructive" disabled={busy} onClick={() => setCancelling(true)}>
                      {t("actions.cancel")}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <Field id="booking-cancel-reason" label={tp("cancelReason")}>
                <Textarea id="booking-cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tp("cancelReasonPlaceholder")} maxLength={500} />
              </Field>
            )}
            <DialogFooter>
              {!cancelling ? (
                <>
                  <Button variant="outline" onClick={() => setActive(null)} disabled={busy}>
                    {tc("close")}
                  </Button>
                  <Button disabled={busy || notes === (active.managerNotes ?? "")} onClick={() => update(active, { managerNotes: notes }, tp("notesSaved"))}>
                    {t("actions.saveNotes")}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setCancelling(false)} disabled={busy}>
                    {tc("back")}
                  </Button>
                  <Button variant="destructive" disabled={busy} onClick={() => update(active, { status: "CANCELLED", cancelledReason: reason || null })}>
                    {t("actions.cancel")}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
