"use client";

import { useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form-field";
import { Separator } from "@/components/ui/separator";
import { AuthCard } from "./auth-card";
import { GoogleButton } from "./google-button";
import { homePathForRole, isRole } from "@/lib/roles";
import { safeCallbackUrl } from "@/lib/safe-redirect";

interface LoginFormProps {
  callbackUrl?: string | null;
  initialError?: string | null;
  googleEnabled: boolean;
  demoAccounts?: { role: string; email: string }[] | null;
  demoPassword?: string | null;
}

function errorKey(code: string | null | undefined) {
  if (!code) return null;
  if (code === "RATE_LIMITED") return "rateLimited" as const;
  if (code === "ACCOUNT_DISABLED") return "disabled" as const;
  if (code === "CredentialsSignin") return "invalid" as const;
  return "generic" as const;
}

export function LoginForm({ callbackUrl, initialError, googleEnabled, demoAccounts, demoPassword }: LoginFormProps) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const tr = useTranslations("roles");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ReturnType<typeof errorKey>>(errorKey(initialError));
  const [loading, setLoading] = useState(false);
  const safeCallback = safeCallbackUrl(callbackUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn("credentials", { email, password, redirect: false });
    if (!result || result.error) {
      setError(errorKey(result?.error ?? "generic"));
      setLoading(false);
      return;
    }
    const session = await getSession();
    const role = isRole(session?.user?.role) ? session.user.role : "PATIENT";
    // Full navigation so server components pick up the new session cookie.
    window.location.assign(safeCallback ?? `/${locale}${homePathForRole(role)}`);
  };

  return (
    <AuthCard
      title={t("loginTitle")}
      subtitle={t("loginSubtitle")}
      footer={
        <p className="text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            {tc("register")}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
        <Field id="email" label={t("email")}>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field id="password" label={t("password")}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {t(`errors.${error}`)}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? t("signingIn") : tc("signIn")}
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
          <GoogleButton callbackUrl={safeCallback ?? `/${locale}/dashboard`} />
        </>
      )}

      {demoAccounts && demoAccounts.length > 0 && (
        <div className="mt-6 rounded-md border border-dashed p-3 text-xs">
          <p className="mb-2 font-medium">Demo · {demoPassword}</p>
          <ul className="space-y-1">
            {demoAccounts.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  className="w-full text-start text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setEmail(a.email);
                    setPassword(demoPassword ?? "");
                  }}
                >
                  <span className="font-medium text-foreground">{isRole(a.role) ? tr(a.role) : a.role}</span> — {a.email}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AuthCard>
  );
}
