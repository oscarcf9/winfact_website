import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { getAllPublishedSlugs } from "@/db/queries/posts";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const locales = ["en", "es"];

  const staticPages = [
    "",
    "/pricing",
    "/performance",
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
            en: `${baseUrl}/en${page}`,
            es: `${baseUrl}/es${page}`,
          },
        },
      });
    }
  }

  // Add blog posts from DB
  try {
    const blogSlugs = await getAllPublishedSlugs();
    for (const { slug } of blogSlugs) {
      for (const locale of locales) {
        entries.push({
          url: `${baseUrl}/${locale}/blog/${slug}`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.6,
          alternates: {
            languages: {
              en: `${baseUrl}/en/blog/${slug}`,
              es: `${baseUrl}/es/blog/${slug}`,
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
