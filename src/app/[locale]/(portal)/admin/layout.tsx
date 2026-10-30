import { PortalShell } from "@/components/portal/portal-shell";
import { requirePageRole } from "@/lib/session";
import { countUnread } from "@/server/services/notifications";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole(["SUPER_ADMIN"], "/admin");
  const unread = await countUnread(user.id);
  return (
    <PortalShell portal="admin" user={{ name: user.name, email: user.email, role: user.role }} unreadNotifications={unread}>
      {children}
    </PortalShell>
  );
}
