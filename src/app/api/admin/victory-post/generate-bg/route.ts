import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { media } from "@/db/schema";
import { generateVictoryBackground } from "@/lib/victory-image-generator";
import { buildBackgroundPrompt } from "@/lib/victory-prompts";
import { resolveWinningTeamVisuals } from "@/data/team-visuals";
import { uploadToR2, isR2Configured } from "@/lib/r2";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Style suffixes appended to the base prompt for variation. */
const STYLE_SUFFIXES: Record<string, string> = {
  arena_lights:
    "Emphasize intense overhead arena floodlights and dramatic god-ray beams cutting through haze.",
  city_skyline:
    "Emphasize the city skyline prominently — make it the hero of the upper third with vivid detail.",
  dramatic_sky:
    "Emphasize a dramatic, painterly sky with rich cloud formations and intense sunset/dusk color gradients.",
  smoke_flames:
    "Add theatrical smoke wisps and warm ember-like particles throughout the midground for raw intensity.",
  neon_night:
    "Shift the palette toward neon-lit night energy — electric highlights, cool LED accents, and vibrant glow.",
};

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────
  const adminResult = await requireAdmin();
  if (adminResult.error) return adminResult.error;

  // ── Parse body ────────────────────────────────────────────
  let body: { sport?: string; team?: string; style?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { sport, team, style } = body;

  if (!sport || !team) {
    return NextResponse.json(
      { error: "Missing required fields: sport, team" },
      { status: 400 },
    );
  }

  // ── Resolve team visuals ──────────────────────────────────
  const teamVisuals = resolveWinningTeamVisuals(team, team, sport);

  if (!teamVisuals) {
    return NextResponse.json(
      { error: `Could not resolve team visuals for "${team}" in ${sport}` },
      { status: 422 },
    );
  }

  // ── Build prompt ──────────────────────────────────────────
  let prompt = buildBackgroundPrompt(sport, teamVisuals);

  if (style && STYLE_SUFFIXES[style]) {
    prompt += `\n\nStyle emphasis: ${STYLE_SUFFIXES[style]}`;
  }

  // ── Generate image ────────────────────────────────────────
  let imageBuffer: Buffer;
  try {
    imageBuffer = await generateVictoryBackground(prompt);
  } catch (err) {
    console.error("[generate-bg] Image generation failed:", err);
    return NextResponse.json(
      { error: "Image generation failed. Please try again." },
      { status: 502 },
    );
  }

  // ── Upload to R2 ──────────────────────────────────────────
  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "R2 storage is not configured" },
      { status: 503 },
    );
  }

  const timestamp = Date.now();
  const safeSport = sport.toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeTeam = team.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const r2Key = `victory-bg/${safeSport}/${safeTeam}-${timestamp}.png`;

  let url: string;
  try {
    url = await uploadToR2(r2Key, imageBuffer, "image/png");
  } catch (err) {
    console.error("[generate-bg] R2 upload failed:", err);
    return NextResponse.json(
      { error: "Failed to upload image to storage" },
      { status: 502 },
    );
  }

  // ── Save to media table ───────────────────────────────────
  const mediaId = crypto.randomUUID();
  try {
    await db.insert(media).values({
      id: mediaId,
      filename: `${safeTeam}-${timestamp}.png`,
      url,
      mimeType: "image/png",
      sizeBytes: imageBuffer.length,
      width: 1024,
      height: 1536,
      altText: `Victory background for ${team} (${sport})`,
    });
  } catch (err) {
    // Non-critical — log but still return the URL
    console.error("[generate-bg] Failed to save media record:", err);
  }

  return NextResponse.json({ url });
}
