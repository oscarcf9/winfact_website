/**
 * Victory post background prompt templates for gpt-image-1.
 * Each sport has 3 cinematic variations — team-colored, dark bottom third for overlays.
 * No people, no text, no logos — pure cinematic backgrounds for ticket compositing.
 */

import type { TeamVisualData } from "@/data/team-visuals";

export type SportPromptVariation = {
  id: string;
  sport: string;
  template: string;
};

// ---------------------------------------------------------------------------
// Prompt variations — 3 per sport (15 total) + 1 generic fallback
// ---------------------------------------------------------------------------

export const VICTORY_BACKGROUND_PROMPTS: SportPromptVariation[] = [
  // ═══════════════════════════════════════════════════════════
  // NBA — Arena atmosphere, court energy, city pride
  // ═══════════════════════════════════════════════════════════
  {
    id: "nba-v1",
    sport: "NBA",
    template: `A premium cinematic sports background for a basketball victory celebration. No people, no text, no logos, no branding.

Color palette driven by {primary_color} and {secondary_color} — these are the dominant tones throughout.

Scene composition from top to bottom:
— TOP THIRD: A soft, out-of-focus impression of the {city} skyline at dusk, blended with warm arena floodlights casting god rays downward. Subtle golden hour haze.
— MIDDLE THIRD: Abstract basketball arena energy — blurred scoreboard lights, the warm glow of arena spotlights, ghosted hardwood floor texture fading into the composition. Faint basketball surface grain embedded in the midground. Wisps of celebration confetti and fine gold particles floating through light beams.
— BOTTOM THIRD: A rich, deep gradient fading to near-black darkness. This is the text/overlay zone — must be substantially darker than the rest, creating a natural vignette shelf. Smooth gradient transition, not a hard cutoff.

Victory atmosphere: Radial golden light burst from upper-center. Fine confetti particles and sparkle accents scattered across the frame. Light streaks and subtle lens flare. The entire image feels like the moment after a buzzer-beater win.

Style: Cinematic, high-resolution, premium sports aesthetic. Bright and energetic in the top half, dramatically dark in the bottom third. Modern, never flat, never cluttered. 4:5 portrait aspect ratio (1080x1350).`,
  },
  {
    id: "nba-v2",
    sport: "NBA",
    template: `A high-end digital background celebrating a basketball victory. No people, no text, no logos.

Dominant palette: {primary_color} and {secondary_color} with {accent_color} highlights.

Scene:
— A dramatic low-angle perspective as if looking up from courtside. Hardwood floor texture visible in the extreme foreground, dissolving upward into abstract arena lights and energy.
— Midground filled with explosive celebratory particles — gold confetti, fine sparkles, and soft bokeh light orbs in {primary_color} tones.
— Upper portion: Soft {city} cityscape silhouette visible through arena atmosphere and haze, blending with warm spotlights.
— BOTTOM THIRD: Deep, rich gradient fading to near-black. Clean and dark — reserved for overlay content. Smooth, cinematic fade.

Textures: Ghosted basketball seam stitching embedded subtly in the mid-background. Faint court line geometry dissolved into the composition.

Mood: Championship energy, spotlight drama, premium and modern. Golden rim lighting. The image tells a story of victory without a single word. 4:5 portrait ratio (1080x1350).`,
  },
  {
    id: "nba-v3",
    sport: "NBA",
    template: `A cinematic victory-themed sports background blending basketball and city identity. No people, no text, no logos.

Colors: Built on {primary_color} and {secondary_color}. Environmental accents in warm gold and clean white.

Scene:
— TOP: A wide, dreamy panoramic impression of {city}'s iconic skyline — softly blurred and color-graded in team tones. Dramatic sunset/dusk lighting with clouds catching {primary_color} and golden hues.
— MIDDLE: The skyline dissolves into abstract sports energy — arena light beams cutting through atmosphere, floating celebration particles, subtle basketball texture overlays blended into the sky.
— BOTTOM THIRD: A smooth, heavy gradient darkening to near-black. This area must be significantly darker than the rest — functioning as a visual shelf for text and ticket overlays.

Accents: Fine metallic confetti, soft light rays from multiple angles, gentle lens flare. A sense of pride and belonging — this city won tonight.

Style: Bright, emotional, cinematic. Premium sports poster quality. Not dark or moody — celebratory and warm with a controlled dark base. 4:5 portrait (1080x1350).`,
  },

  // ═══════════════════════════════════════════════════════════
  // MLB — Stadium lights, diamond energy, golden hour ballpark
  // ═══════════════════════════════════════════════════════════
  {
    id: "mlb-v1",
    sport: "MLB",
    template: `A premium cinematic sports background for a baseball victory celebration. No people, no text, no logos.

Color palette: {primary_color} and {secondary_color} dominant, with warm golden and {accent_color} accents.

Scene composition:
— TOP THIRD: Soft impression of {city} skyline blended with towering stadium light standards — the iconic look of a night game. Warm amber and {primary_color} sky tones. Subtle cloud texture.
— MIDDLE THIRD: The atmosphere of a ballpark after a win — abstract stadium structure fading into the background, soft bokeh from stadium lights, ghosted baseball stitching texture woven into the composition. Fine dirt/dust particles illuminated by spotlights. Celebration confetti and gold sparkles.
— BOTTOM THIRD: Heavy gradient darkening to near-black. Rich, clean, and substantially darker than the upper portions. Smooth cinematic vignette for overlay space.

Textures: Faint red baseball seam stitching ghosted into the mid-section. Subtle diamond/infield dirt texture impression in the lower-mid area.

Mood: Night game magic, walk-off energy, warm stadium glow. Premium and modern. 4:5 portrait (1080x1350).`,
  },
  {
    id: "mlb-v2",
    sport: "MLB",
    template: `A high-end baseball-themed victory background. No people, no text, no logos.

Palette: {primary_color}, {secondary_color}, warm gold highlights.

Scene:
— A dramatic composition built around abstract diamond energy — soft floodlight beams converging from above like the lights of a ballpark at night. The beams carry {primary_color} color tones.
— Midground: Floating baseball elements — a ghosted, semi-transparent baseball seam texture large and centered, dissolving into particles. Fine red dirt dust catching light. Gold and white confetti scattered through beams.
— Background: Soft {city} urban impression visible through the atmosphere — buildings and structures color-graded in team tones.
— BOTTOM THIRD: Deep gradient to near-black. Clean and ready for overlays.

Textures: Baseball leather grain subtly embedded in the overall texture. Faint chalk line geometry from the diamond dissolved into the edges.

Mood: Grand slam celebration, lights blazing, crowd energy implied through visual intensity. 4:5 portrait (1080x1350).`,
  },
  {
    id: "mlb-v3",
    sport: "MLB",
    template: `A cinematic baseball victory background capturing golden hour stadium magic. No people, no text, no logos.

Colors: {primary_color} and {secondary_color} with rich golden sunset warmth.

Scene:
— TOP: A breathtaking sunset sky blended with {city} skyline silhouettes and ballpark light towers. Rich amber, peach, and {primary_color} gradients in the clouds. Dramatic and emotional.
— MIDDLE: The golden light pours down through abstract ballpark atmosphere — ghosted bleacher structures, light haze, celebration particles catching the warm light. Soft bokeh orbs in team colors. Fine confetti floating through sunbeams.
— BOTTOM THIRD: Smooth gradient into deep darkness. Near-black at the very bottom with a natural, cinematic transition.

Textures: Subtle grass field green hints in the mid-lower area transitioning into the dark gradient. Faint baseball stitching pattern embedded in the sky texture.

Mood: Magic hour at the ballpark — warm, emotional, victorious. The kind of light that makes everything look legendary. 4:5 portrait (1080x1350).`,
  },

  // ═══════════════════════════════════════════════════════════
  // NFL — Friday night lights, gridiron glory, city champion
  // ═══════════════════════════════════════════════════════════
  {
    id: "nfl-v1",
    sport: "NFL",
    template: `A premium cinematic football victory background. No people, no text, no logos.

Palette: {primary_color} and {secondary_color} dominant, with dramatic white stadium light accents.

Scene:
— TOP THIRD: Towering stadium floodlight banks blazing downward, cutting through atmospheric haze. {city} skyline faintly visible behind and between the light structures. Dramatic sky in {primary_color} tones.
— MIDDLE THIRD: The intensity of stadium atmosphere — thick light beams piercing through smoke/haze, confetti blizzard of team-colored and gold particles. Ghosted football gridiron yard lines fading across the mid-plane. Abstract end zone geometry dissolved into the edges.
— BOTTOM THIRD: Heavy, controlled gradient to near-black. Darker and richer than the upper sections, with a smooth professional fade.

Textures: Faint pigskin leather texture ghosted in the background. Subtle yard-line hash marks dissolved into the lower-mid composition. Grass texture hints at the transition point.

Mood: Super Bowl energy, championship moment, stadium lights blazing through smoke. Intense, dramatic, victorious. 4:5 portrait (1080x1350).`,
  },
  {
    id: "nfl-v2",
    sport: "NFL",
    template: `A high-end football victory background with raw power and energy. No people, no text, no logos.

Colors: {primary_color}, {secondary_color}, metallic silver/chrome accents.

Scene:
— A dramatic upward-looking perspective — as if standing on the field looking up at the lights and sky. Massive light beams shoot upward and outward from the bottom, creating radiating power lines in {primary_color} tones.
— Midground: Explosive celebration energy — team-colored confetti, metallic streamers, gold sparkles, and fine particles filling the air. The confetti is dense and spectacular.
— Upper portion: {city} sky visible through the celebration, color-graded in deep {primary_color} and {secondary_color}.
— BOTTOM THIRD: Strong gradient to near-black. The base must be dark and clean.

Textures: Ghosted football lace stitching pattern embedded in light beams. Faint turf fiber texture in the extreme lower portions.

Mood: Lombardi Trophy energy — domination, power, celebration. Chrome and gold accents for a championship feel. 4:5 portrait (1080x1350).`,
  },
  {
    id: "nfl-v3",
    sport: "NFL",
    template: `A cinematic football victory background centered on city pride. No people, no text, no logos.

Palette: {primary_color} and {secondary_color} with warm gold championship tones.

Scene:
— TOP: An epic {city} skyline rendered in team colors — buildings lit in {primary_color} and {secondary_color} against a dramatic sky. Trophy gold light pouring over the city like a victory announcement.
— MIDDLE: The cityscape dissolves into abstract football energy — stadium light glows, celebration fireworks bursts (subtle, not literal), team-colored particle streams, and golden confetti.
— BOTTOM THIRD: Rich, dark gradient fading to near-black. Heavy and cinematic — the visual base of the composition.

Textures: Subtle football field hash marks fading into the lower portions. Ghosted goalpost silhouettes integrated into the skyline transition.

Mood: The city is celebrating — warm, proud, golden. A championship homecoming feel. 4:5 portrait (1080x1350).`,
  },

  // ═══════════════════════════════════════════════════════════
  // Soccer — Pitch atmosphere, goal celebration, continental prestige
  // ═══════════════════════════════════════════════════════════
  {
    id: "soccer-v1",
    sport: "Soccer",
    template: `A premium cinematic soccer/football victory background. No people, no text, no logos.

Palette: {primary_color} and {secondary_color} with emerald pitch green accents and golden celebration tones.

Scene:
— TOP THIRD: European stadium atmosphere — soft impression of a grand stadium bowl from inside, with tiered stands dissolving into {city} skyline elements. Warm floodlights creating dramatic beams through night air. Sky tinted in {primary_color}.
— MIDDLE THIRD: Abstract pitch energy — soft green grass field glow transitioning upward into celebration atmosphere. Net mesh texture ghosted in the background. Fine rain-like particles catching floodlight (the classic European night game look). Gold and {secondary_color} confetti floating through light beams.
— BOTTOM THIRD: Deep, smooth gradient to near-black. Clean and dark for overlay content.

Textures: Faint hexagonal soccer ball panel pattern dissolved into the mid-background. Ghosted pitch line markings — center circle or penalty box arcs — subtly embedded.

Mood: Champions League night — electric, prestigious, historic. The roar of the crowd told through light and atmosphere. 4:5 portrait (1080x1350).`,
  },
  {
    id: "soccer-v2",
    sport: "Soccer",
    template: `A high-end soccer victory background with explosive energy. No people, no text, no logos.

Colors: {primary_color}, {secondary_color}, white net highlights, golden accents.

Scene:
— A dramatic perspective from behind the goal — the net visible as a soft, transparent mesh overlay across the upper portion, backlit by stadium floods. Through the net, celebration energy explodes: team-colored flares, smoke wisps, golden confetti, and light particles.
— Midground: The space between net and atmosphere filled with pure celebration — fire-like sparkle accents, {primary_color} colored smoke wisps, floating confetti.
— Background: {city} landmarks softly visible through stadium atmosphere above the light standards.
— BOTTOM THIRD: Rich gradient to near-black with a subtle grass-to-darkness transition.

Textures: Goal net mesh prominent but semi-transparent. Faint pitch stripe patterns in the lower area.

Mood: GOOOOOL energy — the moment the net ripples. Explosive, passionate, unforgettable. 4:5 portrait (1080x1350).`,
  },
  {
    id: "soccer-v3",
    sport: "Soccer",
    template: `A cinematic soccer victory background with prestige and class. No people, no text, no logos.

Palette: {primary_color} and {secondary_color} with royal gold, deep navy, and silver accents.

Scene:
— TOP: A majestic night sky over {city} — the skyline rendered in team tones with elegant golden illumination. Stars or distant city lights creating bokeh in {secondary_color}.
— MIDDLE: The prestigious atmosphere of European football — stadium bowl impression dissolving into the sky, soft floodlight columns, refined confetti (less chaotic, more elegant), and golden particle streams. Subtle trophy/medal metallic reflections in the light.
— BOTTOM THIRD: Luxurious dark gradient to near-black. Darker and more dramatic than the rest, with richness in the transition.

Textures: Faint soccer ball panel geometry at large scale, ghosted into the sky. Subtle pitch marking arcs integrated into the composition with extreme transparency.

Mood: Champions — not just winners. Regal, prestigious, earned. Golden trophy light meets club identity. 4:5 portrait (1080x1350).`,
  },

  // ═══════════════════════════════════════════════════════════
  // NHL — Ice arena, frozen city, spotlight celly
  // ═══════════════════════════════════════════════════════════
  {
    id: "nhl-v1",
    sport: "NHL",
    template: `A premium cinematic hockey victory background. No people, no text, no logos.

Palette: {primary_color} and {secondary_color} with icy white, cold blue, and silver accents.

Scene:
— TOP THIRD: Arena atmosphere — massive scoreboard glow and overhead light rigs casting downward beams through cold arena air. {city} skyline faintly integrated above the arena structure. Sky in deep {primary_color} tones.
— MIDDLE THIRD: The cold, electric energy of a hockey arena — ice surface reflections creating blue-white glow from below, celebration confetti and fine ice crystal particles floating through spotlight beams. Ghosted hockey rink markings (center ice circle, face-off dots) dissolved into the composition.
— BOTTOM THIRD: Gradient to near-black with a subtle icy blue transition before going dark. Clean overlay zone.

Textures: Faint ice surface texture — scratched and battle-worn. Ghosted puck texture or stick blade silhouette subtly embedded. Glass boards reflection hints at the edge.

Mood: Overtime winner in Game 7 — cold air, hot celebration, arena erupting. Electric and intense. 4:5 portrait (1080x1350).`,
  },
  {
    id: "nhl-v2",
    sport: "NHL",
    template: `A cinematic hockey victory background merging ice energy with city pride. No people, no text, no logos.

Colors: {primary_color}, {secondary_color}, silver, icy white, crystal blue highlights.

Scene:
— TOP: {city} skyline with a wintery, crystalline quality — buildings catching ice-blue and {primary_color} light, cold sky with subtle aurora-like color bands in team tones.
— MIDDLE: City dissolves into abstract arena energy — cold light beams, ice crystal particles, silver and white confetti catching spotlight glow. The atmosphere feels cold but victorious — breath-in-the-air energy.
— BOTTOM THIRD: Dark gradient to near-black with icy blue undertones in the transition zone.

Textures: Faint ice scratch patterns across the full composition. Ghosted hockey rink geometry in the mid-ground. Subtle puck rubber texture impression.

Mood: Stanley Cup celebration on home ice — frozen city, fire in the arena. Raw, cold, powerful. 4:5 portrait (1080x1350).`,
  },
  {
    id: "nhl-v3",
    sport: "NHL",
    template: `A high-end hockey celebration background. No people, no text, no logos.

Palette: {primary_color}, {secondary_color}, bright white spotlight, gold trophy accents.

Scene:
— A single massive spotlight beam cutting down from above through cold arena air, creating a dramatic cone of light in the center of the frame. The beam carries fine ice crystals, gold confetti, and celebration particles.
— Around the spotlight: Dark, moody arena atmosphere with faint secondary lights in {primary_color} and {secondary_color}. The contrast between the bright center beam and dark surroundings is dramatic.
— Background: Faint arena bowl structure and {city} elements visible in the darkness beyond the spotlight.
— BOTTOM THIRD: The spotlight fades into a deep, near-black gradient at the base. The darkest zone of the image.

Textures: Ice surface reflection catching the spotlight beam in the lower-mid area. Faint hockey stick blade silhouettes dissolved into the dark edges.

Mood: The spotlight moment — one beam, all glory. Dramatic, cinematic, iconic. 4:5 portrait (1080x1350).`,
  },
];

// ---------------------------------------------------------------------------
// Generic fallback for unmatched sports (NCAAF, NCAAB, etc.)
// ---------------------------------------------------------------------------

const GENERIC_FALLBACK_TEMPLATE = `A premium cinematic sports victory background. No people, no text, no logos.

Color palette: {primary_color} and {secondary_color} with golden celebration accents.

Scene:
— TOP THIRD: Soft {city} skyline impression blended with dramatic stadium floodlights and warm golden sky.
— MIDDLE THIRD: Abstract celebratory energy — light beams, confetti, bokeh orbs in team colors, fine sparkle particles floating through atmosphere.
— BOTTOM THIRD: Rich, deep gradient fading to near-black. Substantially darker than the rest — clean overlay zone.

Style: Cinematic, high-resolution, premium sports aesthetic. 4:5 portrait (1080x1350).`;

// ---------------------------------------------------------------------------
// Builder function
// ---------------------------------------------------------------------------

/**
 * Build a ready-to-use background generation prompt for gpt-image-1.
 *
 * - Filters available prompts by sport (case-insensitive).
 * - Picks a random variation from matches, or falls back to generic.
 * - Replaces `{team_name}`, `{city}`, `{primary_color}`, `{secondary_color}`, `{accent_color}`.
 */
export function buildBackgroundPrompt(
  sport: string,
  team: TeamVisualData,
): string {
  const sportLower = sport.toLowerCase();
  const matches = VICTORY_BACKGROUND_PROMPTS.filter(
    (p) => p.sport.toLowerCase() === sportLower,
  );

  const template =
    matches.length > 0
      ? matches[Math.floor(Math.random() * matches.length)].template
      : GENERIC_FALLBACK_TEMPLATE;

  return template
    .replace(/\{team_name\}/g, team.teamName)
    .replace(/\{city\}/g, team.city)
    .replace(/\{primary_color\}/g, team.primaryColor)
    .replace(/\{secondary_color\}/g, team.secondaryColor)
    .replace(/\{accent_color\}/g, team.accentColor);
}
