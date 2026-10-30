import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  const staticPaths = ["", "/triage", "/facilities", "/hotels", "/chat"];
  const [facilities, hotels] = await Promise.all([
    prisma.facility.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }).catch(() => []),
    prisma.hotel.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }).catch(() => []),
  ]);
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of ["en", "ar"]) {
    for (const path of staticPaths) entries.push({ url: `${base}/${locale}${path}`, changeFrequency: "weekly" });
    for (const f of facilities) entries.push({ url: `${base}/${locale}/facilities/${f.slug}`, lastModified: f.updatedAt });
    for (const h of hotels) entries.push({ url: `${base}/${locale}/hotels/${h.slug}`, lastModified: h.updatedAt });
  }
  return entries;
}
