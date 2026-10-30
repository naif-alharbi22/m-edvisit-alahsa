"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch, ApiClientError, fieldErrorsFrom } from "@/lib/api-client";
import { EntityForm, toFormValues, toPayload, type FieldDef } from "./entity-form";
import { useFacilityFields, useHotelFields } from "./field-defs";

function ProfileForm({ fields, entity, url }: { fields: FieldDef[]; entity: Record<string, unknown>; url: string }) {
  const tc = useTranslations("common");
  const router = useRouter();
  const [values, setValues] = useState(() => toFormValues(fields, entity));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      await apiFetch(url, { method: "PATCH", body: toPayload(fields, values) });
      toast.success(tc("saved"));
      router.refresh();
    } catch (err) {
      setErrors(fieldErrorsFrom(err));
      toast.error(err instanceof ApiClientError ? err.message : tc("error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="shadow-none">
      <CardContent className="pt-6">
        <EntityForm id="profile-form" fields={fields} values={values} onChange={setValues} errors={errors} onSubmit={save} submitLabel={tc("saveChanges")} busy={busy} />
      </CardContent>
    </Card>
  );
}

/** Facility profile: hospital admins edit their own; super admins pass facilityId and may toggle visibility. */
export function FacilityProfileForm({ facility, adminFacilityId }: { facility: Record<string, unknown>; adminFacilityId?: string }) {
  const fields = useFacilityFields(Boolean(adminFacilityId));
  const url = adminFacilityId ? `/api/admin/facilities/${adminFacilityId}` : "/api/hospital/facility";
  return <ProfileForm fields={fields} entity={facility} url={url} />;
}

export function HotelProfileForm({ hotel, adminHotelId }: { hotel: Record<string, unknown>; adminHotelId?: string }) {
  const fields = useHotelFields(Boolean(adminHotelId));
  const url = adminHotelId ? `/api/admin/hotels/${adminHotelId}` : "/api/hotel/profile";
  return <ProfileForm fields={fields} entity={hotel} url={url} />;
}
