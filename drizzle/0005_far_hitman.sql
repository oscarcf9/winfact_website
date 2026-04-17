-- MANUAL FIX: drizzle-kit generated a CREATE TABLE for content_queue because
-- the table was never tracked in prior schema snapshots. In production the
-- table already exists, so we need ALTER statements instead.
-- (Going forward, future snapshots will have content_queue tracked and
-- generation will work normally.)

ALTER TABLE `content_queue` ADD COLUMN `processing_started_at` text;--> statement-breakpoint
ALTER TABLE `content_queue` ADD COLUMN `retry_count` integer DEFAULT 0;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_content_queue_status_scheduled` ON `content_queue` (`status`,`scheduled_at`);

-- Note: 'processing' is added to the status enum at the TypeScript layer only.
-- SQLite enum() from drizzle-orm is type-only (no CHECK constraint), so no
-- DB-level change is needed for the status value.
