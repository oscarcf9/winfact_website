import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/admin/remove-background
 *
 * Removes the background from an image using sharp's alpha channel manipulation.
 * Uses a simple approach: converts to PNG with transparency based on edge detection.
 * For production quality, this could be upgraded to use Remove.bg API or a ML model.
 *
 * Accepts: { imageBase64: string } (data URL or raw base64)
 * Returns: { imageBase64: string } (PNG with transparent background as data URL)
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Strip data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const inputBuffer = Buffer.from(base64Data, "base64");

    // Use sharp to process the image
    // Strategy: Use a simple green-screen style removal or threshold-based approach
    // For now, we'll use sharp's built-in capabilities to create a clean PNG with transparency
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return NextResponse.json({ error: "Invalid image" }, { status: 400 });
    }

    // Extract raw pixel data
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const pixels = new Uint8Array(data);

    // Sample corners to detect background color (take average of corner pixels)
    const cornerSamples: number[][] = [];
    const sampleSize = Math.min(20, Math.floor(width * 0.05));

    for (let dy = 0; dy < sampleSize; dy++) {
      for (let dx = 0; dx < sampleSize; dx++) {
        // Top-left
        const tl = (dy * width + dx) * channels;
        cornerSamples.push([pixels[tl], pixels[tl + 1], pixels[tl + 2]]);
        // Top-right
        const tr = (dy * width + (width - 1 - dx)) * channels;
        cornerSamples.push([pixels[tr], pixels[tr + 1], pixels[tr + 2]]);
        // Bottom-left
        const bl = ((height - 1 - dy) * width + dx) * channels;
        cornerSamples.push([pixels[bl], pixels[bl + 1], pixels[bl + 2]]);
        // Bottom-right
        const br = ((height - 1 - dy) * width + (width - 1 - dx)) * channels;
        cornerSamples.push([pixels[br], pixels[br + 1], pixels[br + 2]]);
      }
    }

    // Calculate average background color
    const avgR = Math.round(cornerSamples.reduce((s, c) => s + c[0], 0) / cornerSamples.length);
    const avgG = Math.round(cornerSamples.reduce((s, c) => s + c[1], 0) / cornerSamples.length);
    const avgB = Math.round(cornerSamples.reduce((s, c) => s + c[2], 0) / cornerSamples.length);

    // Remove pixels that are close to the background color
    const tolerance = 50; // Color distance threshold
    for (let i = 0; i < pixels.length; i += channels) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      const dist = Math.sqrt(
        (r - avgR) ** 2 + (g - avgG) ** 2 + (b - avgB) ** 2
      );

      if (dist < tolerance) {
        pixels[i + 3] = 0; // Set alpha to 0 (transparent)
      } else if (dist < tolerance * 1.5) {
        // Feather edge — partial transparency for smoother edges
        const alpha = Math.round(((dist - tolerance) / (tolerance * 0.5)) * 255);
        pixels[i + 3] = Math.min(pixels[i + 3], alpha);
      }
    }

    // Convert back to PNG
    const outputBuffer = await sharp(Buffer.from(pixels), {
      raw: { width, height, channels },
    })
      .png()
      .toBuffer();

    const outputBase64 = `data:image/png;base64,${outputBuffer.toString("base64")}`;

    return NextResponse.json({ imageBase64: outputBase64 });
  } catch (error) {
    console.error("[remove-background] Error:", error);
    return NextResponse.json({ error: "Background removal failed" }, { status: 500 });
  }
}
