import { createTranslator } from "next-intl";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getAppUrl } from "@/lib/env";
import { sendEmail, escapeHtml } from "@/server/email";
import { APP_TIME_ZONE } from "@/i18n/config";
import en from "@/i18n/messages/en.json";
import ar from "@/i18n/messages/ar.json";

export const NOTIFICATION_KINDS = [
  "welcome",
  "appointmentRequested",
  "appointmentConfirmed",
  "appointmentRescheduled",
  "appointmentCancelled",
  "appointmentCompleted",
  "newAppointmentRequest",
  "appointmentCancelledByPatient",
  "bookingRequested",
  "bookingConfirmed",
  "bookingCancelled",
  "bookingCheckedOut",
  "newBookingRequest",
  "bookingCancelledByPatient",
  "reportAnalyzed",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** Kinds that also trigger an email to the recipient. */
const EMAIL_KINDS = new Set<NotificationKind>([
  "appointmentConfirmed",
  "appointmentRescheduled",
  "appointmentCancelled",
  "bookingConfirmed",
  "bookingCancelled",
  "newAppointmentRequest",
  "newBookingRequest",
]);

export type NotificationData = Record<string, string | number>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/;

/** Converts ISO date strings in notification data to Date objects for ICU formatting. */
export function hydrateNotificationData(data: unknown): Record<string, string | number | Date> {
  const out: Record<string, string | number | Date> = {};
  if (!data || typeof data !== "object") return out;
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (typeof v === "string" && ISO_DATE.test(v)) out[k] = new Date(v);
    else if (typeof v === "string" || typeof v === "number") out[k] = v;
  }
  return out;
}

export function renderNotification(kind: string, data: unknown, requestedLocale: string) {
  const locale = requestedLocale === "ar" ? "ar" : "en";
  const messages = locale === "ar" ? ar : en;
  const t = createTranslator({ locale, messages, namespace: "notifications.kinds", timeZone: APP_TIME_ZONE });
  const values = hydrateNotificationData(data);
  const known = (NOTIFICATION_KINDS as readonly string[]).includes(kind);
  if (!known) return { title: kind, body: "" };
  const k = kind as NotificationKind;
  return {
    title: t(`${k}.title`, values as never),
    body: t(`${k}.body`, values as never),
  };
}

async function emailNotification(userId: string, kind: NotificationKind, data: NotificationData, link?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, locale: true } });
  if (!user) return;
  const locale = user.locale === "ar" ? "ar" : "en";
  const { title, body } = renderNotification(kind, data, locale);
  const url = link ? `${getAppUrl()}/${locale}${link}` : getAppUrl();
  const dir = locale === "ar" ? "rtl" : "ltr";
  await sendEmail({
    to: user.email,
    subject: title,
    text: `${body}\n\n${url}`,
    html: `<div dir="${dir}" style="font-family:system-ui,sans-serif;line-height:1.5"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p><p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p><hr/><small>MedVisit Al-Ahsa</small></div>`,
  });
}

/** Creates an in-app notification (and email for important kinds). Never throws. */
export async function notify(userId: string, kind: NotificationKind, data: NotificationData = {}, link?: string) {
  try {
    await prisma.notification.create({ data: { userId, kind, data, link: link ?? null } });
    if (EMAIL_KINDS.has(kind)) {
      void emailNotification(userId, kind, data, link).catch((err) =>
        logger.error("Notification email failed", { err, kind })
      );
    }
  } catch (err) {
    logger.error("Failed to create notification", { err, kind, userId });
  }
}

/** Notifies all active staff assigned to a facility or hotel. */
export async function notifyStaff(
  scope: { facilityId: string } | { hotelId: string },
  kind: NotificationKind,
  data: NotificationData,
  link?: string
) {
  const staff = await prisma.user.findMany({
    where: { ...scope, isActive: true, role: "facilityId" in scope ? "HOSPITAL_ADMIN" : "HOTEL_MANAGER" },
    select: { id: true },
  });
  await Promise.all(staff.map((s) => notify(s.id, kind, data, link)));
}

export async function listNotifications(userId: string, limit = 30) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function countUnread(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markNotificationRead(userId: string, id: string) {
  await prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}
