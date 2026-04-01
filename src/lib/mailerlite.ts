const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY || "";
const MAILERLITE_API = "https://connect.mailerlite.com/api";
const MAILERLITE_FREE_GROUP_ID = process.env.MAILERLITE_FREE_GROUP_ID || "";
const MAILERLITE_VIP_GROUP_ID = process.env.MAILERLITE_VIP_GROUP_ID || "";

type Pick = {
  sport: string;
  matchup: string;
  pickText: string;
  odds?: number | null;
  units?: number | null;
  confidence?: string | null;
  stars?: number | null;
  analysisEn?: string | null;
  analysisEs?: string | null;
  tier?: string | null;
  modelEdge?: number | null;
};

async function mailerliteFetch(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${MAILERLITE_API}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MAILERLITE_API_KEY}`,
      ...options.headers,
    },
  });
  return res.json();
}

function buildPickEmailHtml(pick: Pick): string {
  const oddsStr = pick.odds != null ? (pick.odds > 0 ? `+${pick.odds}` : String(pick.odds)) : "—";
  const starCount = pick.stars || (pick.confidence === "top" ? 5 : pick.confidence === "strong" ? 3 : 2);
  const starDisplay = "⭐".repeat(starCount);

  return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #0B1F3B, #1168D9); padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px;">🎯 New ${pick.tier === "vip" ? "VIP" : "Free"} Pick</h1>
      </div>
      <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">${pick.sport}</p>
          <p style="margin: 0 0 16px; color: #0B1F3B; font-size: 16px; font-weight: 600;">${pick.matchup}</p>
          <div style="display: flex; gap: 16px; flex-wrap: wrap;">
            <div>
              <p style="margin: 0; color: #6b7280; font-size: 11px;">PICK</p>
              <p style="margin: 0; color: #1168D9; font-size: 18px; font-weight: 700;">${pick.pickText}</p>
            </div>
            <div>
              <p style="margin: 0; color: #6b7280; font-size: 11px;">ODDS</p>
              <p style="margin: 0; color: #0B1F3B; font-size: 18px; font-family: monospace;">${oddsStr}</p>
            </div>
            <div>
              <p style="margin: 0; color: #6b7280; font-size: 11px;">UNITS</p>
              <p style="margin: 0; color: #0B1F3B; font-size: 18px; font-family: monospace;">${pick.units ?? "—"}</p>
            </div>
            <div>
              <p style="margin: 0; color: #6b7280; font-size: 11px;">RATING</p>
              <p style="margin: 0; color: #0B1F3B; font-size: 18px;">${starDisplay} ${starCount}/5</p>
            </div>
          </div>
        </div>
        ${pick.analysisEn ? `<p style="color: #374151; font-size: 14px; line-height: 1.6;">${pick.analysisEn}</p>` : ""}
        ${pick.modelEdge ? `<p style="color: #6b7280; font-size: 13px;">📈 Model Edge: ${pick.modelEdge.toFixed(1)}%</p>` : ""}
        <div style="margin-top: 24px; text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.winfactpicks.com"}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #1168D9, #0BC4D9); color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">View in Dashboard</a>
        </div>
      </div>
    </div>
  `;
}

export async function sendPickEmail(
  pick: Pick,
  tier: "free" | "vip"
): Promise<{ ok: boolean; campaignId?: string; error?: string }> {
  if (!MAILERLITE_API_KEY) {
    return { ok: false, error: "MailerLite not configured" };
  }

  const groupId = tier === "vip" ? MAILERLITE_VIP_GROUP_ID : MAILERLITE_FREE_GROUP_ID;
  if (!groupId) {
    return { ok: false, error: `No group ID for tier: ${tier}` };
  }

  try {
    // Create campaign
    const campaign = await mailerliteFetch("/campaigns", {
      method: "POST",
      body: JSON.stringify({
        name: `Pick: ${pick.sport} - ${pick.matchup} (${new Date().toISOString().split("T")[0]})`,
        type: "regular",
        emails: [
          {
            subject: `🎯 ${pick.sport}: ${pick.pickText}${pick.odds != null ? ` (${pick.odds > 0 ? "+" : ""}${pick.odds})` : ""}`,
            from_name: "WinFact Picks",
            from: process.env.MAILERLITE_FROM_EMAIL || "picks@winfactpicks.com",
            content: buildPickEmailHtml(pick),
          },
        ],
        groups: [groupId],
      }),
    });

    if (campaign.data?.id) {
      // Schedule/send campaign
      await mailerliteFetch(`/campaigns/${campaign.data.id}/actions/send`, {
        method: "POST",
      });
      return { ok: true, campaignId: campaign.data.id };
    }

    return { ok: false, error: campaign.message || "Failed to create campaign" };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

export async function testMailerLiteConnection(): Promise<{ ok: boolean; account?: string; error?: string }> {
  if (!MAILERLITE_API_KEY) return { ok: false, error: "No API key configured" };
  try {
    const data = await mailerliteFetch("/subscribers?limit=1");
    if (data.data) return { ok: true, account: "Connected" };
    return { ok: false, error: data.message || "Connection failed" };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

export async function getSubscriberCount(groupId: string): Promise<number> {
  try {
    const data = await mailerliteFetch(`/groups/${groupId}`);
    return data.data?.active_count || 0;
  } catch {
    return 0;
  }
}

const MAILERLITE_TRANSACTIONAL_GROUP_ID = process.env.MAILERLITE_TRANSACTIONAL_GROUP_ID || "";

/**
 * Get or create the persistent transactional group.
 * Uses a single shared group to avoid orphaned group bloat.
 */
let _transactionalGroupId: string | null = null;

async function getTransactionalGroupId(): Promise<string | null> {
  // Use env var if set
  if (MAILERLITE_TRANSACTIONAL_GROUP_ID) return MAILERLITE_TRANSACTIONAL_GROUP_ID;

  // Cache in memory for the duration of this serverless invocation
  if (_transactionalGroupId) return _transactionalGroupId;

  try {
    // Try to find existing group
    const groups = await mailerliteFetch("/groups?filter[name]=winfact_transactional&limit=1");
    if (groups.data?.length > 0) {
      _transactionalGroupId = groups.data[0].id;
      return _transactionalGroupId;
    }

    // Create it if it doesn't exist
    const created = await mailerliteFetch("/groups", {
      method: "POST",
      body: JSON.stringify({ name: "winfact_transactional" }),
    });
    if (created.data?.id) {
      _transactionalGroupId = created.data.id;
      return _transactionalGroupId;
    }
  } catch {
    // Fall through
  }
  return null;
}

export async function sendTransactionalEmail(
  email: string,
  subject: string,
  htmlContent: string
): Promise<{ ok: boolean; error?: string }> {
  if (!MAILERLITE_API_KEY) {
    return { ok: false, error: "MailerLite not configured" };
  }

  // Check if user has opted out of emails
  try {
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const [user] = await db
      .select({ emailOptOut: users.emailOptOut })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (user?.emailOptOut) {
      return { ok: false, error: "User has opted out of emails" };
    }
  } catch {
    // If check fails, continue sending (don't block transactional emails on DB errors)
  }

  try {
    // Ensure subscriber exists
    await mailerliteFetch("/subscribers", {
      method: "POST",
      body: JSON.stringify({ email, status: "active" }),
    });

    // Use a single persistent group instead of creating a new one each time
    const groupId = await getTransactionalGroupId();
    if (!groupId) {
      return { ok: false, error: "Failed to get transactional email group" };
    }

    // Add subscriber to the transactional group
    await mailerliteFetch(`/subscribers/${encodeURIComponent(email)}/groups/${groupId}`, {
      method: "POST",
    });

    // Create and send campaign targeting the transactional group
    const campaign = await mailerliteFetch("/campaigns", {
      method: "POST",
      body: JSON.stringify({
        name: `Transactional: ${subject.substring(0, 50)} (${new Date().toISOString()})`,
        type: "regular",
        emails: [
          {
            subject,
            from_name: "WinFact Picks",
            from: process.env.MAILERLITE_FROM_EMAIL || "picks@winfactpicks.com",
            content: htmlContent,
          },
        ],
        groups: [groupId],
      }),
    });

    if (campaign.data?.id) {
      await mailerliteFetch(`/campaigns/${campaign.data.id}/actions/send`, {
        method: "POST",
      });

      // Remove subscriber from transactional group after send to keep it clean
      await mailerliteFetch(
        `/groups/${groupId}/subscribers/${encodeURIComponent(email)}`,
        { method: "DELETE" }
      ).catch(() => {});

      return { ok: true };
    }

    return { ok: false, error: campaign.message || "Failed to send email" };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

/**
 * Clean up orphaned MailerLite groups (empty transactional_* groups from old code).
 * Safe to run periodically via cron.
 */
export async function cleanupOrphanedGroups(): Promise<{ deleted: number; errors: number }> {
  if (!MAILERLITE_API_KEY) return { deleted: 0, errors: 0 };

  const keepers = new Set([
    "VIP Subscribers", "Free Subscribers", "All Subscribers", "winfact_transactional",
  ]);
  let deleted = 0;
  let errors = 0;
  let cursor: string | null = null;

  // Paginate through all groups
  for (let page = 0; page < 20; page++) {
    const url = cursor ? `/groups?limit=50&cursor=${cursor}` : "/groups?limit=50";
    const response = await mailerliteFetch(url);
    const groups = response.data || [];
    if (groups.length === 0) break;

    for (const group of groups) {
      // Delete orphaned transactional groups (name starts with "transactional_" and has 0 subscribers)
      if (!keepers.has(group.name) && group.name?.startsWith("transactional_") && group.active_count === 0) {
        try {
          await mailerliteFetch(`/groups/${group.id}`, { method: "DELETE" });
          deleted++;
        } catch {
          errors++;
        }
      }
    }

    cursor = response.meta?.next_cursor;
    if (!cursor) break;
  }

  return { deleted, errors };
}

/**
 * Move a subscriber to the VIP group (and remove from FREE group).
 * Called when a subscription is created/activated.
 */
export async function moveSubscriberToVIP(email: string): Promise<void> {
  if (!MAILERLITE_API_KEY) return;
  try {
    // Ensure subscriber exists
    await mailerliteFetch("/subscribers", {
      method: "POST",
      body: JSON.stringify({ email, status: "active" }),
    });

    // Add to VIP group
    if (MAILERLITE_VIP_GROUP_ID) {
      await mailerliteFetch(
        `/subscribers/${encodeURIComponent(email)}/groups/${MAILERLITE_VIP_GROUP_ID}`,
        { method: "POST" }
      );
    }

    // Remove from FREE group
    if (MAILERLITE_FREE_GROUP_ID) {
      await mailerliteFetch(
        `/groups/${MAILERLITE_FREE_GROUP_ID}/subscribers/${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
    }
  } catch (error) {
    console.error("Failed to move subscriber to VIP:", error);
  }
}

/**
 * Move a subscriber back to the FREE group (and remove from VIP group).
 * Called when a subscription is cancelled/expired.
 */
export async function moveSubscriberToFree(email: string): Promise<void> {
  if (!MAILERLITE_API_KEY) return;
  try {
    // Ensure subscriber exists
    await mailerliteFetch("/subscribers", {
      method: "POST",
      body: JSON.stringify({ email, status: "active" }),
    });

    // Add to FREE group
    if (MAILERLITE_FREE_GROUP_ID) {
      await mailerliteFetch(
        `/subscribers/${encodeURIComponent(email)}/groups/${MAILERLITE_FREE_GROUP_ID}`,
        { method: "POST" }
      );
    }

    // Remove from VIP group
    if (MAILERLITE_VIP_GROUP_ID) {
      await mailerliteFetch(
        `/groups/${MAILERLITE_VIP_GROUP_ID}/subscribers/${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
    }
  } catch (error) {
    console.error("Failed to move subscriber to Free:", error);
  }
}

/**
 * Add a subscriber to the FREE group.
 * Called on initial free signup.
 */
export async function addSubscriberToFreeGroup(email: string, name?: string | null): Promise<void> {
  if (!MAILERLITE_API_KEY || !MAILERLITE_FREE_GROUP_ID) return;
  try {
    // Create/update subscriber
    await mailerliteFetch("/subscribers", {
      method: "POST",
      body: JSON.stringify({
        email,
        status: "active",
        ...(name ? { fields: { name } } : {}),
      }),
    });

    // Add to FREE group
    await mailerliteFetch(
      `/subscribers/${encodeURIComponent(email)}/groups/${MAILERLITE_FREE_GROUP_ID}`,
      { method: "POST" }
    );
  } catch (error) {
    console.error("Failed to add subscriber to free group:", error);
  }
}

export { buildPickEmailHtml };
