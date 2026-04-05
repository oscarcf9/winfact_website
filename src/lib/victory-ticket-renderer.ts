import sharp from "sharp";

export type TicketRenderInput = {
  sport: string;
  pickText: string;
  odds: number | null;
  units: number | null;
  matchup: string;
  team1Score?: number;
  team2Score?: number;
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Render a sportsbook-style victory ticket as a 700x500 PNG.
 * Uses sharp's SVG overlay to produce the image server-side.
 */
export async function renderTicketServer(
  input: TicketRenderInput,
): Promise<Buffer> {
  const { sport, pickText, odds, units, matchup, team1Score, team2Score } =
    input;

  const wager = (units ?? 1) * 100;
  let payout = wager;
  if (odds !== null) {
    if (odds >= 0) {
      payout = wager + wager * (odds / 100);
    } else {
      payout = wager + wager * (100 / Math.abs(odds));
    }
  }

  const hasScore =
    team1Score !== undefined &&
    team2Score !== undefined &&
    team1Score !== null &&
    team2Score !== null;

  // Split matchup into team names for score display
  const teams = matchup.split(/\s+vs\.?\s+/i);
  const team1Name = teams[0] ?? "";
  const team2Name = teams[1] ?? "";

  const oddsText =
    odds !== null ? (odds >= 0 ? `+${odds}` : `${odds}`) : "";

  const scoreSection = hasScore
    ? `
    <rect x="100" y="285" width="500" height="60" rx="12" ry="12" fill="rgba(0,0,0,0.35)"/>
    <text x="160" y="322" font-family="DejaVu Sans,Liberation Sans,sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="end">${escapeXml(team1Name)}</text>
    <text x="200" y="322" font-family="DejaVu Sans,Liberation Sans,sans-serif" font-size="24" font-weight="bold" fill="#FFD700" text-anchor="middle">${team1Score}</text>
    <text x="350" y="322" font-family="DejaVu Sans,Liberation Sans,sans-serif" font-size="14" fill="rgba(255,255,255,0.7)" text-anchor="middle">FINAL</text>
    <text x="500" y="322" font-family="DejaVu Sans,Liberation Sans,sans-serif" font-size="24" font-weight="bold" fill="#FFD700" text-anchor="middle">${team2Score}</text>
    <text x="540" y="322" font-family="DejaVu Sans,Liberation Sans,sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="start">${escapeXml(team2Name)}</text>
    `
    : "";

  const bottomY = hasScore ? 420 : 380;

  const svg = `<svg width="700" height="500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#05D17A"/>
      <stop offset="100%" stop-color="#04B568"/>
    </linearGradient>
    <clipPath id="rounded">
      <rect x="0" y="0" width="700" height="500" rx="24" ry="24"/>
    </clipPath>
  </defs>

  <g clip-path="url(#rounded)">
    <!-- Background -->
    <rect width="700" height="500" fill="url(#bg)"/>

    <!-- Header bar -->
    <rect width="700" height="80" fill="rgba(0,0,0,0.25)"/>
    <text x="30" y="50" font-family="DejaVu Sans,Liberation Sans,sans-serif" font-size="26" font-weight="bold" fill="#ffffff">${escapeXml(sport.toUpperCase())}</text>

    <!-- WIN badge -->
    <rect x="560" y="18" width="110" height="44" rx="10" ry="10" fill="rgba(255,255,255,0.2)"/>
    <text x="615" y="48" font-family="DejaVu Sans,Liberation Sans,sans-serif" font-size="22" font-weight="bold" fill="#ffffff" text-anchor="middle">WIN &#x2713;</text>

    <!-- Pick text -->
    <text x="350" y="145" font-family="DejaVu Sans,Liberation Sans,sans-serif" font-size="38" font-weight="bold" fill="#ffffff" text-anchor="middle">${escapeXml(pickText)}</text>

    <!-- Odds -->
    <text x="350" y="190" font-family="DejaVu Sans,Liberation Sans,sans-serif" font-size="24" fill="rgba(255,255,255,0.85)" text-anchor="middle">${escapeXml(oddsText)}</text>

    <!-- Matchup -->
    <text x="350" y="240" font-family="DejaVu Sans,Liberation Sans,sans-serif" font-size="20" fill="rgba(255,255,255,0.65)" text-anchor="middle">${escapeXml(matchup)}</text>

    <!-- Divider -->
    <line x1="60" y1="270" x2="640" y2="270" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>

    <!-- Score section (optional) -->
    ${scoreSection}

    <!-- Wager / Payout -->
    <text x="60" y="${bottomY}" font-family="DejaVu Sans,Liberation Sans,sans-serif" font-size="18" fill="rgba(255,255,255,0.7)">WAGER</text>
    <text x="60" y="${bottomY + 30}" font-family="DejaVu Sans,Liberation Sans,sans-serif" font-size="26" font-weight="bold" fill="#ffffff">$${wager.toFixed(0)}</text>

    <text x="640" y="${bottomY}" font-family="DejaVu Sans,Liberation Sans,sans-serif" font-size="18" fill="rgba(255,255,255,0.7)" text-anchor="end">PAYOUT</text>
    <text x="640" y="${bottomY + 30}" font-family="DejaVu Sans,Liberation Sans,sans-serif" font-size="26" font-weight="bold" fill="#FFD700" text-anchor="end">$${payout.toFixed(2)}</text>

    <!-- WinFact watermark -->
    <text x="350" y="485" font-family="DejaVu Sans,Liberation Sans,sans-serif" font-size="12" fill="rgba(255,255,255,0.35)" text-anchor="middle">WINFACT PICKS</text>
  </g>
</svg>`;

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return pngBuffer;
}
