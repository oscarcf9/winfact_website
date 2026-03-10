import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { testTelegramConnection } from "@/lib/telegram";
import { testMailerLiteConnection } from "@/lib/mailerlite";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const { channel } = await req.json();

    let result: { ok: boolean; error?: string; [key: string]: unknown } = { ok: false, error: "Unknown channel" };

    if (channel === "telegram_free" || channel === "telegram_vip" || channel === "telegram") {
      result = await testTelegramConnection();
    } else if (channel === "email") {
      result = await testMailerLiteConnection();
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Test failed" }, { status: 500 });
  }
}
