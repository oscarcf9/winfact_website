import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const processedEvents = sqliteTable("processed_events", {
  eventId: text("event_id").primaryKey(),
  processedAt: integer("processed_at").notNull(),
});
