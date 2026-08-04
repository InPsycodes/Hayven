import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hayven",
    short_name: "Hayven",
    description:
      "Verified child therapists: booking, payments, and progress tracking in one place.",
    start_url: "/",
    display: "standalone",
    background_color: "#E4E1DF",
    theme_color: "#17140F",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
