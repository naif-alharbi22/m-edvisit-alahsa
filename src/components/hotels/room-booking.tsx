"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Accessibility, BedDouble, Loader2, Maximize2, Users } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form-field";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { formatCurrency, formatDateOnly, formatDateTime } from "@/lib/format";

export interface RoomTypeData {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  capacity: number;
  bedType: string | null;
  sizeSqm: number | null;
  pricePerNight: number;
  currency: string;
  amenities: string[];
  accessible: boolean;
}

interface Availability {
  nights: number;
  roomTypes: { roomTypeId: string; available: number; bookable: boolean; totalPrice: number; currency: string }[];
}

export interface UpcomingAppointment {
  id: string;
  reference: string;
  scheduledAt: Date | string;
  facilityName: string;
}

function isoDay(offsetDays: number) {
  return new Date(Date.now() + 3 * 3_600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

export function RoomBooking({
  hotelId,
  roomTypes,
  isAuthenticated,
  loginHref,
  appointments,
}: {
  hotelId: string;
  roomTypes: RoomTypeData[];
  isAuthenticated: boolean;
  loginHref: string;
  appointments: UpcomingAppointment[];
}) {
  const t = useTranslations("hotels");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [checkIn, setCheckIn] = useState(isoDay(1));
  const [checkOut, setCheckOut] = useState(isoDay(4));
  const [rooms, setRooms] = useState("1");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [checking, setChecking] = useState(false);
  const [selected, setSelected] = useState<RoomTypeData | null>(null);
  const [guests, setGuests] = useState("1");
  const [appointmentId, setAppointmentId] = useState("none");
  const [requests, setRequests] = useState("");
  const [busy, setBusy] = useState(false);

  const loc = (r: RoomTypeData, field: "name" | "description") =>
    locale === "ar" && r[`${field}Ar`] ? (r[`${field}Ar`] as string) : (r[field] ?? "");

  const check = async () => {
    setChecking(true);
    try {
      const params = new URLSearchParams({ checkIn, checkOut, rooms });
      setAvailability(await apiFetch<Availability>(`/api/hotels/${hotelId}/availability?${params}`));
    } catch (err) {
      setAvailability(null);
      toast.error(err instanceof ApiClientError ? err.message : tc("error"));
    } finally {
      setChecking(false);
    }
  };

  const book = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const { booking } = await apiFetch<{ booking: { reference: string } }>("/api/me/bookings", {
        method: "POST",
        body: {
          hotelId,
          roomTypeId: selected.id,
          checkIn,
          checkOut,
          rooms: Number(rooms),
          guests: Number(guests),
          appointmentId: appointmentId === "none" ? null : appointmentId,
          specialRequests: requests,
        },
      });
      toast.success(t("bookingSuccess", { reference: booking.reference }));
      setSelected(null);
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : tc("error"));
      void check();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid grid-cols-2 gap-3 pt-6 md:grid-cols-4 md:items-end">
          <Field id="ci" label={t("checkIn")}>
            <Input id="ci" type="date" value={checkIn} min={isoDay(0)} onChange={(e) => { setCheckIn(e.target.value); setAvailability(null); }} />
          </Field>
          <Field id="co" label={t("checkOut")}>
            <Input id="co" type="date" value={checkOut} min={checkIn} onChange={(e) => { setCheckOut(e.target.value); setAvailability(null); }} />
          </Field>
          <Field id="rooms" label={t("rooms")}>
            <Select value={rooms} onValueChange={(v) => { setRooms(v); setAvailability(null); }}>
              <SelectTrigger id="rooms">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {tc("rooms", { count: n })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Button onClick={check} disabled={checking || !checkIn || !checkOut} className="col-span-2 md:col-span-1">
            {checking && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("checkAvailability")}
          </Button>
        </CardContent>
      </Card>
      {!availability && <p className="text-sm text-muted-foreground">{t("selectDates")}</p>}

      <div className="space-y-3">
        {roomTypes.map((room) => {
          const a = availability?.roomTypes.find((x) => x.roomTypeId === room.id);
          return (
            <Card key={room.id}>
              <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 font-semibold">
                    {loc(room, "name")}
                    {room.accessible && (
                      <Badge variant="outline" className="gap-1 text-xs font-normal">
                        <Accessibility className="h-3 w-3 text-primary" /> {t("accessible")}
                      </Badge>
                    )}
                  </h3>
                  {loc(room, "description") && <p className="text-sm text-muted-foreground">{loc(room, "description")}</p>}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {t("capacity", { count: room.capacity })}
                    </span>
                    {room.bedType && (
                      <span className="flex items-center gap-1">
                        <BedDouble className="h-3.5 w-3.5" /> {room.bedType}
                      </span>
                    )}
                    {room.sizeSqm && (
                      <span className="flex items-center gap-1">
                        <Maximize2 className="h-3.5 w-3.5" /> {t("size", { size: room.sizeSqm })}
                      </span>
                    )}
                  </div>
                  {room.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {room.amenities.map((am) => (
                        <Badge key={am} variant="secondary" className="text-xs font-normal">
                          {am}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
                  <p>
                    <span className="text-lg font-bold">{formatCurrency(room.pricePerNight, locale, room.currency)}</span>
                    <span className="text-sm text-muted-foreground"> / {t("perNightShort")}</span>
                  </p>
                  {a && (
                    <>
                      <p className="text-sm">
                        {t("totalFor", { nights: tc("nights", { count: availability!.nights }) })}:{" "}
                        <span className="font-semibold">{formatCurrency(a.totalPrice, locale, a.currency)}</span>
                      </p>
                      <p className={`text-xs ${a.bookable ? "text-[var(--delta-good)]" : "text-destructive"}`}>
                        {a.bookable ? t("available", { count: a.available }) : t("soldOut")}
                      </p>
                    </>
                  )}
                  {a?.bookable &&
                    (isAuthenticated ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelected(room);
                          setGuests(String(Math.min(room.capacity * Number(rooms), 2)));
                        }}
                      >
                        {t("book")}
                      </Button>
                    ) : (
                      <Button asChild size="sm">
                        <Link href={loginHref}>{t("signInToBook")}</Link>
                      </Button>
                    ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && !busy && setSelected(null)}>
        {selected && availability && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("bookRoom", { room: loc(selected, "name") })}</DialogTitle>
              <DialogDescription>
                {formatDateOnly(checkIn, locale)} – {formatDateOnly(checkOut, locale)} · {tc("nights", { count: availability.nights })} ·{" "}
                {tc("rooms", { count: Number(rooms) })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Field id="bk-guests" label={t("guests")}>
                <Select value={guests} onValueChange={setGuests}>
                  <SelectTrigger id="bk-guests">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: selected.capacity * Number(rooms) }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {tc("guests", { count: n })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {appointments.length > 0 && (
                <Field id="bk-appt" label={t("linkAppointment")}>
                  <Select value={appointmentId} onValueChange={setAppointmentId}>
                    <SelectTrigger id="bk-appt">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("noAppointment")}</SelectItem>
                      {appointments.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.facilityName} · {formatDateTime(a.scheduledAt, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              <Field id="bk-req" label={t("specialRequests")} optional={tc("optional")}>
                <Textarea id="bk-req" value={requests} onChange={(e) => setRequests(e.target.value)} placeholder={t("specialRequestsPlaceholder")} maxLength={1000} />
              </Field>
              <div className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-sm">
                <span className="text-muted-foreground">{t("totalFor", { nights: tc("nights", { count: availability.nights }) })}</span>
                <span className="font-semibold">
                  {formatCurrency(availability.roomTypes.find((x) => x.roomTypeId === selected.id)?.totalPrice ?? 0, locale, selected.currency)}
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelected(null)} disabled={busy}>
                {tc("cancel")}
              </Button>
              <Button onClick={book} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy ? t("booking") : t("confirmBooking")}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
