import { db } from "@/db";
import { victoryPosts, media, contentQueue } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { resolveWinningTeamVisuals } from "@/data/team-visuals";
import { buildBackgroundPrompt } from "./victory-prompts";
import { generateVictoryBackground } from "./victory-image-generator";
import { renderTicketServer } from "./victory-ticket-renderer";
import { compositeVictoryPost } from "./victory-compositor";
import { generateVictoryCaption } from "./victory-caption-generator";
import { uploadToR2, isR2Configured } from "./r2";
import { sendAdminNotification } from "./telegram";
import { notifyVictoryPostReady } from "./notifications";
import { getSiteContent } from "@/db/queries/site-content";

// ─── Types ───────────────────────────────────────────────────

export type VictoryPostPickData = {
  id: string;
  sport: string;
  matchup: string;
  pickText: string;
  odds: number | null;
  units: number | null;
  tier: "free" | "vip";
  team1Score?: number;
  team2Score?: number;
};

// ─── Queue: fast write, called by settler and admin ──────────

/**
 * Queue a victory post for generation.
 * This is FAST — just checks the toggle, deduplicates, and inserts a
 * "pending" row into victory_posts with the pick data as JSON.
 * Called by both the auto-settler and the admin picks PUT route.
 * Never throws — errors are logged silently.
 */
export async function queueVictoryPost(pick: VictoryPostPickData): Promise<void> {
  try {
    // Check feature toggle
    const enabled = await getSiteContent("victory_posts_enabled");
    if (enabled !== "true") return;

    // Deduplicate
    const existing = await db
      .select({ id: victoryPosts.id })
      .from(victoryPosts)
      .where(eq(victoryPosts.pickId, pick.id))
      .limit(1);

    if (existing.length > 0) return;

    // Write pending row — store pick data as JSON in the caption field temporarily
    // (will be overwritten with actual caption during generation)
    await db.insert(victoryPosts).values({
      id: randomUUID(),
      pickId: pick.id,
      imageUrl: "", // placeholder until generated
      caption: JSON.stringify(pick), // pick data for the generator to use
      sport: pick.sport,
      tier: pick.tier,
      status: "pending",
    });

    console.log(`[victory-post] Queued pick ${pick.id} for generation`);
  } catch (error) {
    console.error(`[victory-post] Failed to queue pick ${pick.id}:`, error);
  }
}

// ─── Process: heavy work, called by dedicated cron ───────────

/**
 * Process a single pending victory post.
 * Does the heavy work: gpt-image-1, ticket rendering, compositing, caption, R2 upload.
 * Called by /api/cron/generate-victory-posts — one at a time, each in its own cron cycle.
 * Returns true if a post was processed, false if nothing was pending.
 */
export async function processNextVictoryPost(): Promise<boolean> {
  // Find the oldest pending victory post
  const [pending] = await db
    .select()
    .from(victoryPosts)
    .where(eq(victoryPosts.status, "pending"))
    .limit(1);

  if (!pending) return false;

  // Parse the stored pick data
  let pick: VictoryPostPickData;
  try {
    pick = JSON.parse(pending.caption) as VictoryPostPickData;
  } catch {
    console.error(`[victory-post] Invalid pick data for ${pending.id}, marking failed`);
    await db.update(victoryPosts).set({ status: "failed" }).where(eq(victoryPosts.id, pending.id));
    return true;
  }

  try {
    console.log(`[victory-post] Processing pick ${pick.id}`);

    // 1. Resolve team visuals
    const teamVisuals = resolveWinningTeamVisuals(
      pick.matchup, pick.pickText, pick.sport
    );

    if (!teamVisuals) {
      console.warn(`[victory-post] No team visual data for: ${pick.pickText} (${pick.sport})`);
      await db.update(victoryPosts).set({ status: "skipped", caption: "No team visual data found" }).where(eq(victoryPosts.id, pending.id));
      return true;
    }

    // 2. Build background prompt
    const backgroundPrompt = buildBackgroundPrompt(pick.sport, teamVisuals);

    // 3. Generate background image
    console.log(`[victory-post] Generating background for ${teamVisuals.teamName}`);
    const backgroundBuffer = await generateVictoryBackground(backgroundPrompt);

    // 4. Render ticket image
    console.log("[victory-post] Rendering ticket");
    const ticketBuffer = await renderTicketServer({
      sport: pick.sport,
      pickText: pick.pickText,
      odds: pick.odds,
      units: pick.units,
      matchup: pick.matchup,
      team1Score: pick.team1Score,
      team2Score: pick.team2Score,
    });

    // 5. Composite final image
    console.log("[victory-post] Compositing final image");
    const finalImage = await compositeVictoryPost({
      backgroundImage: backgroundBuffer,
      ticketImage: ticketBuffer,
      sport: pick.sport,
      tier: pick.tier,
      teamVisuals,
    });

    // 6. Generate caption
    console.log("[victory-post] Generating caption");
    const caption = await generateVictoryCaption({
      sport: pick.sport,
      matchup: pick.matchup,
      pickText: pick.pickText,
      odds: pick.odds,
      tier: pick.tier,
    });

    // 7. Upload to R2
    let imageUrl: string;
    const filename = `victory-${pick.id}-${Date.now()}.png`;

    if (isR2Configured()) {
      const key = `uploads/${filename}`;
      imageUrl = await uploadToR2(key, finalImage, "image/png");
      console.log(`[victory-post] Uploaded to R2: ${imageUrl}`);
    } else {
      const { writeFile, mkdir } = await import("fs/promises");
      const { join } = await import("path");
      const uploadDir = join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(join(uploadDir, filename), finalImage);
      imageUrl = `/uploads/${filename}`;
      console.log(`[victory-post] Saved locally: ${imageUrl}`);
    }

    // 8. Save to media library
    const mediaId = randomUUID();
    await db.insert(media).values({
      id: mediaId,
      filename,
      url: imageUrl,
      mimeType: "image/png",
      width: 1080,
      height: 1350,
      altText: `Victory post: ${pick.matchup} — ${pick.pickText}`,
    });

    // 9. Update victory post row: pending → draft
    await db.update(victoryPosts).set({
      imageUrl,
      caption,
      status: "draft",
    }).where(eq(victoryPosts.id, pending.id));

    // 10. Insert into content queue for scheduling
    await db.insert(contentQueue).values({
      id: randomUUID(),
      type: "victory_post",
      referenceId: pending.id,
      title: `${pick.sport}: ${pick.pickText} ✅`,
      preview: `${pick.matchup} — ${pick.pickText}`,
      imageUrl,
      captionEn: caption,
      captionEs: caption,
      hashtags: `#${pick.sport} #WinFactPicks #Winner #SportsBetting`,
      platform: "all",
      status: "draft",
    }).catch((err) => console.error("[victory-post] Content queue insert failed:", err));

    // 11. Notify admin via Telegram + email
    await notifyVictoryPostReady({
      sport: pick.sport,
      matchup: pick.matchup,
      pickText: pick.pickText,
      imageUrl,
    });

    console.log(`[victory-post] Complete for pick ${pick.id}`);
    return true;
  } catch (error) {
    console.error(`[victory-post] Failed for pick ${pick.id}:`, error);

    // Mark as failed so it doesn't retry forever
    await db.update(victoryPosts).set({ status: "failed" }).where(eq(victoryPosts.id, pending.id)).catch(() => {});

    try {
      await sendAdminNotification(
        `⚠️ Victory post generation failed\n\nPick: ${pick.matchup}\nError: ${error instanceof Error ? error.message : String(error)}`
      );
    } catch {
      // Don't compound the failure
    }
    return true;
  }
}
