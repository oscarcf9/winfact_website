import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { ticketHistory } from "@/db/schema";
import { uploadToR2, deleteFromR2, isR2Configured } from "@/lib/r2";
import { eq, desc } from "drizzle-orm";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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

  // Validate file type and size
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  // Parse and validate JSON
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(ticketData);
  } catch {
    return NextResponse.json({ error: "Invalid ticket data" }, { status: 400 });
  }

  if (!isR2Configured()) {
    return NextResponse.json({ error: "R2 storage not configured" }, { status: 500 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const id = crypto.randomUUID();
  const key = `tickets/${id}.png`;
  const imageUrl = await uploadToR2(key, buffer, "image/png");

  await db.insert(ticketHistory).values({
    id,
    imageUrl,
    formData: ticketData,
    sport: (parsed.sport as string) || null,
    betType: (parsed.betType as string) || null,
    subBetType: (parsed.subBetType as string) || null,
    betDescription: (parsed.betDescription as string) || null,
    matchup: (parsed.matchup as string) || null,
    odds: (parsed.odds as string) || null,
    wager: (parsed.wager as string) || null,
    paid: (parsed.paid as string) || null,
    pickId: (parsed.pickId as string) || null,
    gameUrl: (parsed.gameUrl as string) || null,
    sizeBytes: buffer.length,
    createdBy: admin.userId,
  });

  return NextResponse.json({ id, imageUrl });
}

/** GET — List ticket history */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const rawLimit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
  const limit = Math.min(Math.max(rawLimit || 50, 1), 200);

  const tickets = await db
    .select()
    .from(ticketHistory)
    .orderBy(desc(ticketHistory.createdAt))
    .limit(limit);

  return NextResponse.json({ tickets });
}

/** DELETE — Remove a ticket from history + R2 */
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Clean up R2 file
  const [ticket] = await db
    .select({ imageUrl: ticketHistory.imageUrl })
    .from(ticketHistory)
    .where(eq(ticketHistory.id, body.id))
    .limit(1);

  if (ticket?.imageUrl && isR2Configured()) {
    try {
      const key = ticket.imageUrl.split("/").slice(-2).join("/"); // "tickets/{id}.png"
      await deleteFromR2(key);
    } catch {
      // Non-blocking — DB cleanup is more important
    }
  }

  await db.delete(ticketHistory).where(eq(ticketHistory.id, body.id));

  return NextResponse.json({ ok: true });
}
