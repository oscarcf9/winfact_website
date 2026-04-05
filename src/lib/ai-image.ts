import OpenAI from "openai";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { buildImagePrompt } from "./ai-blog-engine";
import { uploadToR2, isR2Configured } from "./r2";

// Instagram 3:4 feed post dimensions (2026 standard)
const IG_WIDTH = 1080;
const IG_HEIGHT = 1440;

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
      prompt: prompt + "\n\nIMPORTANT: This image MUST be in portrait/vertical orientation (taller than wide). Compose the scene vertically with subjects centered. Leave breathing room at top and bottom — content must not be cut off at edges.",
      n: 1,
      size: "1024x1536", // Portrait orientation for Instagram 3:4 feed posts
      quality: "high",
    });

    const imageData = response.data?.[0];
    if (!imageData?.b64_json) {
      return { url: "", filename: "", error: "No image data returned" };
    }

    const filename = `matchup-${randomUUID()}.png`;
    const rawBuffer = Buffer.from(imageData.b64_json, "base64");

    // Resize to exact Instagram 3:4 dimensions (1080x1440)
    // Use "cover" to fill the frame, centering the content
    const buffer = await sharp(rawBuffer)
      .resize(IG_WIDTH, IG_HEIGHT, { fit: "cover", position: "center" })
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

    return { url, filename };
  } catch (error) {
    console.error("Image generation error:", error);
    return { url: "", filename: "", error: String(error) };
  }
}
