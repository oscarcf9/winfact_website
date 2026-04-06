import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { victoryPosts, media, contentQueue } from "@/db/schema";
import { uploadToR2, isR2Configured } from "@/lib/r2";
import { generateBilingualCaptions } from "@/lib/victory-caption-generator";
import { sendTelegramPhoto, sendAdminNotification } from "@/lib/telegram";

export const runtime = "nodejs";
export const maxDuration = 120;

interface CreateBody {
  pickId?: string;
  imageBase64?: string;
  sport?: string;
  matchup?: string;
  pickText?: string;
  odds?: number | null;
  units?: number | null;
  tier?: "free" | "vip";
  winner?: string;
  team1Score?: number;
  team2Score?: number;
  captionEn?: string;
  captionEs?: string;
}

/**
 * Extract hashtags from a caption string (everything starting with #).
 */
function extractHashtags(caption: string): string {
  const tags = caption.match(/#\w+/g);
  return tags ? tags.join(" ") : "";
}


export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────
  const adminResult = await requireAdmin();
  if (adminResult.error) return adminResult.error;

  // ── Parse body ────────────────────────────────────────────
  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { pickId, imageBase64, sport, matchup, pickText, odds, units, tier, winner, team1Score, team2Score } = body;

  if (!pickId || !imageBase64 || !sport || !matchup || !pickText || !tier || !winner) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: pickId, imageBase64, sport, matchup, pickText, tier, winner",
      },
      { status: 400 },
    );
  }

  if (tier !== "free" && tier !== "vip") {
    return NextResponse.json(
      { error: 'tier must be "free" or "vip"' },
      { status: 400 },
    );
  }

  // ── Decode base64 image ───────────────────────────────────
  let imageBuffer: Buffer;
  try {
    // Accept both raw base64 and data-URL format
    const raw = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    imageBuffer = Buffer.from(raw, "base64");

    if (imageBuffer.length === 0) {
      throw new Error("Decoded buffer is empty");
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid base64 image data" },
      { status: 400 },
    );
  }

  // ── Upload composite to R2 ────────────────────────────────
  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "R2 storage is not configured" },
      { status: 503 },
    );
  }

  const timestamp = Date.now();
  const safeSport = sport.toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeWinner = winner.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const r2Key = `victory-posts/${safeSport}/${safeWinner}-${timestamp}.png`;

  let imageUrl: string;
  try {
    imageUrl = await uploadToR2(r2Key, imageBuffer, "image/png");
  } catch (err) {
    console.error("[victory-post/create] R2 upload failed:", err);
    return NextResponse.json(
      { error: "Failed to upload image to storage" },
      { status: 502 },
    );
  }

  // ── Bilingual captions — use provided or generate ────────
  let captionEn: string;
  let captionEs: string;

  if (body.captionEn && body.captionEs) {
    // Use user-edited captions from the Caption tab
    captionEn = body.captionEn;
    captionEs = body.captionEs;
    console.log("[victory-post/create] Using user-provided captions");
  } else {
    try {
      const captions = await generateBilingualCaptions({
        sport,
        matchup,
        pickText,
        odds: odds ?? null,
        tier,
      });
      captionEn = captions.captionEn;
      captionEs = captions.captionEs;
    } catch (err) {
      console.error("[victory-post/create] Caption generation failed:", err);
      const scoreStr =
        team1Score != null && team2Score != null
          ? ` (${team1Score}-${team2Score})`
          : "";
      captionEn = `Another win in the books! ${winner} covers${scoreStr}. Data doesn't miss. #WinFactPicks #${sport}`;
      captionEs = `Otra victoria! ${winner} gana${scoreStr}. Los datos no fallan. #WinFactPicks #${sport}`;
    }
  }

  const hashtags = extractHashtags(captionEn);

  // ── Save victory post ─────────────────────────────────────
  const victoryPostId = crypto.randomUUID();
  try {
    await db.insert(victoryPosts).values({
      id: victoryPostId,
      pickId,
      imageUrl,
      caption: captionEn,
      sport,
      tier,
      status: "draft",
    });
  } catch (err) {
    console.error("[victory-post/create] Failed to insert victory post:", err);
    return NextResponse.json(
      { error: "Failed to save victory post" },
      { status: 500 },
    );
  }

  // ── Save to media table ───────────────────────────────────
  const mediaId = crypto.randomUUID();
  try {
    await db.insert(media).values({
      id: mediaId,
      filename: `${safeWinner}-victory-${timestamp}.png`,
      url: imageUrl,
      mimeType: "image/png",
      sizeBytes: imageBuffer.length,
      altText: `Victory post: ${winner} wins ${matchup} (${sport})`,
    });
  } catch (err) {
    console.error("[victory-post/create] Failed to save media record:", err);
    // Non-critical — continue
  }

  // ── Insert into content queue ─────────────────────────────
  const contentQueueId = crypto.randomUUID();
  try {
    await db.insert(contentQueue).values({
      id: contentQueueId,
      type: "victory_post",
      referenceId: victoryPostId,
      title: `${winner} W - ${matchup}`,
      imageUrl,
      captionEn,
      captionEs,
      hashtags,
      status: "draft",
    });
  } catch (err) {
    console.error("[victory-post/create] Failed to insert content queue:", err);
    // Non-critical — the victory post was already saved
  }

  // ── Telegram preview to admin ─────────────────────────────
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (adminChatId) {
    const scoreStr =
      team1Score != null && team2Score != null
        ? `\nScore: ${team1Score}-${team2Score}`
        : "";
    const unitsStr = units != null ? `\nUnits: ${units}u` : "";
    const oddsStr = odds != null ? `\nOdds: ${odds > 0 ? "+" : ""}${odds}` : "";

    const telegramCaption = [
      `<b>NEW VICTORY POST (Draft)</b>`,
      ``,
      `<b>${sport}</b> | ${matchup}`,
      `Pick: ${pickText}`,
      `Winner: ${winner}${scoreStr}${oddsStr}${unitsStr}`,
      `Tier: ${tier.toUpperCase()}`,
    ].join("\n");

    try {
      await sendTelegramPhoto(adminChatId, imageUrl, telegramCaption, {
        parseMode: "HTML",
      });
    } catch (err) {
      console.error("[victory-post/create] Telegram photo failed:", err);
    }

    try {
      await sendAdminNotification(
        `Victory post draft created for ${winner} (${sport}). Review in the content queue.`,
      );
    } catch (err) {
      console.error("[victory-post/create] Admin notification failed:", err);
    }
  }

  return NextResponse.json({
    victoryPostId,
    imageUrl,
    captionEn,
    captionEs,
  });
}
