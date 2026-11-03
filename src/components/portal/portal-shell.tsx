"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { WisalMark } from "@/components/brand/wisal-logo";
import {
  BarChart3,
  BedDouble,
  Building2,
  CalendarCheck,
  ClipboardList,
  Hotel,
  LayoutDashboard,
  Menu,
  Package,
  ScrollText,
  Stethoscope,
  Users,
  X,
  ArrowLeft,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { NotificationBell } from "@/components/layout/notification-bell";
import { UserMenu, type MenuUser } from "@/components/layout/user-menu";
import { cn } from "@/lib/utils";

export type PortalKind = "hospital" | "hotel" | "admin";

type NavItem = { href: string; key: string; icon: typeof LayoutDashboard; exact?: boolean };

const NAV: Record<PortalKind, { ns: "hospital" | "hotelPortal" | "admin"; items: NavItem[] }> = {
  hospital: {
    ns: "hospital",
    items: [
      { href: "/hospital", key: "overview", icon: BarChart3, exact: true },
      { href: "/hospital/appointments", key: "appointments", icon: CalendarCheck },
      { href: "/hospital/doctors", key: "doctors", icon: Stethoscope },
      { href: "/hospital/packages", key: "packages", icon: Package },
      { href: "/hospital/profile", key: "profile", icon: Building2 },
    ],
  },
  hotel: {
    ns: "hotelPortal",
    items: [
      { href: "/hotel", key: "overview", icon: BarChart3, exact: true },
      { href: "/hotel/bookings", key: "bookings", icon: ClipboardList },
      { href: "/hotel/rooms", key: "rooms", icon: BedDouble },
      { href: "/hotel/profile", key: "profile", icon: Hotel },
    ],
  },
  admin: {
    ns: "admin",
    items: [
      { href: "/admin", key: "overview", icon: BarChart3, exact: true },
      { href: "/admin/users", key: "users", icon: Users },
      { href: "/admin/facilities", key: "facilities", icon: Building2 },
      { href: "/admin/hotels", key: "hotels", icon: Hotel },
      { href: "/admin/appointments", key: "appointments", icon: CalendarCheck },
      { href: "/admin/bookings", key: "bookings", icon: ClipboardList },
      { href: "/admin/audit", key: "audit", icon: ScrollText },
    ],
  },
};

interface PortalShellProps {
  portal: PortalKind;
  subtitle?: string | null;
  user: MenuUser;
  unreadNotifications: number;
  children: React.ReactNode;
}

export function PortalShell({ portal, subtitle, user, unreadNotifications, children }: PortalShellProps) {
  const config = NAV[portal];
  const t = useTranslations(config.ns);
  const tn = useTranslations("nav");
  const tp = useTranslations("portal");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3" aria-label={t("portalTitle")}>
      {config.items.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {t(`nav.${item.key}` as never)}
          </Link>
        );
      })}
      <div className="mt-auto pt-4">
        <Link href="/" className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" /> {tp("backToSite")}
        </Link>
      </div>
    </nav>
  );

  const brand = (
    <div className="flex h-16 items-center gap-2 border-b px-4">
      <WisalMark className="h-9 shrink-0" />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{t("portalTitle")}</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e bg-background lg:flex">
        {brand}
        {nav}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-label={tn("closeMenu")} />
          <aside className="absolute inset-y-0 start-0 flex w-72 flex-col bg-background shadow-xl">
            <div className="flex items-center justify-between pe-2">
              {brand}
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label={tn("closeMenu")}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label={tn("openMenu")}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <LocaleSwitcher />
          <NotificationBell initialUnread={unreadNotifications} />
          <UserMenu user={user} />
        </header>
        <main id="main-content" className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
