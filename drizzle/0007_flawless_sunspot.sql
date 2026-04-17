-- MANUAL FIX: drizzle-kit also emitted revert statements for commentary_log
-- because the snapshot from Fix 4 (different branch) was still in drizzle/meta/.
-- Those reverts are removed here; this migration is strictly Fix 5's two new
-- tables plus their indexes.

CREATE TABLE IF NOT EXISTS `commentary_retry_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`original_log_id` text,
	`failed_channel` text NOT NULL,
	`message_text` text NOT NULL,
	`media_url` text,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`next_retry_at` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`last_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`original_log_id`) REFERENCES `commentary_log`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_retry_status_next` ON `commentary_retry_queue` (`status`,`next_retry_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_retry_channel` ON `commentary_retry_queue` (`failed_channel`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `distribution_log` (
	`id` text PRIMARY KEY NOT NULL,
	`content_type` text NOT NULL,
	`reference_id` text,
	`channel` text NOT NULL,
	`status` text NOT NULL,
	`buffer_post_id` text,
	`error` text,
	`latency_ms` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_dist_log_content_created` ON `distribution_log` (`content_type`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_dist_log_channel_created` ON `distribution_log` (`channel`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_dist_log_status_created` ON `distribution_log` (`status`,`created_at`);
