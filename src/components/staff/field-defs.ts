"use client";

import { useTranslations } from "next-intl";
import type { FieldDef } from "./entity-form";

/** Field definitions shared by create/edit dialogs and profile forms. */
export function useFacilityFields(includeActive: boolean): FieldDef[] {
  const t = useTranslations("hospital.fields");
  const tf = useTranslations("facilities.type");
  const fields: FieldDef[] = [
    { name: "name", label: t("name"), type: "text", required: true },
    { name: "nameAr", label: t("nameAr"), type: "text" },
    {
      name: "type",
      label: t("type"),
      type: "select",
      required: true,
      options: (["HOSPITAL", "CLINIC", "MEDICAL_CENTER"] as const).map((v) => ({ value: v, label: tf(v) })),
    },
    { name: "city", label: t("city"), type: "text", required: true },
    { name: "address", label: t("address"), type: "text", span: 2 },
    { name: "phone", label: t("phone"), type: "text", ltr: true },
    { name: "email", label: t("email"), type: "email" },
    { name: "website", label: t("website"), type: "url", placeholder: "https://" },
    { name: "image", label: t("image"), type: "url", placeholder: "https://" },
    { name: "specialties", label: t("specialties"), type: "list", span: 2 },
    { name: "accreditations", label: t("accreditations"), type: "list", span: 2 },
    { name: "latitude", label: t("latitude"), type: "number", min: -90, max: 90 },
    { name: "longitude", label: t("longitude"), type: "number", min: -180, max: 180 },
    { name: "description", label: t("description"), type: "textarea" },
    { name: "descriptionAr", label: t("descriptionAr"), type: "textarea" },
  ];
  if (includeActive) fields.push({ name: "isActive", label: t("isActive"), type: "switch", span: 2 });
  return fields;
}

export function useDoctorFields(): FieldDef[] {
  const t = useTranslations("hospital.fields");
  return [
    { name: "name", label: t("name"), type: "text", required: true },
    { name: "nameAr", label: t("nameAr"), type: "text" },
    { name: "specialty", label: t("specialty"), type: "text", required: true },
    { name: "title", label: t("title"), type: "text" },
    { name: "yearsExp", label: t("yearsExp"), type: "number", min: 0, max: 70, step: 1 },
    { name: "consultationFee", label: t("consultationFee"), type: "number", min: 0 },
    { name: "languages", label: t("languages"), type: "list", span: 2 },
    { name: "image", label: t("image"), type: "url", span: 2, placeholder: "https://" },
    { name: "bio", label: t("bio"), type: "textarea" },
    { name: "bioAr", label: t("bioAr"), type: "textarea" },
    { name: "isActive", label: t("isActive"), type: "switch", span: 2 },
  ];
}

export function usePackageFields(): FieldDef[] {
  const t = useTranslations("hospital.fields");
  return [
    { name: "name", label: t("name"), type: "text", required: true },
    { name: "nameAr", label: t("nameAr"), type: "text" },
    { name: "specialty", label: t("specialty"), type: "text", required: true },
    { name: "duration", label: t("duration"), type: "text" },
    { name: "price", label: t("price"), type: "number", required: true, min: 0 },
    { name: "currency", label: t("currency"), type: "text", required: true, ltr: true },
    { name: "includes", label: t("includes"), type: "list", span: 2 },
    { name: "description", label: t("description"), type: "textarea" },
    { name: "descriptionAr", label: t("descriptionAr"), type: "textarea" },
    { name: "isActive", label: t("isActive"), type: "switch", span: 2 },
  ];
}

export function useHotelFields(includeActive: boolean): FieldDef[] {
  const t = useTranslations("hotelPortal.fields");
  const tc = useTranslations("hospital.fields");
  const fields: FieldDef[] = [
    { name: "name", label: t("name"), type: "text", required: true },
    { name: "nameAr", label: t("nameAr"), type: "text" },
    {
      name: "starRating",
      label: t("starRating"),
      type: "select",
      required: true,
      options: ["1", "2", "3", "4", "5"].map((v) => ({ value: v, label: "★".repeat(Number(v)) })),
    },
    { name: "city", label: t("city"), type: "text", required: true },
    { name: "address", label: t("address"), type: "text", span: 2 },
    { name: "phone", label: t("phone"), type: "text", ltr: true },
    { name: "email", label: t("email"), type: "email" },
    { name: "website", label: t("website"), type: "url", placeholder: "https://" },
    { name: "image", label: t("image"), type: "url", placeholder: "https://" },
    { name: "checkInTime", label: t("checkInTime"), type: "time", required: true },
    { name: "checkOutTime", label: t("checkOutTime"), type: "time", required: true },
    { name: "amenities", label: t("amenities"), type: "list", span: 2 },
    { name: "latitude", label: t("latitude"), type: "number", min: -90, max: 90 },
    { name: "longitude", label: t("longitude"), type: "number", min: -180, max: 180 },
    { name: "description", label: tc("description"), type: "textarea" },
    { name: "descriptionAr", label: tc("descriptionAr"), type: "textarea" },
  ];
  if (includeActive) fields.push({ name: "isActive", label: tc("isActive"), type: "switch", span: 2 });
  return fields;
}

export function useRoomFields(): FieldDef[] {
  const t = useTranslations("hotelPortal.fields");
  return [
    { name: "name", label: t("name"), type: "text", required: true },
    { name: "nameAr", label: t("nameAr"), type: "text" },
    { name: "pricePerNight", label: t("pricePerNight"), type: "number", required: true, min: 0 },
    { name: "currency", label: t("currency"), type: "text", required: true, ltr: true },
    { name: "totalRooms", label: t("totalRooms"), type: "number", required: true, min: 0, step: 1 },
    { name: "capacity", label: t("capacity"), type: "number", required: true, min: 1, max: 12, step: 1 },
    { name: "bedType", label: t("bedType"), type: "text" },
    { name: "sizeSqm", label: t("sizeSqm"), type: "number", min: 5, step: 1 },
    { name: "amenities", label: t("amenities"), type: "list", span: 2 },
    { name: "description", label: t("description"), type: "textarea" },
    { name: "descriptionAr", label: t("descriptionAr"), type: "textarea" },
    { name: "accessible", label: t("accessible"), type: "switch" },
    { name: "isActive", label: t("isActive"), type: "switch" },
  ];
}
