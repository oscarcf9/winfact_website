import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { publishToChannel } from "@/lib/buffer";

/**
 * POST /api/admin/distribution/buffer-test
 * Body: { channel: "twitter" | "threads" | "instagram" | "facebook", text: string, imageUrl?: string }
 *
 * Admin-only. Sends a single test message through the same publishPost()
 * pipeline the production distribution code uses. Returns the full
 * per-channel Buffer result (including Buffer post ID on success and the
 * raw error string on failure) so Oscar can correlate which channels are
 * actually receiving content vs which are silently failing.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const body = await req.json();
    const channel = (body?.channel || "").toString().trim().toLowerCase();
    const text = (body?.text || "").toString();
    const imageUrl = body?.imageUrl ? String(body.imageUrl) : undefined;

    if (!["twitter", "threads", "instagram", "facebook"].includes(channel)) {
      return NextResponse.json(
        { error: "channel must be one of: twitter, threads, instagram, facebook" },
        { status: 400 }
      );
    }
    if (!text || text.length < 3) {
      return NextResponse.json({ error: "text is required (min 3 chars)" }, { status: 400 });
    }

    const startedAt = Date.now();
    const result = await publishToChannel(channel as "twitter" | "threads" | "instagram" | "facebook", text, imageUrl);
    const latencyMs = Date.now() - startedAt;

    return NextResponse.json({
      channel,
      text,
      imageUrl: imageUrl ?? null,
      latencyMs,
      result,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
