"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "./locale-switcher";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/triage", key: "triage" },
  { href: "/facilities", key: "facilities" },
  { href: "/hotels", key: "hotels" },
  { href: "/chat", key: "chat" },
] as const;

export function Header() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const user = session?.user;
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur transition-shadow supports-[backdrop-filter]:bg-background/60",
        scrolled && "shadow-sm"
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">M</span>
          </div>
          <span className="text-lg font-bold">{tc("appName").split(" ")[0]}</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground",
                isActive(l.href) ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {t(l.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <LocaleSwitcher />
          {status === "authenticated" && user ? (
            <>
              <NotificationBell />
              <UserMenu user={{ name: user.name, email: user.email, role: user.role }} />
            </>
          ) : status === "unauthenticated" ? (
            <>
              <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
                <Link href="/login">{tc("signIn")}</Link>
              </Button>
              <Button asChild size="sm" className="hidden md:inline-flex">
                <Link href="/register">{tc("getStarted")}</Link>
              </Button>
            </>
          ) : (
            <div className="h-8 w-8" aria-hidden />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t bg-background md:hidden"
          >
            <div className="space-y-1 p-4">
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="block rounded-md px-2 py-2 text-sm font-medium hover:bg-muted">
                  {t(l.key)}
                </Link>
              ))}
              {status === "unauthenticated" && (
                <div className="flex gap-2 pt-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href="/login" onClick={() => setMobileOpen(false)}>{tc("signIn")}</Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1">
                    <Link href="/register" onClick={() => setMobileOpen(false)}>{tc("getStarted")}</Link>
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
