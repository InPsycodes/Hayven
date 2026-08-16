import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Everything behind a session (parent/therapist/admin/supervisor
      // dashboards, the help center, which all require login), plus
      // transactional flows that have nothing to offer a search result
      // (login, signup, booking) and internal/technical routes.
      disallow: [
        "/parent",
        "/therapist",
        "/help",
        "/admin",
        "/supervisor",
        "/login",
        "/signup",
        "/book",
        "/api",
        "/~offline",
        "/icons",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
