import { getLocale } from "next-intl/server";
import { PortalShell } from "@/components/portal/portal-shell";
import { UnassignedNotice } from "@/components/portal/unassigned-notice";
import { requirePageRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { countUnread } from "@/server/services/notifications";

export default async function HotelLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole(["HOTEL_MANAGER"], "/hotel");
  const locale = await getLocale();
  const [hotel, unread] = await Promise.all([
    user.hotelId ? prisma.hotel.findUnique({ where: { id: user.hotelId }, select: { name: true, nameAr: true } }) : null,
    countUnread(user.id),
  ]);
  return (
    <PortalShell
      portal="hotel"
      subtitle={hotel ? (locale === "ar" && hotel.nameAr ? hotel.nameAr : hotel.name) : null}
      user={{ name: user.name, email: user.email, role: user.role }}
      unreadNotifications={unread}
    >
      {hotel ? children : <UnassignedNotice />}
    </PortalShell>
  );
}
