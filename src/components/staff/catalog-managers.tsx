"use client";

import { useTranslations } from "next-intl";
import { Accessibility, BedDouble, Package, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CrudManager } from "./crud-manager";
import { useDoctorFields, usePackageFields, useRoomFields } from "./field-defs";
import { useFormatters } from "./use-formatters";

function ActiveBadge({ active }: { active: boolean }) {
  const tc = useTranslations("common");
  return <Badge variant={active ? "secondary" : "outline"}>{active ? tc("active") : tc("inactive")}</Badge>;
}

export interface DoctorRow {
  id: string;
  name: string;
  nameAr: string | null;
  specialty: string;
  title: string | null;
  yearsExp: number;
  languages: string[];
  consultationFee: number | null;
  rating: number;
  isActive: boolean;
  _count: { appointments: number };
  [key: string]: unknown;
}

export function DoctorsManager({ rows, facilityId }: { rows: DoctorRow[]; facilityId?: string }) {
  const t = useTranslations("hospital");
  const ta = useTranslations("analytics");
  const tc = useTranslations("common");
  const f = useFormatters();
  return (
    <CrudManager
      rows={rows}
      endpoint="/api/hospital/doctors"
      query={facilityId ? `?facilityId=${facilityId}` : ""}
      fields={useDoctorFields()}
      addLabel={t("addDoctor")}
      editLabel={t("editDoctor")}
      emptyText={t("noDoctors")}
      emptyIcon={Stethoscope}
      columns={[
        {
          header: tc("name"),
          cell: (d) => (
            <div>
              <p className="font-medium">{f.locale === "ar" && d.nameAr ? d.nameAr : d.name}</p>
              <p className="text-xs text-muted-foreground">{d.title}</p>
            </div>
          ),
        },
        { header: t("fields.specialty"), cell: (d) => d.specialty },
        { header: t("fields.languages"), cell: (d) => <span className="text-xs">{d.languages.join(", ")}</span> },
        { header: t("fields.consultationFee"), cell: (d) => <span className="tabular-nums">{f.currency(d.consultationFee)}</span> },
        { header: ta("appointments"), cell: (d) => <span className="tabular-nums">{f.number(d._count.appointments)}</span> },
        { header: tc("status"), cell: (d) => <ActiveBadge active={d.isActive} /> },
      ]}
    />
  );
}

export interface PackageRow {
  id: string;
  name: string;
  nameAr: string | null;
  specialty: string;
  price: number;
  currency: string;
  duration: string | null;
  isActive: boolean;
  _count: { appointments: number };
  [key: string]: unknown;
}

export function PackagesManager({ rows, facilityId }: { rows: PackageRow[]; facilityId?: string }) {
  const t = useTranslations("hospital");
  const tc = useTranslations("common");
  const f = useFormatters();
  return (
    <CrudManager
      rows={rows}
      endpoint="/api/hospital/packages"
      query={facilityId ? `?facilityId=${facilityId}` : ""}
      fields={usePackageFields()}
      defaults={{ currency: "SAR" }}
      addLabel={t("addPackage")}
      editLabel={t("editPackage")}
      emptyText={t("noPackages")}
      emptyIcon={Package}
      columns={[
        { header: tc("name"), cell: (p) => <p className="font-medium">{f.locale === "ar" && p.nameAr ? p.nameAr : p.name}</p> },
        { header: t("fields.specialty"), cell: (p) => p.specialty },
        { header: t("fields.duration"), cell: (p) => p.duration ?? "—" },
        { header: t("fields.price"), cell: (p) => <span className="tabular-nums">{f.currency(p.price, p.currency)}</span> },
        { header: t("bookings"), cell: (p) => <span className="tabular-nums">{f.number(p._count.appointments)}</span> },
        { header: tc("status"), cell: (p) => <ActiveBadge active={p.isActive} /> },
      ]}
    />
  );
}

export interface RoomRow {
  id: string;
  name: string;
  nameAr: string | null;
  capacity: number;
  pricePerNight: number;
  currency: string;
  totalRooms: number;
  accessible: boolean;
  isActive: boolean;
  _count: { bookings: number };
  [key: string]: unknown;
}

export function RoomsManager({ rows, hotelId }: { rows: RoomRow[]; hotelId?: string }) {
  const t = useTranslations("hotelPortal");
  const ta = useTranslations("analytics");
  const tc = useTranslations("common");
  const th = useTranslations("hotels");
  const f = useFormatters();
  return (
    <CrudManager
      rows={rows}
      endpoint="/api/hotel/rooms"
      query={hotelId ? `?hotelId=${hotelId}` : ""}
      fields={useRoomFields()}
      defaults={{ currency: "SAR", capacity: "2", accessible: false, isActive: true }}
      addLabel={t("addRoom")}
      editLabel={t("editRoom")}
      emptyText={t("noRooms")}
      emptyIcon={BedDouble}
      columns={[
        {
          header: tc("name"),
          cell: (r) => (
            <div className="flex items-center gap-2">
              <span className="font-medium">{f.locale === "ar" && r.nameAr ? r.nameAr : r.name}</span>
              {r.accessible && <Accessibility className="h-4 w-4 text-primary" aria-label={th("accessible")} />}
            </div>
          ),
        },
        { header: t("fields.capacity"), cell: (r) => <span className="tabular-nums">{r.capacity}</span> },
        { header: t("inventory"), cell: (r) => <span className="tabular-nums">{f.number(r.totalRooms)}</span> },
        { header: t("fields.pricePerNight"), cell: (r) => <span className="tabular-nums">{f.currency(r.pricePerNight, r.currency)}</span> },
        { header: ta("bookings"), cell: (r) => <span className="tabular-nums">{f.number(r._count.bookings)}</span> },
        { header: tc("status"), cell: (r) => <ActiveBadge active={r.isActive} /> },
      ]}
    />
  );
}
