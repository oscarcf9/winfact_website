import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

// sharp requires Node.js runtime (not edge)
export const runtime = "nodejs";
export const maxDuration = 300; // 5 min timeout for processing many images
import { db } from "@/db";
import { contentQueue, media, victoryPosts } from "@/db/schema";
import { isNotNull } from "drizzle-orm";
import sharp from "sharp";
import { uploadToR2, isR2Configured, getKeyFromUrl } from "@/lib/r2";

// Instagram 3:4 feed post dimensions (2026 standard)
const TARGET_W = 1080;
const TARGET_H = 1440;

/**
 * POST /api/admin/migrate-images
 *
 * One-time migration: fetches all existing images from R2,
 * resizes them to 1080x1440 (Instagram 3:4), and re-uploads
 * to the same key, overwriting the original.
 *
 * Safe to run multiple times — already-correct images are skipped.
 */
export async function POST() {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  if (!isR2Configured()) {
    return NextResponse.json({ error: "R2 not configured" }, { status: 500 });
  }

  const results: { url: string; status: string; dimensions?: string }[] = [];

  try {
    // 1. Get all unique image URLs from content_queue and media tables
    const queueItems = await db
      .select({ imageUrl: contentQueue.imageUrl })
      .from(contentQueue)
      .where(isNotNull(contentQueue.imageUrl));

    const mediaItems = await db
      .select({ url: media.url })
      .from(media);

    const victoryItems = await db
      .select({ imageUrl: victoryPosts.imageUrl })
      .from(victoryPosts)
      .where(isNotNull(victoryPosts.imageUrl));

    // Collect all unique URLs
    const allUrls = new Set<string>();
    for (const item of queueItems) {
      if (item.imageUrl) allUrls.add(item.imageUrl);
    }
    for (const item of mediaItems) {
      if (item.url) allUrls.add(item.url);
    }
    for (const item of victoryItems) {
      if (item.imageUrl) allUrls.add(item.imageUrl);
    }

    console.log(`[migrate-images] Found ${allUrls.size} unique image URLs to process`);

    for (const url of allUrls) {
      try {
        // Skip non-R2 URLs (local files, external URLs)
        const key = getKeyFromUrl(url);
        if (!key) {
          results.push({ url, status: "skipped", dimensions: "not an R2 URL" });
          continue;
        }

        // Fetch the current image
        const res = await fetch(url);
        if (!res.ok) {
          results.push({ url, status: "failed", dimensions: `HTTP ${res.status}` });
          continue;
        }

        const imageBuffer = Buffer.from(await res.arrayBuffer());

        // Check current dimensions
        const metadata = await sharp(imageBuffer).metadata();
        const currentW = metadata.width || 0;
        const currentH = metadata.height || 0;

        // Skip if already correct dimensions
        if (currentW === TARGET_W && currentH === TARGET_H) {
          results.push({ url, status: "already-correct", dimensions: `${currentW}x${currentH}` });
          continue;
        }

        // Resize to 1080x1440, centering the content
        const resizedBuffer = await sharp(imageBuffer)
          .resize(TARGET_W, TARGET_H, { fit: "cover", position: "center" })
          .png({ quality: 90 })
          .toBuffer();

        // Re-upload to the same key (overwrites original)
        await uploadToR2(key, resizedBuffer, "image/png");

        results.push({
          url,
          status: "resized",
          dimensions: `${currentW}x${currentH} → ${TARGET_W}x${TARGET_H}`,
        });

        console.log(`[migrate-images] Resized: ${key} (${currentW}x${currentH} → ${TARGET_W}x${TARGET_H})`);
      } catch (err) {
        results.push({ url, status: "error", dimensions: String(err) });
        console.error(`[migrate-images] Error processing ${url}:`, err);
      }
    }

    const resized = results.filter((r) => r.status === "resized").length;
    const skipped = results.filter((r) => r.status === "skipped" || r.status === "already-correct").length;
    const failed = results.filter((r) => r.status === "failed" || r.status === "error").length;

    return NextResponse.json({
      message: `Processed ${allUrls.size} images: ${resized} resized, ${skipped} skipped, ${failed} failed`,
      resized,
      skipped,
      failed,
      total: allUrls.size,
      details: results,
    });
  } catch (error) {
    console.error("[migrate-images] Migration error:", error);
    return NextResponse.json({ error: "Migration failed" }, { status: 500 });
  }
}
