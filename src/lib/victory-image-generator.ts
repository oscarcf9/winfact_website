import OpenAI from "openai";

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

/**
 * Generate a victory background image using gpt-image-1.
 * Returns the image as a PNG Buffer.
 * Size: 1024x1536 (portrait, closest to 4:5 Instagram ratio).
 */
export async function generateVictoryBackground(
  prompt: string,
): Promise<Buffer> {
  const openai = getOpenAI();

  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    n: 1,
    size: "1024x1536",
    quality: "high",
  });

  const imageData = response.data?.[0];
  if (!imageData?.b64_json) {
    throw new Error("No image data returned from gpt-image-1");
  }

  return Buffer.from(imageData.b64_json, "base64");
}
