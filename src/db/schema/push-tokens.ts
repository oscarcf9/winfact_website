import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const pushTokens = sqliteTable("push_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  token: text("token").notNull(),
  platform: text("platform", { enum: ["ios", "android"] }),
  active: integer("active").default(1),
  createdAt: integer("created_at"),
  updatedAt: integer("updated_at"),
}, (table) => ([
  uniqueIndex("idx_push_tokens_user_token").on(table.userId, table.token),
  index("idx_push_tokens_active").on(table.active),
]));
