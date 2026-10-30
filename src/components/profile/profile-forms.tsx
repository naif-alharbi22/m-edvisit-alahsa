"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch, ApiClientError, fieldErrorsFrom } from "@/lib/api-client";
import { COUNTRY_CODES, countryName } from "@/lib/countries";

interface ProfileProps {
  user: { name: string | null; email: string; phone: string | null; nationality: string | null; locale: string };
  hasPassword: boolean;
}

export function ProfileForms({ user, hasPassword }: ProfileProps) {
  const t = useTranslations("profile");
  const ta = useTranslations("auth");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { update } = useSession();
  const [form, setForm] = useState({ name: user.name ?? "", phone: user.phone ?? "", nationality: user.nationality ?? "", locale: user.locale === "ar" ? "ar" : "en" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "" });
  const [pwdErrors, setPwdErrors] = useState<Record<string, string>>({});
  const [pwdBusy, setPwdBusy] = useState(false);

  const countries = useMemo(
    () => COUNTRY_CODES.map((code) => ({ code, name: countryName(code, locale) })).sort((a, b) => a.name.localeCompare(b.name, locale)),
    [locale]
  );

  const saveProfile = async () => {
    setBusy(true);
    setErrors({});
    try {
      await apiFetch("/api/me/profile", { method: "PATCH", body: form });
      await update();
      toast.success(t("saved"));
      if (form.locale !== locale) router.replace(pathname, { locale: form.locale as "en" | "ar" });
      else router.refresh();
    } catch (err) {
      setErrors(fieldErrorsFrom(err));
      toast.error(err instanceof ApiClientError ? err.message : tc("error"));
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async () => {
    setPwdBusy(true);
    setPwdErrors({});
    try {
      await apiFetch("/api/me/password", { method: "POST", body: pwd });
      toast.success(t("passwordChanged"));
      setPwd({ currentPassword: "", newPassword: "" });
    } catch (err) {
      setPwdErrors(fieldErrorsFrom(err));
      toast.error(err instanceof ApiClientError ? err.message : tc("error"));
    } finally {
      setPwdBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("personal")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void saveProfile();
            }}
          >
            <Field id="p-name" label={ta("name")} error={errors.name} className="sm:col-span-2">
              <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} autoComplete="name" />
            </Field>
            <Field id="p-email" label={t("email")} hint={t("emailHint")} className="sm:col-span-2">
              <Input id="p-email" value={user.email} disabled dir="ltr" />
            </Field>
            <Field id="p-phone" label={ta("phone")} optional={tc("optional")} error={errors.phone}>
              <Input id="p-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" autoComplete="tel" />
            </Field>
            <Field id="p-nat" label={ta("nationality")} optional={tc("optional")} error={errors.nationality}>
              <Select value={form.nationality} onValueChange={(v) => setForm({ ...form, nationality: v })}>
                <SelectTrigger id="p-nat">
                  <SelectValue placeholder={ta("selectNationality")} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="p-locale" label={ta("preferredLanguage")}>
              <Select value={form.locale} onValueChange={(v) => setForm({ ...form, locale: v })}>
                <SelectTrigger id="p-locale">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="flex justify-end sm:col-span-2">
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {tc("saveChanges")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("security")}</CardTitle>
        </CardHeader>
        <CardContent>
          {hasPassword ? (
            <form
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                void changePassword();
              }}
            >
              <Field id="p-current" label={t("currentPassword")} error={pwdErrors.currentPassword}>
                <Input
                  id="p-current"
                  type="password"
                  autoComplete="current-password"
                  value={pwd.currentPassword}
                  onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })}
                  required
                />
              </Field>
              <Field id="p-new" label={t("newPassword")} error={pwdErrors.newPassword} hint={ta("passwordHint")}>
                <Input
                  id="p-new"
                  type="password"
                  autoComplete="new-password"
                  value={pwd.newPassword}
                  onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })}
                  required
                  minLength={8}
                />
              </Field>
              <div className="flex justify-end sm:col-span-2">
                <Button type="submit" variant="secondary" disabled={pwdBusy}>
                  {pwdBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("changePassword")}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noPassword")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
