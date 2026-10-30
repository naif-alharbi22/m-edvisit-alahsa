import { getLocale } from "next-intl/server";
import { PortalShell } from "@/components/portal/portal-shell";
import { UnassignedNotice } from "@/components/portal/unassigned-notice";
import { requirePageRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { countUnread } from "@/server/services/notifications";

export default async function HospitalLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole(["HOSPITAL_ADMIN"], "/hospital");
  const locale = await getLocale();
  const [facility, unread] = await Promise.all([
    user.facilityId ? prisma.facility.findUnique({ where: { id: user.facilityId }, select: { name: true, nameAr: true } }) : null,
    countUnread(user.id),
  ]);
  return (
    <PortalShell
      portal="hospital"
      subtitle={facility ? (locale === "ar" && facility.nameAr ? facility.nameAr : facility.name) : null}
      user={{ name: user.name, email: user.email, role: user.role }}
      unreadNotifications={unread}
    >
      {facility ? children : <UnassignedNotice />}
    </PortalShell>
  );
}
