"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { BedDouble, Building2, CalendarCheck, Hotel, Loader2, Plus, Settings2, UserCog, Users } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/ui/form-field";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch, ApiClientError, fieldErrorsFrom } from "@/lib/api-client";
import { ROLES, type AppRole } from "@/lib/roles";
import { CrudManager } from "./crud-manager";
import { useFacilityFields, useHotelFields } from "./field-defs";
import { useFormatters } from "./use-formatters";

interface Option {
  id: string;
  name: string;
  nameAr: string | null;
}

// ─── Users ──────────────────────────────────────────────────────────────────

export interface AdminUserRow {
  id: string;
  name: string | null;
  email: string;
  role: AppRole;
  isActive: boolean;
  nationality: string | null;
  facilityId: string | null;
  hotelId: string | null;
  lastLoginAt: Date | string | null;
  createdAt: Date | string;
  facility: { id: string; name: string } | null;
  hotel: { id: string; name: string } | null;
  _count: { appointments: number; hotelBookings: number };
}

const ROLE_STYLE: Record<AppRole, string> = {
  SUPER_ADMIN: "bg-violet-50 text-violet-800 ring-violet-600/20",
  HOSPITAL_ADMIN: "bg-blue-50 text-blue-800 ring-blue-600/20",
  HOTEL_MANAGER: "bg-teal-50 text-teal-800 ring-teal-600/20",
  PATIENT: "bg-zinc-100 text-zinc-700 ring-zinc-500/20",
};

interface UserFormState {
  name: string;
  email: string;
  password: string;
  role: AppRole;
  facilityId: string;
  hotelId: string;
  isActive: boolean;
}

export function UsersManager({ rows, facilities, hotels, currentUserId }: { rows: AdminUserRow[]; facilities: Option[]; hotels: Option[]; currentUserId: string }) {
  const t = useTranslations("admin");
  const tr = useTranslations("roles");
  const tc = useTranslations("common");
  const ta = useTranslations("auth");
  const tan = useTranslations("analytics");
  const f = useFormatters();
  const router = useRouter();
  const [editing, setEditing] = useState<AdminUserRow | "new" | null>(null);
  const [form, setForm] = useState<UserFormState>({ name: "", email: "", password: "", role: "HOSPITAL_ADMIN", facilityId: "", hotelId: "", isActive: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const loc = (o: Option) => (f.locale === "ar" && o.nameAr ? o.nameAr : o.name);

  const open = (row: AdminUserRow | "new") => {
    setErrors({});
    setEditing(row);
    setForm(
      row === "new"
        ? { name: "", email: "", password: "", role: "HOSPITAL_ADMIN", facilityId: "", hotelId: "", isActive: true }
        : { name: row.name ?? "", email: row.email, password: "", role: row.role, facilityId: row.facilityId ?? "", hotelId: row.hotelId ?? "", isActive: row.isActive }
    );
  };

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    setErrors({});
    try {
      if (editing === "new") {
        await apiFetch("/api/admin/users", {
          method: "POST",
          body: { name: form.name, email: form.email, password: form.password, role: form.role, facilityId: form.facilityId || null, hotelId: form.hotelId || null },
        });
      } else {
        await apiFetch(`/api/admin/users/${editing.id}`, {
          method: "PATCH",
          body: { name: form.name, role: form.role, facilityId: form.facilityId || null, hotelId: form.hotelId || null, isActive: form.isActive },
        });
      }
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

  const isSelf = editing !== "new" && editing?.id === currentUserId;

  return (
    <>
      <div className="flex justify-end border-b p-3">
        <Button onClick={() => open("new")}>
          <Plus className="h-4 w-4" /> {t("addUser")}
        </Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={Users} title={tc("noResults")} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tc("name")}</TableHead>
              <TableHead>{t("role")}</TableHead>
              <TableHead>{t("assignment")}</TableHead>
              <TableHead>{tc("status")}</TableHead>
              <TableHead>{t("joined")}</TableHead>
              <TableHead>{t("lastLogin")}</TableHead>
              <TableHead className="text-end">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <p className="font-medium">{u.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${ROLE_STYLE[u.role]}`}>{tr(u.role)}</span>
                </TableCell>
                <TableCell className="text-sm">
                  {u.facility ? (
                    <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{u.facility.name}</span>
                  ) : u.hotel ? (
                    <span className="flex items-center gap-1.5"><Hotel className="h-3.5 w-3.5 text-muted-foreground" />{u.hotel.name}</span>
                  ) : u.role === "PATIENT" ? (
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {u.nationality ? f.country(u.nationality) : "—"}
                      <span className="inline-flex items-center gap-0.5" title={tan("appointments")}>
                        <CalendarCheck className="h-3 w-3" aria-hidden /> {u._count.appointments}
                      </span>
                      <span className="inline-flex items-center gap-0.5" title={tan("bookings")}>
                        <BedDouble className="h-3 w-3" aria-hidden /> {u._count.hotelBookings}
                      </span>
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={u.isActive ? "secondary" : "outline"}>{u.isActive ? tc("active") : tc("inactive")}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm tabular-nums">{f.date(u.createdAt)}</TableCell>
                <TableCell className="whitespace-nowrap text-sm tabular-nums">{u.lastLoginAt ? f.dateTime(u.lastLoginAt) : t("never")}</TableCell>
                <TableCell className="text-end">
                  <Button size="icon" variant="ghost" onClick={() => open(u)} aria-label={t("editUser")}>
                    <UserCog className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && !busy && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? t("addUser") : t("editUser")}</DialogTitle>
          </DialogHeader>
          <form
            id="user-form"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <Field id="u-name" label={ta("name")} error={errors.name}>
              <Input id="u-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
            </Field>
            <Field id="u-email" label={ta("email")} error={errors.email}>
              <Input id="u-email" type="email" value={form.email} disabled={editing !== "new"} onChange={(e) => setForm({ ...form, email: e.target.value })} required dir="ltr" />
            </Field>
            {editing === "new" && (
              <Field id="u-password" label={ta("password")} error={errors.password} hint={ta("passwordHint")}>
                <Input id="u-password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
              </Field>
            )}
            <Field id="u-role" label={t("role")} error={errors.role}>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })} disabled={isSelf}>
                <SelectTrigger id="u-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {tr(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {form.role === "HOSPITAL_ADMIN" && (
              <Field id="u-facility" label={t("assignFacility")} error={errors.facilityId}>
                <Select value={form.facilityId} onValueChange={(v) => setForm({ ...form, facilityId: v })}>
                  <SelectTrigger id="u-facility">
                    <SelectValue placeholder={t("selectFacility")} />
                  </SelectTrigger>
                  <SelectContent>
                    {facilities.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {loc(o)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            {form.role === "HOTEL_MANAGER" && (
              <Field id="u-hotel" label={t("assignHotel")} error={errors.hotelId}>
                <Select value={form.hotelId} onValueChange={(v) => setForm({ ...form, hotelId: v })}>
                  <SelectTrigger id="u-hotel">
                    <SelectValue placeholder={t("selectHotel")} />
                  </SelectTrigger>
                  <SelectContent>
                    {hotels.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {loc(o)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            {editing !== "new" && (
              <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
                <label htmlFor="u-active" className="text-sm font-medium">
                  {t("accountActive")}
                </label>
                <Switch id="u-active" checked={form.isActive} disabled={isSelf} onCheckedChange={(c) => setForm({ ...form, isActive: c })} />
              </div>
            )}
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>
              {tc("cancel")}
            </Button>
            <Button type="submit" form="user-form" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Facilities & hotels ────────────────────────────────────────────────────

export interface AdminFacilityRow {
  id: string;
  name: string;
  nameAr: string | null;
  type: string;
  city: string;
  rating: number;
  isActive: boolean;
  _count: { doctors: number; treatmentPackages: number; appointments: number; staff: number };
  [key: string]: unknown;
}

export function FacilitiesManager({ rows }: { rows: AdminFacilityRow[] }) {
  const t = useTranslations("admin");
  const th = useTranslations("hospital");
  const tf = useTranslations("facilities");
  const ta = useTranslations("analytics");
  const tc = useTranslations("common");
  const f = useFormatters();
  return (
    <CrudManager
      rows={rows}
      endpoint="/api/admin/facilities"
      fields={useFacilityFields(true)}
      defaults={{ city: "Al-Ahsa", type: "HOSPITAL", isActive: true }}
      addLabel={t("addFacility")}
      editLabel={t("editFacility")}
      emptyText={tc("noResults")}
      emptyIcon={Building2}
      rowActions={(r) => (
        <Button asChild size="icon" variant="ghost" aria-label={t("manageCatalog")}>
          <Link href={`/admin/facilities/${r.id}`}>
            <Settings2 className="h-4 w-4" />
          </Link>
        </Button>
      )}
      columns={[
        {
          header: tc("name"),
          cell: (r) => (
            <Link href={`/admin/facilities/${r.id}`} className="hover:underline">
              <p className="font-medium">{f.locale === "ar" && r.nameAr ? r.nameAr : r.name}</p>
              <p className="text-xs text-muted-foreground">
                {tf(`type.${r.type}` as never)} · {r.city}
              </p>
            </Link>
          ),
        },
        { header: tf("doctors"), cell: (r) => <span className="tabular-nums">{r._count.doctors}</span> },
        { header: th("nav.packages"), cell: (r) => <span className="tabular-nums">{r._count.treatmentPackages}</span> },
        { header: ta("appointments"), cell: (r) => <span className="tabular-nums">{f.number(r._count.appointments)}</span> },
        { header: t("staff"), cell: (r) => <span className="tabular-nums">{r._count.staff}</span> },
        { header: tc("rating"), cell: (r) => <span className="tabular-nums">{r.rating.toFixed(1)}</span> },
        { header: tc("status"), cell: (r) => <Badge variant={r.isActive ? "secondary" : "outline"}>{r.isActive ? t("visible") : t("hidden")}</Badge> },
      ]}
    />
  );
}

export interface AdminHotelRow {
  id: string;
  name: string;
  nameAr: string | null;
  city: string;
  starRating: number;
  rating: number;
  isActive: boolean;
  totalRooms: number;
  roomTypeCount: number;
  _count: { bookings: number; staff: number };
  [key: string]: unknown;
}

export function HotelsManager({ rows }: { rows: AdminHotelRow[] }) {
  const t = useTranslations("admin");
  const th = useTranslations("hotelPortal");
  const ta = useTranslations("analytics");
  const tc = useTranslations("common");
  const f = useFormatters();
  return (
    <CrudManager
      rows={rows}
      endpoint="/api/admin/hotels"
      fields={useHotelFields(true)}
      defaults={{ city: "Al-Ahsa", starRating: "4", checkInTime: "14:00", checkOutTime: "12:00", isActive: true }}
      addLabel={t("addHotel")}
      editLabel={t("editHotel")}
      emptyText={tc("noResults")}
      emptyIcon={Hotel}
      rowActions={(r) => (
        <Button asChild size="icon" variant="ghost" aria-label={t("manageRooms")}>
          <Link href={`/admin/hotels/${r.id}`}>
            <Settings2 className="h-4 w-4" />
          </Link>
        </Button>
      )}
      columns={[
        {
          header: tc("name"),
          cell: (r) => (
            <Link href={`/admin/hotels/${r.id}`} className="hover:underline">
              <p className="font-medium">{f.locale === "ar" && r.nameAr ? r.nameAr : r.name}</p>
              <p className="text-xs text-muted-foreground">
                {"★".repeat(r.starRating)} · {r.city}
              </p>
            </Link>
          ),
        },
        { header: th("nav.rooms"), cell: (r) => <span className="tabular-nums">{r.roomTypeCount}</span> },
        { header: th("inventory"), cell: (r) => <span className="tabular-nums">{r.totalRooms}</span> },
        { header: ta("bookings"), cell: (r) => <span className="tabular-nums">{f.number(r._count.bookings)}</span> },
        { header: t("staff"), cell: (r) => <span className="tabular-nums">{r._count.staff}</span> },
        { header: tc("rating"), cell: (r) => <span className="tabular-nums">{r.rating.toFixed(1)}</span> },
        { header: tc("status"), cell: (r) => <Badge variant={r.isActive ? "secondary" : "outline"}>{r.isActive ? t("visible") : t("hidden")}</Badge> },
      ]}
    />
  );
}

// ─── Audit log ──────────────────────────────────────────────────────────────

export interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: Date | string;
  actor: { name: string | null; email: string; role: string } | null;
}

export function AuditTable({ rows }: { rows: AuditRow[] }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const f = useFormatters();
  if (rows.length === 0) return <EmptyState title={tc("noResults")} />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("time")}</TableHead>
          <TableHead>{t("actor")}</TableHead>
          <TableHead>{t("action")}</TableHead>
          <TableHead>{t("entity")}</TableHead>
          <TableHead>{tc("details")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="whitespace-nowrap text-xs tabular-nums">{f.dateTime(r.createdAt)}</TableCell>
            <TableCell className="text-sm">
              {r.actor ? (
                <>
                  <p className="font-medium">{r.actor.name ?? r.actor.email}</p>
                  <p className="text-xs text-muted-foreground">{r.actor.email}</p>
                </>
              ) : (
                <span className="text-muted-foreground">{t("system")}</span>
              )}
            </TableCell>
            <TableCell>
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.action}</code>
            </TableCell>
            <TableCell className="text-xs">
              <p>{r.entityType}</p>
              {r.entityId && <p className="max-w-[160px] truncate font-mono text-muted-foreground">{r.entityId}</p>}
            </TableCell>
            <TableCell className="max-w-[280px] text-xs text-muted-foreground">
              {r.metadata ? <span className="line-clamp-2 break-all font-mono" dir="ltr">{JSON.stringify(r.metadata)}</span> : "—"}
              {r.ipAddress && <span className="block font-mono" dir="ltr">{r.ipAddress}</span>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
