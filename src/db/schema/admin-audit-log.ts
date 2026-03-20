import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const adminAuditLog = sqliteTable("admin_audit_log", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  adminUserId: text("admin_user_id").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  details: text("details"), // JSON string with action-specific data (no PII)
  ipAddress: text("ip_address"),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
}, (table) => ([
  index("idx_admin_audit_log_admin").on(table.adminUserId),
  index("idx_admin_audit_log_action").on(table.action),
  index("idx_admin_audit_log_created").on(table.createdAt),
]));
