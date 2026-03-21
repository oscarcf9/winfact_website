import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WinFact Picks",
    short_name: "WinFact",
    description:
      "Data-driven sports betting picks backed by advanced analytics and transparent performance tracking.",
    start_url: "/en/dashboard",
    display: "standalone",
    background_color: "#0B1F3B",
    theme_color: "#1168D9",
    orientation: "portrait",
    icons: [
      {
        src: "/images/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/images/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/images/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
