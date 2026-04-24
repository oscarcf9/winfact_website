import OpenAI from "openai";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { buildImagePrompt } from "./ai-blog-engine";
import { uploadToR2, isR2Configured } from "./r2";

// Universal 4:5 feed post dimensions — works on IG (optimal), FB, X, Threads.
// IG rejects taller than 4:5 with "There is an issue with the media" (that's
// what killed our previous 3:4 / 1080x1440 images).
const FEED_WIDTH = 1080;
const FEED_HEIGHT = 1350;

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
  url: string;
  filename: string;
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
    const rawBuffer = Buffer.from(imageData.b64_json, "base64");

    // Resize to 4:5 feed dimensions (1080x1350). This ratio is accepted by
    // Instagram (optimal), Facebook, X, and Threads — one image serves all
    // four channels without per-platform re-encoding.
    const buffer = await sharp(rawBuffer)
      .resize(FEED_WIDTH, FEED_HEIGHT, { fit: "cover", position: "center" })
      .png({ quality: 90 })
      .toBuffer();

    let url: string;

    if (isR2Configured()) {
      // Upload to Cloudflare R2
      const key = `uploads/${filename}`;
      url = await uploadToR2(key, buffer, "image/png");
    } else {
      // Fallback to local filesystem (development only)
      const { writeFile, mkdir } = await import("fs/promises");
      const { join } = await import("path");
      const uploadDir = join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(join(uploadDir, filename), buffer);
      url = `/uploads/${filename}`;
    }

    // Also generate a story version (9:16)
    const storyBuffer = await sharp(rawBuffer)
      .resize(STORY_WIDTH, STORY_HEIGHT, { fit: "cover", position: "center" })
      .png({ quality: 90 })
      .toBuffer();

    const storyFilename = filename.replace(".png", "-story.png");
    let storyUrl = "";

    if (isR2Configured()) {
      const storyKey = `uploads/${storyFilename}`;
      storyUrl = await uploadToR2(storyKey, storyBuffer, "image/png");
    } else {
      const { writeFile, mkdir } = await import("fs/promises");
      const { join } = await import("path");
      const uploadDir = join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(join(uploadDir, storyFilename), storyBuffer);
      storyUrl = `/uploads/${storyFilename}`;
    }

    return { url, filename, storyUrl, storyFilename };
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
