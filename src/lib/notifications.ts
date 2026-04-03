import { sendAdminNotification } from "./telegram";
import { sendTransactionalEmail } from "./mailerlite";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.winfactpicks.com";

type NotifyOptions = {
  subject: string;
  telegramMessage: string;
  emailHtml?: string;
};

/**
 * Unified admin notification — sends to both Telegram and email.
 * Telegram is the primary channel; email is best-effort backup.
 * Never throws — logs errors silently.
 */
export async function notifyAdmin(opts: NotifyOptions): Promise<void> {
  // Always send Telegram
  await sendAdminNotification(opts.telegramMessage).catch((err) =>
    console.error("[notify] Telegram failed:", err)
  );

  // Send email if ADMIN_EMAIL is configured
  if (ADMIN_EMAIL && opts.emailHtml) {
    await sendTransactionalEmail(ADMIN_EMAIL, opts.subject, opts.emailHtml).catch((err) =>
      console.error("[notify] Email failed:", err)
    );
  }
}

/**
 * Notify Oscar that a blog draft is ready for review.
 */
export async function notifyBlogDraftReady(post: {
  title: string;
  sport: string;
  matchup: string;
  postId?: string;
  slug?: string;
}): Promise<void> {
  await notifyAdmin({
    subject: `📝 Blog Draft Ready: ${post.matchup}`,
    telegramMessage:
      `📝 <b>Blog Draft Ready</b>\n\n` +
      `Title: ${post.title}\n` +
      `Sport: ${post.sport}\n` +
      `Matchup: ${post.matchup}\n\n` +
      `💡 Review: ${SITE_URL}/admin/blog`,
    emailHtml: buildEmailHtml({
      heading: "Blog Draft Ready for Review",
      body: `<p>A new blog post has been auto-generated:</p>
        <p><strong>${post.title}</strong></p>
        <p>Sport: ${post.sport} | Matchup: ${post.matchup}</p>`,
      ctaText: "Review Blog Draft",
      ctaLink: `${SITE_URL}/admin/blog`,
    }),
  });
}

/**
 * Notify Oscar that a victory post is ready for review.
 */
export async function notifyVictoryPostReady(post: {
  sport: string;
  matchup: string;
  pickText: string;
  imageUrl: string;
}): Promise<void> {
  await notifyAdmin({
    subject: `🏆 Victory Post Ready: ${post.matchup}`,
    telegramMessage:
      `📸 <b>Victory Post Ready</b>\n\n` +
      `Pick: ${post.matchup} — ${post.pickText} ✅\n` +
      `Sport: ${post.sport}\n\n` +
      `💡 Review: ${SITE_URL}/admin/media`,
    emailHtml: buildEmailHtml({
      heading: "Victory Post Ready for Review",
      body: `<p>A new victory celebration image has been generated:</p>
        <p><strong>${post.matchup} — ${post.pickText} ✅</strong></p>
        <p>Sport: ${post.sport}</p>
        ${post.imageUrl ? `<p><img src="${post.imageUrl}" alt="Victory Post" style="max-width: 300px; border-radius: 8px;" /></p>` : ""}`,
      ctaText: "Review Victory Post",
      ctaLink: `${SITE_URL}/admin/media`,
    }),
  });
}

/**
 * Build a simple branded email HTML template.
 */
function buildEmailHtml(opts: {
  heading: string;
  body: string;
  ctaText: string;
  ctaLink: string;
}): string {
  return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #0B1F3B, #1168D9); padding: 20px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 18px;">🎯 WinFact Picks — Admin</h1>
      </div>
      <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="color: #0B1F3B; font-size: 16px; margin: 0 0 16px;">${opts.heading}</h2>
        ${opts.body}
        <div style="margin-top: 24px;">
          <a href="${opts.ctaLink}" style="display: inline-block; background: linear-gradient(135deg, #1168D9, #0BC4D9); color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">${opts.ctaText}</a>
        </div>
        <p style="color: #9ca3af; font-size: 11px; margin-top: 24px;">This is an automated notification from WinFact Picks admin.</p>
      </div>
    </div>
  `;
}
