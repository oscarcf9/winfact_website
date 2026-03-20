import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendTransactionalEmail } from "@/lib/mailerlite";
import { escapeHtml } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";
import { logAdminAction } from "@/lib/audit";
import { emailSchema } from "@/lib/validations";

type Params = { params: Promise<{ userId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  // Rate limit: 20 admin emails per minute
  const { success } = await rateLimit(req, { prefix: "admin-email", maxRequests: 20, windowMs: 60_000 });
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const { userId } = await params;
    const body = await req.json();
    const parsed = emailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const { subject, message } = parsed.data;

    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.email) {
      return NextResponse.json({ error: "User not found or no email" }, { status: 404 });
    }

    // Build simple email HTML
    const html = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0B1F3B, #1168D9); padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">WinFact Picks</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <div style="color: #374151; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${escapeHtml(message).replace(/\n/g, "<br>")}</div>
        </div>
      </div>
    `;

    const result = await sendTransactionalEmail(user.email, subject, html);

    if (result.ok) {
      await logAdminAction({
        adminUserId: admin.userId,
        action: "email_sent",
        targetType: "subscriber",
        targetId: userId,
        details: { subject },
        request: req,
      });
      return NextResponse.json({ ok: true, email: user.email });
    }
    return NextResponse.json({ error: result.error || "Failed to send" }, { status: 500 });
  } catch (error) {
    console.error("Send email error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
