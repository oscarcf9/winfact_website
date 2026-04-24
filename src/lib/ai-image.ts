import OpenAI from "openai";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { buildImagePrompt } from "./ai-blog-engine";
import { uploadToR2, isR2Configured } from "./r2";

// Universal 4:5 feed post dimensions for IG (optimal), Facebook, Twitter/X.
// IG rejects taller than 4:5 with "There is an issue with the media" (that
// killed our earlier 3:4 / 1080x1440 renders).
const FEED_WIDTH = 1080;
const FEED_HEIGHT = 1350;

// Threads supports 4:5 too but displays best at higher resolution. We upload
// a separate, larger render for Threads so the image stays crisp on high-DPI
// phones while IG/FB/X get the standard 1080x1350.
const THREADS_WIDTH = 1440;
const THREADS_HEIGHT = 1800;

// Telegram chat feed renders images square — a portrait 4:5 shows up looking
// awkwardly tall in the message bubble. Dedicated 1:1 render avoids the crop.
const TELEGRAM_WIDTH = 1080;
const TELEGRAM_HEIGHT = 1080;

// Story version: 9:16 vertical (IG Stories / FB Stories).
const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

// Blog hero 3:2 landscape dimensions
const BLOG_WIDTH = 1200;
const BLOG_HEIGHT = 800;

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

type ImageResult = {
  /** 1080x1350 (4:5) — default for IG, Facebook, Twitter/X. */
  url: string;
  filename: string;
  /** 1440x1800 (4:5) higher-res render used when posting to Threads. */
  threadsUrl?: string;
  threadsFilename?: string;
  /** 1080x1080 (1:1) square render for Telegram chat bubbles. */
  telegramUrl?: string;
  telegramFilename?: string;
  /** 1080x1920 (9:16) — IG/FB Stories. */
  storyUrl?: string;
  storyFilename?: string;
  error?: string;
};

export async function generateMatchupImage(
  matchup: string,
  sport: string,
  teamAFullName?: string,
  teamBFullName?: string
): Promise<ImageResult> {
  try {
    const openai = getOpenAI();
    const prompt = buildImagePrompt(matchup, sport, teamAFullName, teamBFullName);

    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: prompt + "\n\nIMPORTANT: This image MUST be in portrait/vertical orientation (taller than wide) at a roughly 4:5 ratio (1080x1350). Compose the scene vertically with subjects centered. Leave breathing room at top and bottom — content must not be cut off at edges.",
      n: 1,
      size: "1024x1536", // Generate tall; we downscale to 1080x1350 (4:5) next.
      quality: "high",
    });

    const imageData = response.data?.[0];
    if (!imageData?.b64_json) {
      return { url: "", filename: "", error: "No image data returned" };
    }

    const filename = `matchup-${randomUUID()}.png`;
    const threadsFilename = filename.replace(".png", "-threads.png");
    const telegramFilename = filename.replace(".png", "-telegram.png");
    const storyFilename = filename.replace(".png", "-story.png");
    const rawBuffer = Buffer.from(imageData.b64_json, "base64");

    // Generate FOUR variants from the single OpenAI render:
    //   feed     = 1080x1350  → IG (optimal), Facebook, X/Twitter
    //   threads  = 1440x1800  → Threads (higher-res for its sharper feed)
    //   telegram = 1080x1080  → Telegram chat bubbles (square fits the UI)
    //   story    = 1080x1920  → IG/FB Stories
    // All four share the same source so the image content is identical.
    const [feedBuffer, threadsBuffer, telegramBuffer, storyBuffer] = await Promise.all([
      sharp(rawBuffer).resize(FEED_WIDTH, FEED_HEIGHT, { fit: "cover", position: "center" }).png({ quality: 90 }).toBuffer(),
      sharp(rawBuffer).resize(THREADS_WIDTH, THREADS_HEIGHT, { fit: "cover", position: "center" }).png({ quality: 90 }).toBuffer(),
      sharp(rawBuffer).resize(TELEGRAM_WIDTH, TELEGRAM_HEIGHT, { fit: "cover", position: "center" }).png({ quality: 90 }).toBuffer(),
      sharp(rawBuffer).resize(STORY_WIDTH, STORY_HEIGHT, { fit: "cover", position: "center" }).png({ quality: 90 }).toBuffer(),
    ]);

    async function saveVariant(name: string, bytes: Buffer): Promise<string> {
      if (isR2Configured()) {
        return uploadToR2(`uploads/${name}`, bytes, "image/png");
      }
      const { writeFile, mkdir } = await import("fs/promises");
      const { join } = await import("path");
      const uploadDir = join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(join(uploadDir, name), bytes);
      return `/uploads/${name}`;
    }

    // Upload all four variants in parallel so total latency = slowest upload.
    const [url, threadsUrl, telegramUrl, storyUrl] = await Promise.all([
      saveVariant(filename, feedBuffer),
      saveVariant(threadsFilename, threadsBuffer),
      saveVariant(telegramFilename, telegramBuffer),
      saveVariant(storyFilename, storyBuffer),
    ]);

    return {
      url,
      filename,
      threadsUrl,
      threadsFilename,
      telegramUrl,
      telegramFilename,
      storyUrl,
      storyFilename,
    };
  } catch (error) {
    console.error("Image generation error:", error);
    return { url: "", filename: "", error: String(error) };
  }
}

/**
 * Generate a LANDSCAPE 3:2 blog hero image for a matchup.
 * Different from generateMatchupImage which produces portrait Instagram images.
 */
export async function generateBlogHeroImage(
  matchup: string,
  sport: string,
  teamAFullName?: string,
  teamBFullName?: string
): Promise<ImageResult> {
  try {
    const openai = getOpenAI();
    const prompt = buildImagePrompt(matchup, sport, teamAFullName, teamBFullName);

    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: prompt + "\n\nIMPORTANT: This image MUST be in LANDSCAPE/horizontal orientation (wider than tall). Compose the scene horizontally with a cinematic widescreen feel. The split-screen should be LEFT vs RIGHT, not top vs bottom.",
      n: 1,
      size: "1536x1024", // Landscape orientation for blog hero
      quality: "high",
    });

    const imageData = response.data?.[0];
    if (!imageData?.b64_json) {
      return { url: "", filename: "", error: "No image data returned" };
    }

    const filename = `blog-hero-${randomUUID()}.png`;
    const rawBuffer = Buffer.from(imageData.b64_json, "base64");

    // Resize to 3:2 blog hero dimensions (1200x800)
    const buffer = await sharp(rawBuffer)
      .resize(BLOG_WIDTH, BLOG_HEIGHT, { fit: "cover", position: "center" })
      .png({ quality: 90 })
      .toBuffer();

    let url: string;

    if (isR2Configured()) {
      const key = `uploads/${filename}`;
      url = await uploadToR2(key, buffer, "image/png");
    } else {
      const { writeFile, mkdir } = await import("fs/promises");
      const { join } = await import("path");
      const uploadDir = join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(join(uploadDir, filename), buffer);
      url = `/uploads/${filename}`;
    }

    return { url, filename };
  } catch (error) {
    console.error("Blog hero image generation error:", error);
    return { url: "", filename: "", error: String(error) };
  }
}
