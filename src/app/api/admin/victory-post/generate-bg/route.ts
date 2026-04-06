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

/** Style overrides that structurally change the scene — not just mild emphasis. */
const STYLE_SUFFIXES: Record<string, string> = {
  arena_lights:
    "OVERRIDE SCENE: Replace the upper third with a dramatically lit indoor arena — rows of intense overhead floodlights piercing through theatrical haze and smoke. The light beams are the hero element. Cold white and warm amber light mixing. Stadium rafters visible through the haze. No skyline — pure indoor arena intensity.",
  city_skyline:
    "OVERRIDE SCENE: Make the city skyline the dominant visual element occupying the top 60% of the frame. Photorealistic architectural detail, dramatic backlighting creating silhouettes. The city should feel monumental and proud — lit up in celebration. Window lights, rooftop spotlights, and distant fireworks reflections.",
  dramatic_sky:
    "OVERRIDE SCENE: Replace the upper two-thirds with an epic, painterly sky — massive cloud formations with dramatic sunset/sunrise light. Rich purples, deep oranges, fiery reds, and gold rays breaking through clouds. The sky should look like a renaissance painting meets modern HDR photography. No arena, no buildings — just the sky and atmospheric particles below it.",
  smoke_flames:
    "OVERRIDE SCENE: Fill the composition with thick theatrical smoke and warm ember particles. Fire-like orange and red glow sources from below. Sparks and floating embers throughout. Dark and moody with pockets of intense warmth. The mood is raw, underground, fight-night intensity. Think boxing ring smoke meets concert pyrotechnics.",
  neon_night:
    "OVERRIDE SCENE: Shift the entire palette to cyberpunk neon night energy. Electric blue, hot pink, vivid purple, and acid green LED accents. Wet reflective surfaces catching neon light. The city at night with glowing signage reflections. Cool-toned with pops of electric color. Futuristic sports aesthetic.",
};

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────
  const adminResult = await requireAdmin();
  if (adminResult.error) return adminResult.error;

  // ── Parse body ────────────────────────────────────────────
  let body: { sport?: string; team?: string; style?: string; customPrompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { sport, team, style, customPrompt } = body;

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

  // ── Build prompt with randomized modifiers ─────────────────
  let prompt = buildBackgroundPrompt(sport, teamVisuals);

  if (style && STYLE_SUFFIXES[style]) {
    prompt += `\n\n${STYLE_SUFFIXES[style]}`;
  }

  // Add randomized variation modifiers to prevent repetitive outputs
  const timeOfDay = ["golden hour sunset", "deep twilight blue hour", "midnight under lights", "early evening dusk", "overcast moody afternoon"][Math.floor(Math.random() * 5)];
  const weather = ["clear sky", "dramatic storm clouds rolling in", "light rain with reflections", "crisp cold night air with visible breath", "hazy warm atmosphere"][Math.floor(Math.random() * 5)];
  const cameraAngle = ["wide establishing shot", "low angle looking upward", "slight dutch angle for dynamic energy", "centered symmetrical composition", "off-center rule-of-thirds framing"][Math.floor(Math.random() * 5)];
  prompt += `\n\nVARIATION SEED: Time of day: ${timeOfDay}. Weather/atmosphere: ${weather}. Camera: ${cameraAngle}.`;

  // Allow admin to inject custom description for further control
  if (customPrompt?.trim()) {
    prompt += `\n\nADDITIONAL DIRECTION FROM USER: ${customPrompt.trim()}`;
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
