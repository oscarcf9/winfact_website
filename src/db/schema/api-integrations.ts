import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const apiIntegrations = sqliteTable("api_integrations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(), // "The Odds API", "Telegram Bot", "MailerLite", etc.
  type: text("type", {
    enum: ["odds", "telegram", "email", "push", "sms", "analytics", "ai"],
  }).notNull(),
  status: text("status", {
    enum: ["connected", "disconnected", "error", "rate_limited"],
  }).default("disconnected"),
  apiKey: text("api_key"), // Encrypted in production
  config: text("config"), // JSON: additional config
  lastHealthCheck: text("last_health_check"),
  lastError: text("last_error"),
  requestsToday: integer("requests_today").default(0),
  requestLimit: integer("request_limit"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const webhookLogs = sqliteTable("webhook_logs", {
  id: text("id").primaryKey(),
  source: text("source").notNull(), // "stripe", "clerk", "telegram", etc.
  direction: text("direction", { enum: ["incoming", "outgoing"] }).notNull(),
  endpoint: text("endpoint"),
  method: text("method"),
  statusCode: integer("status_code"),
  payload: text("payload"), // JSON
  response: text("response"), // JSON
  duration: integer("duration"), // ms
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});
