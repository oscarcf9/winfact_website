import { db } from "@/db";
import { siteContent } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getSiteContent(key: string): Promise<string | null> {
  const result = await db
    .select()
    .from(siteContent)
    .where(eq(siteContent.key, key))
    .limit(1);
  return result[0]?.value ?? null;
}

export async function getSiteContentJson<T>(key: string): Promise<T | null> {
  const raw = await getSiteContent(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function upsertSiteContent(key: string, value: string) {
  const existing = await getSiteContent(key);
  if (existing !== null) {
    return db
      .update(siteContent)
      .set({ value, updatedAt: new Date().toISOString() })
      .where(eq(siteContent.key, key));
  }
  return db.insert(siteContent).values({ key, value });
}
