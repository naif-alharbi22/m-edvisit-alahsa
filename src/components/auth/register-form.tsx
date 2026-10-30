"use client";

import { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form-field";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AuthCard } from "./auth-card";
import { GoogleButton } from "./google-button";
import { apiFetch, ApiClientError, fieldErrorsFrom } from "@/lib/api-client";
import { COUNTRY_CODES, countryName } from "@/lib/countries";

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", nationality: "", locale });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const countries = useMemo(
    () =>
      COUNTRY_CODES.map((code) => ({ code, name: countryName(code, locale) })).sort((a, b) => a.name.localeCompare(b.name, locale)),
    [locale]
  );

  const update = (field: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setErrors({});
    try {
      await apiFetch("/api/auth/register", { method: "POST", body: form });
      const result = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      window.location.assign(result?.error ? `/${locale}/login` : `/${locale}/dashboard`);
    } catch (err) {
      setErrors(fieldErrorsFrom(err));
      if (err instanceof ApiClientError && err.status === 409) setError(t("errors.emailTaken"));
      else if (err instanceof ApiClientError && err.status === 429) setError(t("errors.rateLimited"));
      else if (!(err instanceof ApiClientError && err.code === "VALIDATION_ERROR")) setError(t("errors.generic"));
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title={t("registerTitle")}
      subtitle={t("registerSubtitle")}
      footer={
        <p className="text-sm text-muted-foreground">
          {t("hasAccount")}{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            {tc("signIn")}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field id="name" label={t("name")} error={errors.name}>
          <Input id="name" autoComplete="name" value={form.name} onChange={(e) => update("name", e.target.value)} required minLength={2} />
        </Field>
        <Field id="email" label={t("email")} error={errors.email}>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => update("email", e.target.value)} required />
        </Field>
        <Field id="password" label={t("password")} error={errors.password} hint={t("passwordHint")}>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            required
            minLength={8}
            pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,}"
            title={t("passwordHint")}
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field id="phone" label={t("phone")} optional={tc("optional")} error={errors.phone}>
            <Input id="phone" type="tel" autoComplete="tel" placeholder="+966 50 xxx xxxx" value={form.phone} onChange={(e) => update("phone", e.target.value)} dir="ltr" />
          </Field>
          <Field id="nationality" label={t("nationality")} optional={tc("optional")} error={errors.nationality}>
            <Select value={form.nationality} onValueChange={(v) => update("nationality", v)}>
              <SelectTrigger id="nationality">
                <SelectValue placeholder={t("selectNationality")} />
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
        </div>
        <Field id="locale" label={t("preferredLanguage")}>
          <Select value={form.locale} onValueChange={(v) => update("locale", v)}>
            <SelectTrigger id="locale">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ar">العربية</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? t("creatingAccount") : tc("getStarted")}
        </Button>
      </form>
      {googleEnabled && (
        <>
          <div className="relative my-6">
            <Separator />
            <span className="absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground rtl:translate-x-1/2">
              {t("orContinueWith")}
            </span>
          </div>
          <GoogleButton callbackUrl={`/${locale}/dashboard`} />
        </>
      )}
    </AuthCard>
  );
}
