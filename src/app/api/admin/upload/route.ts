import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { media } from "@/db/schema";
import { uploadToR2, isR2Configured } from "@/lib/r2";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const MAGIC_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/gif": [[0x47, 0x49, 0x46, 0x38]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF header
};

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

function validateFileSignature(buffer: Buffer, declaredType: string): boolean {
  const signatures = MAGIC_SIGNATURES[declaredType];
  if (!signatures) return false;
  return signatures.some((sig) =>
    sig.every((byte, i) => buffer[i] === byte)
  );
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const altText = (formData.get("altText") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.length > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Max 10MB" },
        { status: 400 }
      );
    }

    // Validate magic bytes match declared MIME type
    if (!validateFileSignature(buffer, file.type)) {
      return NextResponse.json(
        { error: "File content does not match declared type" },
        { status: 400 }
      );
    }

    // Use extension derived from validated MIME type, not from user filename
    const ext = MIME_TO_EXT[file.type] || ".jpg";
    const filename = `${randomUUID()}${ext}`;

    let url: string;

    if (isR2Configured()) {
      // Upload to Cloudflare R2
      const key = `uploads/${filename}`;
      url = await uploadToR2(key, buffer, file.type);
    } else {
      // Fallback to local filesystem (development only)
      const { writeFile, mkdir } = await import("fs/promises");
      const { join } = await import("path");
      const uploadDir = join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(join(uploadDir, filename), buffer);
      url = `/uploads/${filename}`;
    }

    // Save to media table
    const id = randomUUID();
    await db.insert(media).values({
      id,
      filename: file.name,
      url,
      sizeBytes: buffer.length,
      mimeType: file.type,
      altText: altText || file.name,
    });

    return NextResponse.json({ id, url, filename });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
