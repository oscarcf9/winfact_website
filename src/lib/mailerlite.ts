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
  const confidence = pick.confidence
    ? pick.confidence.charAt(0).toUpperCase() + pick.confidence.slice(1)
    : "Standard";

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
              <p style="margin: 0; color: #6b7280; font-size: 11px;">CONFIDENCE</p>
              <p style="margin: 0; color: #0B1F3B; font-size: 18px;">${confidence}</p>
            </div>
          </div>
        </div>
        ${pick.analysisEn ? `<p style="color: #374151; font-size: 14px; line-height: 1.6;">${pick.analysisEn}</p>` : ""}
        ${pick.modelEdge ? `<p style="color: #6b7280; font-size: 13px;">📈 Model Edge: ${pick.modelEdge.toFixed(1)}%</p>` : ""}
        <div style="margin-top: 24px; text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://winfactpicks.com"}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #1168D9, #0BC4D9); color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">View in Dashboard</a>
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

export async function sendTransactionalEmail(
  email: string,
  subject: string,
  htmlContent: string
): Promise<{ ok: boolean; error?: string }> {
  if (!MAILERLITE_API_KEY) {
    return { ok: false, error: "MailerLite not configured" };
  }

  try {
    // MailerLite doesn't have a direct transactional email API in the standard plan.
    // We create a single-subscriber campaign or use the automation/subscriber approach.
    // For now, we use a campaign targeting a single subscriber by email.

    // First ensure subscriber exists
    await mailerliteFetch("/subscribers", {
      method: "POST",
      body: JSON.stringify({
        email,
        status: "active",
      }),
    });

    // Create a single-subscriber campaign by creating a temporary group
    const groupName = `transactional_${Date.now()}`;
    const group = await mailerliteFetch("/groups", {
      method: "POST",
      body: JSON.stringify({ name: groupName }),
    });

    if (!group.data?.id) {
      return { ok: false, error: "Failed to create email group" };
    }

    // Add subscriber to group
    await mailerliteFetch(`/subscribers/${encodeURIComponent(email)}/groups/${group.data.id}`, {
      method: "POST",
    });

    // Create and send campaign
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
        groups: [group.data.id],
      }),
    });

    if (campaign.data?.id) {
      await mailerliteFetch(`/campaigns/${campaign.data.id}/actions/send`, {
        method: "POST",
      });
      return { ok: true };
    }

    return { ok: false, error: campaign.message || "Failed to send email" };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

export { buildPickEmailHtml };
