import { NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

function verifyToken(email: string, token: string): boolean {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(email).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
}

function htmlPage(title: string, message: string, success: boolean): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:480px;margin:60px auto;padding:0 16px;">
    <div style="background:linear-gradient(135deg,#0B1F3B,#1168D9);padding:24px 32px;border-radius:16px 16px 0 0;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">WinFact Picks</h1>
    </div>
    <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;text-align:center;">
      <div style="font-size:40px;margin-bottom:16px;">${success ? "&#9989;" : "&#10060;"}</div>
      <h2 style="color:#0B1F3B;margin:0 0 12px;font-size:20px;">${title}</h2>
      <p style="color:#374151;font-size:14px;line-height:1.7;">${message}</p>
      <div style="margin-top:24px;">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.winfactpicks.com"}" style="display:inline-block;background:linear-gradient(135deg,#1168D9,#0BC4D9);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;">Go to Homepage</a>
      </div>
    </div>
  </div>
</body>
</html>`;
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  const token = req.nextUrl.searchParams.get("token");

  if (!email || !token) {
    return htmlPage("Invalid Link", "This unsubscribe link is missing required parameters.", false);
  }

  try {
    if (!verifyToken(email, token)) {
      return htmlPage("Invalid Link", "This unsubscribe link is invalid or has expired.", false);
    }
  } catch {
    return htmlPage("Invalid Link", "This unsubscribe link is invalid or has expired.", false);
  }

  try {
    // Mark user as opted out
    await db
      .update(users)
      .set({ emailOptOut: 1, updatedAt: new Date().toISOString() })
      .where(eq(users.email, email));

    // Remove from all MailerLite groups (fire-and-forget)
    try {
      const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY;
      if (MAILERLITE_API_KEY) {
        await fetch(
          `https://connect.mailerlite.com/api/subscribers/${encodeURIComponent(email)}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${MAILERLITE_API_KEY}`,
            },
          }
        );
      }
    } catch (e) {
      console.error("MailerLite unsubscribe error:", e);
    }

    return htmlPage(
      "You've Been Unsubscribed",
      "You will no longer receive emails from WinFact Picks. If this was a mistake, you can update your preferences from your dashboard.",
      true
    );
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return htmlPage("Something Went Wrong", "We couldn't process your request. Please try again or contact support.", false);
  }
}
