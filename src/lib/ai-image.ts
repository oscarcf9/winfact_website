import OpenAI from "openai";
import { randomUUID } from "crypto";
import { buildImagePrompt } from "./ai-blog-engine";
import { uploadToR2, isR2Configured } from "./r2";

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
      prompt,
      n: 1,
      size: "1536x1024",
      quality: "high",
    });

    const imageData = response.data?.[0];
    if (!imageData?.b64_json) {
      return { url: "", filename: "", error: "No image data returned" };
    }

    const filename = `matchup-${randomUUID()}.png`;
    const buffer = Buffer.from(imageData.b64_json, "base64");

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
