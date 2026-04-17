CREATE TABLE `admin_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_user_id` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text,
	`target_id` text,
	`details` text,
	`ip_address` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_admin_audit_log_admin` ON `admin_audit_log` (`admin_user_id`);--> statement-breakpoint
CREATE INDEX `idx_admin_audit_log_action` ON `admin_audit_log` (`action`);--> statement-breakpoint
CREATE INDEX `idx_admin_audit_log_created` ON `admin_audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `processed_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`processed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `push_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`platform` text,
	`active` integer DEFAULT 1,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_push_tokens_user_token` ON `push_tokens` (`user_id`,`token`);--> statement-breakpoint
CREATE INDEX `idx_push_tokens_active` ON `push_tokens` (`active`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`window_start` integer NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_rate_limits_key` ON `rate_limits` (`key`);--> statement-breakpoint
CREATE INDEX `idx_rate_limits_window` ON `rate_limits` (`window_start`);--> statement-breakpoint
ALTER TABLE `delivery_queue` ADD `batch_id` text;--> statement-breakpoint
ALTER TABLE `delivery_queue` ADD `updated_at` text DEFAULT (datetime('now'));--> statement-breakpoint
CREATE INDEX `idx_delivery_queue_status_batch` ON `delivery_queue` (`status`,`batch_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `email_opt_out` integer DEFAULT 0;--> statement-breakpoint
CREATE INDEX `idx_users_referred_by` ON `users` (`referred_by`);--> statement-breakpoint
CREATE INDEX `idx_users_role` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `idx_users_stripe_customer_id` ON `users` (`stripe_customer_id`);--> statement-breakpoint
CREATE INDEX `idx_picks_status_published` ON `picks` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `idx_picks_status_result` ON `picks` (`status`,`result`);--> statement-breakpoint
CREATE INDEX `idx_posts_status_published` ON `posts` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `idx_referrals_status_reward` ON `referrals` (`status`,`reward_applied`);--> statement-breakpoint
CREATE INDEX `idx_subscriptions_stripe_sub_id` ON `subscriptions` (`stripe_subscription_id`);--> statement-breakpoint
ALTER TABLE `api_integrations` DROP COLUMN `api_key`;