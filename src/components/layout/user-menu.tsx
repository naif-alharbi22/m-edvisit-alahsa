"use client";

import { signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { LayoutDashboard, LogOut, UserRound, Shield, Building2, Hotel } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { homePathForRole, type AppRole } from "@/lib/roles";
import { initials } from "@/lib/utils";

export interface MenuUser {
  name?: string | null;
  email?: string | null;
  role: AppRole;
}

const portalIcon: Record<AppRole, typeof LayoutDashboard> = {
  PATIENT: LayoutDashboard,
  SUPER_ADMIN: Shield,
  HOSPITAL_ADMIN: Building2,
  HOTEL_MANAGER: Hotel,
};

export function UserMenu({ user }: { user: MenuUser }) {
  const t = useTranslations();
  const locale = useLocale();
  const PortalIcon = portalIcon[user.role];
  const portalLabel =
    user.role === "SUPER_ADMIN"
      ? t("nav.adminPortal")
      : user.role === "HOSPITAL_ADMIN"
        ? t("nav.hospitalPortal")
        : user.role === "HOTEL_MANAGER"
          ? t("nav.hotelPortal")
          : t("nav.dashboard");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={t("nav.account")}
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(user.name ?? user.email)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{user.name ?? user.email}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <p className="mt-1 text-xs text-primary">{t(`roles.${user.role}`)}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={homePathForRole(user.role)}>
            <PortalIcon /> {portalLabel}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserRound /> {t("nav.profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut({ callbackUrl: `/${locale}` })}>
          <LogOut /> {t("common.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
