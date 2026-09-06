import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // Explicit, and matching the current de-facto id (the resolved
    // start_url) so already-installed apps aren't orphaned as a "new" app.
    id: "/?source=pwa",
    name: "Hayven",
    short_name: "Hayven",
    description:
      "Verified child therapists: booking, payments, and progress tracking in one place.",
    // Relaunching the installed app lands here; the landing page redirects
    // ?source=pwa straight to the role dashboard (or /login).
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    lang: "en-NG",
    dir: "ltr",
    categories: ["health", "medical", "lifestyle"],
    background_color: "#E4E1DF",
    theme_color: "#17140F",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Home-screen icon long-press quick actions. Kept to public routes only
    // -- a role-specific path (/parent, /therapist) would bounce a
    // logged-out or wrong-role user to /login.
    shortcuts: [
      {
        name: "Find a therapist",
        short_name: "Find",
        url: "/search?source=pwa-shortcut",
        icons: [{ src: "/icons/192", sizes: "192x192" }],
      },
      {
        name: "Learning Center",
        short_name: "Learn",
        url: "/learn?source=pwa-shortcut",
        icons: [{ src: "/icons/192", sizes: "192x192" }],
      },
    ],
  };
}
