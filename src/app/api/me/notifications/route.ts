import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { countUnread, listNotifications, markAllNotificationsRead, renderNotification } from "@/server/services/notifications";

export const GET = withErrorHandling(async (req) => {
  const user = await requireApiUser();
  const locale = new URL(req.url).searchParams.get("locale") === "ar" ? "ar" : user.locale;
  const [items, unread] = await Promise.all([listNotifications(user.id, 20), countUnread(user.id)]);
  return NextResponse.json({
    unread,
    items: items.map((n) => ({
      id: n.id,
      kind: n.kind,
      link: n.link,
      readAt: n.readAt,
      createdAt: n.createdAt,
      ...renderNotification(n.kind, n.data, locale),
    })),
  });
});

export const POST = withErrorHandling(async () => {
  const user = await requireApiUser();
  await markAllNotificationsRead(user.id);
  return NextResponse.json({ ok: true });
});
