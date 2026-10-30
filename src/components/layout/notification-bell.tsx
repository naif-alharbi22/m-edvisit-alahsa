"use client";

import { useCallback, useState } from "react";
import { useLocale, useTranslations, useFormatter } from "next-intl";
import { Bell, CheckCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export function NotificationBell({ initialUnread = 0 }: { initialUnread?: number }) {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const format = useFormatter();
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<NotificationItem[] | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ unread: number; items: NotificationItem[] }>(`/api/me/notifications?locale=${locale}`);
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      setItems([]);
    }
  }, [locale]);

  const markAll = async () => {
    await apiFetch("/api/me/notifications", { method: "POST" }).catch(() => undefined);
    setUnread(0);
    setItems((prev) => prev?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? null);
  };

  const markOne = (id: string) => {
    void apiFetch(`/api/me/notifications/${id}`, { method: "PATCH" }).catch(() => undefined);
    setItems((prev) => prev?.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)) ?? null);
    setUnread((u) => Math.max(0, u - 1));
  };

  return (
    <DropdownMenu onOpenChange={(open) => open && load()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`${t("title")} (${t("unreadCount", { count: unread })})`}>
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">{t("title")}</p>
          {unread > 0 && (
            <button type="button" onClick={markAll} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <CheckCheck className="h-3.5 w-3.5" /> {t("markAllRead")}
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items === null ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">…</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            items.map((n) => {
              const content = (
                <div className={cn("space-y-0.5 px-3 py-2.5", !n.readAt && "bg-primary/5")}>
                  <p className="flex items-start gap-2 text-sm font-medium">
                    {!n.readAt && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />}
                    {n.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                  <p className="text-[11px] text-muted-foreground/80">{format.relativeTime(new Date(n.createdAt))}</p>
                </div>
              );
              return n.link ? (
                <Link key={n.id} href={n.link} onClick={() => markOne(n.id)} className="block border-b last:border-0 hover:bg-muted/60">
                  {content}
                </Link>
              ) : (
                <button key={n.id} type="button" onClick={() => markOne(n.id)} className="block w-full border-b text-start last:border-0 hover:bg-muted/60">
                  {content}
                </button>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
