import OpenAI from "openai";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { buildImagePrompt } from "./ai-blog-engine";

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

type ImageResult = {
  url: string; // local URL path like /uploads/abc.png
  filename: string;
  error?: string;
};

export async function generateMatchupImage(
  matchup: string,
  sport: string
): Promise<ImageResult> {
  try {
    const openai = getOpenAI();
    const prompt = buildImagePrompt(matchup, sport);

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

    // Save to local uploads directory
    const filename = `matchup-${randomUUID()}.png`;
    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(imageData.b64_json, "base64");
    await writeFile(join(uploadDir, filename), buffer);

    const url = `/uploads/${filename}`;
    return { url, filename };
  } catch (error) {
    console.error("Image generation error:", error);
    return { url: "", filename: "", error: String(error) };
  }
}
