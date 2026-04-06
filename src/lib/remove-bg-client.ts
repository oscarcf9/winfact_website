/**
 * Client-side background removal using @imgly/background-removal.
 * Uses ONNX segmentation model running in browser via WebAssembly.
 * No API costs, no server round-trip. Produces high-quality cutouts.
 */

import { removeBackground, type Config } from "@imgly/background-removal";

const config: Config = {
  // Use CDN for model files (downloaded once, cached by browser)
  publicPath: "https://unpkg.com/@imgly/background-removal@1.7.0/dist/",
  // Use default model (best quality)
  model: "isnet",
  // Output as blob for flexibility
  output: {
    format: "image/png",
    quality: 1,
  },
};

/**
 * Remove background from an image.
 * @param imageSource - data URL, Blob, or URL of the image
 * @param onProgress - optional progress callback (0-1)
 * @returns PNG data URL with transparent background
 */
export async function removeImageBackground(
  imageSource: string | Blob,
  onProgress?: (progress: number) => void
): Promise<string> {
  const blob = await removeBackground(imageSource, {
    ...config,
    progress: onProgress
      ? (key: string, current: number, total: number) => {
          if (total > 0) onProgress(current / total);
        }
      : undefined,
  });

  // Convert blob to data URL
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read processed image"));
    reader.readAsDataURL(blob);
  });
}
