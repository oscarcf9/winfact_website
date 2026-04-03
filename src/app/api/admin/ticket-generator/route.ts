import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { ticketHistory } from "@/db/schema";
import { uploadToR2, isR2Configured } from "@/lib/r2";
import { eq, desc } from "drizzle-orm";

/** POST — Save a generated ticket to R2 + DB */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const ticketData = formData.get("data") as string | null;

  if (!file || !ticketData) {
    return NextResponse.json({ error: "Missing file or data" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const id = crypto.randomUUID();
  const key = `tickets/${id}.png`;

  let imageUrl: string;

  if (isR2Configured()) {
    imageUrl = await uploadToR2(key, buffer, "image/png");
  } else {
    return NextResponse.json({ error: "R2 storage not configured" }, { status: 500 });
  }

  const parsed = JSON.parse(ticketData);

  await db.insert(ticketHistory).values({
    id,
    imageUrl,
    formData: ticketData,
    sport: parsed.sport || null,
    betType: parsed.betType || null,
    subBetType: parsed.subBetType || null,
    betDescription: parsed.betDescription || null,
    matchup: parsed.matchup || null,
    odds: parsed.odds || null,
    wager: parsed.wager || null,
    paid: parsed.paid || null,
    pickId: parsed.pickId || null,
    gameUrl: parsed.gameUrl || null,
    sizeBytes: buffer.length,
    createdBy: admin.userId,
  });

  return NextResponse.json({ id, imageUrl });
}

/** GET — List ticket history */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");

  const tickets = await db
    .select()
    .from(ticketHistory)
    .orderBy(desc(ticketHistory.createdAt))
    .limit(limit);

  return NextResponse.json({ tickets });
}

/** DELETE — Remove a ticket from history */
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(ticketHistory).where(eq(ticketHistory.id, id));

  return NextResponse.json({ ok: true });
}
