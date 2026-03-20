import { db } from "@/db";
import { adminAuditLog } from "@/db/schema";

export async function logAdminAction(params: {
  adminUserId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  request?: Request;
}): Promise<void> {
  try {
    await db.insert(adminAuditLog).values({
      adminUserId: params.adminUserId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      details: params.details ? JSON.stringify(params.details) : null,
      ipAddress: params.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
  } catch (error) {
    // Audit logging should never block the main action
    console.error("Audit log error:", error);
  }
}
