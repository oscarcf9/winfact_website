import sharp from "sharp";
import type { TeamVisualData } from "@/data/team-visuals";

// ---------------------------------------------------------------------------
// Label text variations (bilingual English / Spanish)
// ---------------------------------------------------------------------------

const LABEL_VARIATIONS: Record<"vip" | "free", string[]> = {
  vip: [
    "VIP PICK HIT",
    "LA EXCLUSIVA",
    "VIP WINNER",
    "EXCLUSIVE VIP PLAY",
    "PICK VIP COBRADO",
  ],
  free: [
    "FREE {SPORT} PICKS",
    "PICKS DE {SPORT}",
    "FREE PICK WINNER",
    "PICK GRATIS COBRADO",
    "FREE {SPORT} WIN",
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escape special XML characters so user-supplied text is safe inside SVG. */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Pick a random element from an array. */
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// Canvas constants
// ---------------------------------------------------------------------------

// Instagram 3:4 feed post dimensions (2026 standard: 1080×1440)
const CANVAS_W = 1080;
const CANVAS_H = 1440;
const TICKET_WIDTH = 702; // ~65% of canvas width

// ---------------------------------------------------------------------------
// Main compositing function
// ---------------------------------------------------------------------------

export interface CompositeVictoryPostParams {
  /** Background image buffer from gpt-image-1 (1024×1536). */
  backgroundImage: Buffer;
  /** Ticket image buffer from the ticket renderer (700×500). */
  ticketImage: Buffer;
  /** Sport name, e.g. "NBA", "MLB". */
  sport: string;
  /** Subscription tier. */
  tier: "free" | "vip";
  /** Team visual data used for color accents. */
  teamVisuals: TeamVisualData;
  /** Optional label text override; when omitted a random variation is used. */
  labelText?: string;
}

/**
 * Assemble the final 1080×1350 Instagram-ready victory post image.
 *
 * Layers (bottom → top):
 *   1. Background image (resized to canvas)
 *   2. SVG overlay (gradient + label text + branding)
 *   3. Ticket image (centered near top)
 */
export async function compositeVictoryPost(
  params: CompositeVictoryPostParams,
): Promise<Buffer> {
  const {
    backgroundImage,
    ticketImage,
    sport,
    tier,
    teamVisuals,
    labelText: labelOverride,
  } = params;

  // 1. Resize background to canvas dimensions --------------------------------
  const background = await sharp(backgroundImage)
    .resize(CANVAS_W, CANVAS_H, { fit: "cover" })
    .png()
    .toBuffer();

  // 2. Resize ticket to ~65% of canvas width, maintain aspect ratio -----------
  const ticketMeta = await sharp(ticketImage).metadata();
  const ticketAspect =
    ticketMeta.width && ticketMeta.height
      ? ticketMeta.height / ticketMeta.width
      : 500 / 700; // fallback to expected ratio
  const ticketH = Math.round(TICKET_WIDTH * ticketAspect);

  const ticket = await sharp(ticketImage)
    .resize(TICKET_WIDTH, ticketH, { fit: "fill" })
    .png()
    .toBuffer();

  // 3. Build label text -------------------------------------------------------
  const rawLabel =
    labelOverride ?? randomChoice(LABEL_VARIATIONS[tier]);
  const label = rawLabel.replace(/\{SPORT\}/g, sport.toUpperCase());

  // 4. Create SVG overlay -----------------------------------------------------
  const svgOverlay = buildOverlaySvg(label, teamVisuals);

  // 5. Composite layers -------------------------------------------------------
  const ticketX = Math.round((CANVAS_W - TICKET_WIDTH) / 2);
  const ticketY = Math.round(CANVAS_H * 0.08); // top ~8%

  const result = await sharp(background)
    .composite([
      { input: Buffer.from(svgOverlay), top: 0, left: 0 },
      { input: ticket, top: ticketY, left: ticketX },
    ])
    .png()
    .toBuffer();

  return result;
}

// ---------------------------------------------------------------------------
// SVG overlay builder
// ---------------------------------------------------------------------------

function buildOverlaySvg(
  label: string,
  _teamVisuals: TeamVisualData,
): string {
  const escapedLabel = escapeXml(label);

  // Positions relative to canvas height
  const labelY = CANVAS_H - 130;
  const brandY = CANVAS_H - 60;

  // Use sans-serif (guaranteed on all platforms including Vercel serverless).
  // Arial/Helvetica are NOT available on Vercel's minimal Linux images,
  // which causes text to render as boxes/rectangles.
  // DejaVu Sans is available on most Linux distros including Vercel's.
  const fontStack = "DejaVu Sans, Liberation Sans, sans-serif";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}">
  <defs>
    <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.35" stop-color="rgba(0,0,0,0)" stop-opacity="0"/>
      <stop offset="0.70" stop-color="rgb(0,0,0)" stop-opacity="0.55"/>
      <stop offset="1.00" stop-color="rgb(0,0,0)" stop-opacity="0.85"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity="0.7"/>
    </filter>
  </defs>

  <!-- Bottom gradient overlay -->
  <rect x="0" y="0" width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#bottomFade)"/>

  <!-- Label text -->
  <text
    x="${CANVAS_W / 2}"
    y="${labelY}"
    text-anchor="middle"
    font-family="${fontStack}"
    font-size="48"
    font-weight="700"
    fill="white"
    filter="url(#shadow)"
  >${escapedLabel}</text>

  <!-- Branding -->
  <text
    x="${CANVAS_W / 2}"
    y="${brandY}"
    text-anchor="middle"
    font-family="${fontStack}"
    font-size="24"
    font-weight="400"
    fill="rgba(255,255,255,0.85)"
    letter-spacing="2"
  >WINFACTPICKS.COM</text>
</svg>`;
}
