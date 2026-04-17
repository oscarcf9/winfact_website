-- MANUAL FIX: drizzle-kit also emitted revert statements for content_queue
-- because the schema snapshot from Fix 3 (different branch) was still in
-- drizzle/meta/. Those reverts are dropped here; this migration is for
-- Fix 4's commentary_log additions only.

ALTER TABLE `commentary_log` ADD `category` text;--> statement-breakpoint
ALTER TABLE `commentary_log` ADD `bucket` text;--> statement-breakpoint
ALTER TABLE `commentary_log` ADD `language` text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_commentary_sport_category_posted`
  ON `commentary_log` (`sport`,`category`,`posted_at`);
