import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { users, subscriptions } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));

    const allSubs = await db.select().from(subscriptions);
    const subsByUser = new Map<string, typeof allSubs[0]>();
    for (const sub of allSubs) {
      if (sub.userId) subsByUser.set(sub.userId, sub);
    }

    // Build CSV
    const headers = ["Email", "Name", "Role", "Plan", "Status", "Period End", "Joined"];
    const rows = allUsers.map((user) => {
      const sub = subsByUser.get(user.id);
      return [
        user.email,
        user.name || "",
        user.role || "member",
        sub?.tier || "free",
        sub?.status || "none",
        sub?.currentPeriodEnd || "",
        user.createdAt || "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="subscribers-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
