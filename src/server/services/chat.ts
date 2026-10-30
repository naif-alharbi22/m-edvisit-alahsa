import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const CONTEXT_TTL_MS = 5 * 60_000;
let cachedContext: { value: string; expiresAt: number } | null = null;

/**
 * Builds a compact, up-to-date description of the catalog for the assistant's
 * system prompt so answers reflect real facilities, prices, and hotels.
 */
export async function getCatalogContext(): Promise<string> {
  if (cachedContext && cachedContext.expiresAt > Date.now()) return cachedContext.value;
  try {
    const [facilities, hotels] = await Promise.all([
      prisma.facility.findMany({
        where: { isActive: true },
        select: {
          name: true,
          type: true,
          rating: true,
          specialties: true,
          accreditations: true,
          treatmentPackages: { where: { isActive: true }, select: { name: true, price: true, currency: true, duration: true } },
        },
        orderBy: { rating: "desc" },
      }),
      prisma.hotel.findMany({
        where: { isActive: true },
        select: {
          name: true,
          starRating: true,
          amenities: true,
          roomTypes: { where: { isActive: true }, select: { pricePerNight: true, accessible: true } },
        },
      }),
    ]);

    const facilityLines = facilities.map((f) => {
      const packages = f.treatmentPackages
        .slice(0, 6)
        .map((p) => `${p.name} (${p.price} ${p.currency}${p.duration ? `, ${p.duration}` : ""})`)
        .join("; ");
      const accreditation = f.accreditations.length ? ` Accreditations: ${f.accreditations.join(", ")}.` : "";
      return `- ${f.name} [${f.type.toLowerCase().replace("_", " ")}, rating ${f.rating}/5]: ${f.specialties.join(", ")}.${accreditation}${packages ? ` Packages: ${packages}.` : ""}`;
    });
    const hotelLines = hotels.map((h) => {
      const prices = h.roomTypes.map((r) => r.pricePerNight);
      const from = prices.length ? Math.min(...prices) : null;
      const accessible = h.roomTypes.some((r) => r.accessible) ? " Accessible rooms available." : "";
      return `- ${h.name} (${h.starRating}★)${from ? ` from ${from} SAR/night` : ""}.${accessible} Amenities: ${h.amenities.slice(0, 5).join(", ")}.`;
    });

    const value = [
      "Facilities currently listed on the platform:",
      ...facilityLines,
      "",
      "Partner hotels (bookable on the platform):",
      ...hotelLines,
    ].join("\n");
    cachedContext = { value, expiresAt: Date.now() + CONTEXT_TTL_MS };
    return value;
  } catch (err) {
    logger.warn("Could not load catalog context for chat", { err });
    return "";
  }
}

export async function getChatHistory(userId: string, limit = 50) {
  const rows = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, role: true, content: true, createdAt: true },
  });
  return rows.reverse();
}

export async function saveChatExchange(userId: string, userMessage: string, assistantMessage: string) {
  const now = Date.now();
  await prisma.chatMessage.createMany({
    data: [
      { userId, role: "user", content: userMessage.slice(0, 4000), createdAt: new Date(now) },
      { userId, role: "assistant", content: assistantMessage.slice(0, 8000), createdAt: new Date(now + 1) },
    ],
  });
}

export async function clearChatHistory(userId: string) {
  await prisma.chatMessage.deleteMany({ where: { userId } });
}
