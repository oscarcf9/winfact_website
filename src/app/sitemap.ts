import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { getAllPublishedSlugsWithTimestamps } from "@/db/queries/posts";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const locales = ["en", "es"];

  const staticPages = [
    "",
    "/pricing",
    "/how-it-works",
    "/faq",
    "/about",
    "/contact",
    "/refer",
    "/blog",
    "/mlb-picks",
    "/nfl-picks",
    "/nba-picks",
    "/nhl-picks",
    "/soccer-picks",
    "/ncaa-picks",
    "/privacy",
    "/terms",
    "/disclaimer",
    "/responsible-gambling",
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const page of staticPages) {
    for (const locale of locales) {
      entries.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === "" ? "daily" : "weekly",
        priority: page === "" ? 1.0 : page === "/pricing" ? 0.9 : 0.7,
        alternates: {
          languages: {
            "x-default": `${baseUrl}/en${page}`,
            en: `${baseUrl}/en${page}`,
            es: `${baseUrl}/es${page}`,
          },
        },
      });
    }
  }

  // Blog posts: emit one entry per locale, with lastModified pulled from
  // posts.updatedAt (or publishedAt as fallback) so Google's crawl budget
  // tracks real content changes instead of the per-render timestamp.
  try {
    const blogPosts = await getAllPublishedSlugsWithTimestamps();
    for (const post of blogPosts) {
      const lastModRaw = post.updatedAt ?? post.publishedAt ?? new Date().toISOString();
      const lastMod = new Date(lastModRaw);
      for (const locale of locales) {
        entries.push({
          url: `${baseUrl}/${locale}/blog/${post.slug}`,
          lastModified: isNaN(lastMod.valueOf()) ? new Date() : lastMod,
          changeFrequency: "weekly",
          priority: 0.6,
          alternates: {
            languages: {
              "x-default": `${baseUrl}/en/blog/${post.slug}`,
              en: `${baseUrl}/en/blog/${post.slug}`,
              es: `${baseUrl}/es/blog/${post.slug}`,
            },
          },
        });
      }
    }
  } catch {
    // DB unavailable — return static pages only
  }

  return entries;
}
