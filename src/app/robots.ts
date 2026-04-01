import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/dashboard", "/admin-login"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: ["/admin", "/api", "/dashboard", "/admin-login"],
      },
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow: ["/admin", "/api", "/dashboard", "/admin-login"],
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: ["/admin", "/api", "/dashboard", "/admin-login"],
      },
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/admin", "/api", "/dashboard", "/admin-login"],
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: ["/admin", "/api", "/dashboard", "/admin-login"],
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: ["/admin", "/api", "/dashboard", "/admin-login"],
      },
      {
        userAgent: "Bytespider",
        allow: "/",
        disallow: ["/admin", "/api", "/dashboard", "/admin-login"],
      },
      {
        userAgent: "CCBot",
        allow: "/",
        disallow: ["/admin", "/api", "/dashboard", "/admin-login"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
