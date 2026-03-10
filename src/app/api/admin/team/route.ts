import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { teamMembers, activityLog, users } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const members = await db.select().from(teamMembers).orderBy(desc(teamMembers.createdAt));
    const allUsers = await db.select({ id: users.id, email: users.email, name: users.name }).from(users);
    const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u]));

    const membersWithDetails = members.map((m) => ({
      ...m,
      user: userMap[m.userId] || null,
    }));

    const recentActivity = await db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(50);

    return NextResponse.json({ members: membersWithDetails, recentActivity });
  } catch {
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const data = await req.json();
    const id = crypto.randomUUID();

    await db.insert(teamMembers).values({
      id,
      userId: data.userId,
      teamRole: data.teamRole,
      permissions: data.permissions ? JSON.stringify(data.permissions) : null,
      invitedBy: admin.userId,
    });

    return NextResponse.json({ id });
  } catch {
    return NextResponse.json({ error: "Failed to add team member" }, { status: 500 });
  }
}
