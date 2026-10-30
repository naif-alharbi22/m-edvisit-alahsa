import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/*/admin", "/*/hospital", "/*/hotel$", "/*/hotel/", "/*/dashboard", "/*/profile"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
