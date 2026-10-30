"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { CalendarPlus, Loader2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form-field";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch, ApiClientError, fieldErrorsFrom } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";

export interface BookingDoctor {
  id: string;
  name: string;
  nameAr: string | null;
  specialty: string;
  consultationFee: number | null;
}

export interface BookingPackage {
  id: string;
  name: string;
  nameAr: string | null;
  specialty: string;
  price: number;
  currency: string;
}

export interface BookingReport {
  id: string;
  fileName: string;
  specialty: string | null;
  createdAt: Date | string;
}

interface Ctx {
  open: (preset?: { doctorId?: string; packageId?: string }) => void;
  isAuthenticated: boolean;
  loginHref: string;
}

const BookingContext = createContext<Ctx | null>(null);

const TIME_SLOTS = Array.from({ length: 19 }, (_, i) => {
  const minutes = 8 * 60 + i * 30; // 08:00 – 17:00
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

function tomorrowRiyadh(): string {
  const d = new Date(Date.now() + 3 * 3_600_000 + 86_400_000);
  return d.toISOString().slice(0, 10);
}

interface ProviderProps {
  facility: { id: string; name: string; nameAr: string | null; specialties: string[] };
  doctors: BookingDoctor[];
  packages: BookingPackage[];
  reports: BookingReport[];
  isAuthenticated: boolean;
  loginHref: string;
  children: React.ReactNode;
}

export function AppointmentBookingProvider({ facility, doctors, packages, reports, isAuthenticated, loginHref, children }: ProviderProps) {
  const t = useTranslations("booking");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [isOpen, setOpen] = useState(false);
  const [packageId, setPackageId] = useState("none");
  const [doctorId, setDoctorId] = useState("any");
  const [specialty, setSpecialty] = useState("");
  const [date, setDate] = useState(tomorrowRiyadh());
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [reportId, setReportId] = useState("none");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const loc = (o: { name: string; nameAr: string | null }) => (locale === "ar" && o.nameAr ? o.nameAr : o.name);
  const pkg = packages.find((p) => p.id === packageId) ?? null;
  const doctor = doctors.find((d) => d.id === doctorId) ?? null;
  const availableDoctors = pkg ? doctors.filter((d) => d.specialty === pkg.specialty) : doctors;
  const effectiveSpecialty = pkg?.specialty ?? doctor?.specialty ?? specialty;
  const price = pkg ? formatCurrency(pkg.price, locale, pkg.currency) : doctor?.consultationFee ? formatCurrency(doctor.consultationFee, locale) : null;

  const open = (preset?: { doctorId?: string; packageId?: string }) => {
    const presetPkg = packages.find((p) => p.id === preset?.packageId);
    const presetDoctor = doctors.find((d) => d.id === preset?.doctorId);
    setPackageId(presetPkg?.id ?? "none");
    setDoctorId(presetDoctor?.id ?? "any");
    setSpecialty(presetPkg?.specialty ?? presetDoctor?.specialty ?? "");
    setErrors({});
    setOpen(true);
  };

  const submit = async () => {
    setBusy(true);
    setErrors({});
    try {
      const { appointment } = await apiFetch<{ appointment: { reference: string } }>("/api/me/appointments", {
        method: "POST",
        body: {
          facilityId: facility.id,
          doctorId: doctor?.id ?? null,
          packageId: pkg?.id ?? null,
          specialty: effectiveSpecialty || null,
          scheduledAt: `${date}T${time}:00+03:00`,
          notes,
          reportId: reportId === "none" ? null : reportId,
        },
      });
      toast.success(t("success", { reference: appointment.reference }));
      setOpen(false);
      router.push("/dashboard");
    } catch (err) {
      setErrors(fieldErrorsFrom(err));
      toast.error(err instanceof ApiClientError ? err.message : tc("error"));
    } finally {
      setBusy(false);
    }
  };

  const ctx = useMemo(() => ({ open, isAuthenticated, loginHref }), [isAuthenticated, loginHref]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BookingContext.Provider value={ctx}>
      {children}
      <Dialog open={isOpen} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("subtitle", { facility: loc(facility) })}</DialogDescription>
          </DialogHeader>
          <form
            id="appointment-form"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            {packages.length > 0 && (
              <Field id="bk-package" label={t("package")}>
                <Select
                  value={packageId}
                  onValueChange={(v) => {
                    setPackageId(v);
                    const p = packages.find((x) => x.id === v);
                    if (p && doctor && doctor.specialty !== p.specialty) setDoctorId("any");
                  }}
                >
                  <SelectTrigger id="bk-package">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("noPackage")}</SelectItem>
                    {packages.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {loc(p)} · {formatCurrency(p.price, locale, p.currency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field id="bk-doctor" label={t("doctor")}>
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger id="bk-doctor">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{t("anyDoctor")}</SelectItem>
                  {availableDoctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {loc(d)} · {d.specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {!pkg && !doctor && (
              <Field id="bk-specialty" label={t("specialty")} error={errors.specialty}>
                <Select value={specialty} onValueChange={setSpecialty}>
                  <SelectTrigger id="bk-specialty">
                    <SelectValue placeholder={t("chooseSpecialty")} />
                  </SelectTrigger>
                  <SelectContent>
                    {facility.specialties.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field id="bk-date" label={t("date")} error={errors.scheduledAt}>
                <Input id="bk-date" type="date" value={date} min={tomorrowRiyadh()} onChange={(e) => setDate(e.target.value)} required />
              </Field>
              <Field id="bk-time" label={t("time")}>
                <Select value={time} onValueChange={setTime}>
                  <SelectTrigger id="bk-time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {formatDate(`2026-01-01T${s}:00+03:00`, locale, { hour: "numeric", minute: "2-digit" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {reports.length > 0 && (
              <Field id="bk-report" label={t("linkReport")}>
                <Select value={reportId} onValueChange={setReportId}>
                  <SelectTrigger id="bk-report">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("noReport")}</SelectItem>
                    {reports.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.fileName} · {formatDate(r.createdAt, locale)}
                        {r.specialty ? ` · ${r.specialty}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field id="bk-notes" label={t("notes")} optional={tc("optional")}>
              <Textarea id="bk-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notesPlaceholder")} maxLength={1000} />
            </Field>
            <div className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-sm">
              <span className="text-muted-foreground">{t("estimatedPrice")}</span>
              <span className="font-semibold">{price ?? t("priceOnRequest")}</span>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              {tc("cancel")}
            </Button>
            <Button type="submit" form="appointment-form" disabled={busy || (!effectiveSpecialty && !pkg && !doctor)}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? t("submitting") : t("submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BookingContext.Provider>
  );
}

/** Opens the booking dialog (or links to sign-in for guests). */
export function BookAppointmentButton({
  doctorId,
  packageId,
  children,
  ...props
}: { doctorId?: string; packageId?: string; children: React.ReactNode } & Omit<ButtonProps, "onClick">) {
  const ctx = useContext(BookingContext);
  if (!ctx) return null;
  if (!ctx.isAuthenticated) {
    return (
      <Button asChild {...props}>
        <Link href={ctx.loginHref}>{children}</Link>
      </Button>
    );
  }
  return (
    <Button {...props} onClick={() => ctx.open({ doctorId, packageId })}>
      {children}
    </Button>
  );
}

export function BookAppointmentIcon() {
  return <CalendarPlus className="h-4 w-4" />;
}
