CREATE TABLE `pricing_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`name_en` text NOT NULL,
	`name_es` text NOT NULL,
	`description_en` text NOT NULL,
	`description_es` text NOT NULL,
	`price` real NOT NULL,
	`currency` text DEFAULT 'USD',
	`interval` text NOT NULL,
	`cta_en` text NOT NULL,
	`cta_es` text NOT NULL,
	`features_en` text NOT NULL,
	`features_es` text NOT NULL,
	`stripe_price_id` text,
	`trial_days` integer DEFAULT 0,
	`is_popular` integer DEFAULT false,
	`badge_en` text,
	`badge_es` text,
	`is_active` integer DEFAULT true,
	`is_free` integer DEFAULT false,
	`display_order` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pricing_plans_key_unique` ON `pricing_plans` (`key`);--> statement-breakpoint
ALTER TABLE `picks` ADD `capper_id` text;--> statement-breakpoint
CREATE INDEX `idx_picks_sport` ON `picks` (`sport`);--> statement-breakpoint
CREATE INDEX `idx_picks_status` ON `picks` (`status`);--> statement-breakpoint
CREATE INDEX `idx_picks_tier` ON `picks` (`tier`);--> statement-breakpoint
CREATE INDEX `idx_picks_published_at` ON `picks` (`published_at`);--> statement-breakpoint
CREATE INDEX `idx_picks_game_date` ON `picks` (`game_date`);--> statement-breakpoint
CREATE INDEX `idx_picks_status_tier` ON `picks` (`status`,`tier`);--> statement-breakpoint
CREATE INDEX `idx_picks_sport_status` ON `picks` (`sport`,`status`);--> statement-breakpoint
ALTER TABLE `promo_codes` ADD `stripe_coupon_id` text;--> statement-breakpoint
ALTER TABLE `referrals` ADD `reward_type` text;--> statement-breakpoint
ALTER TABLE `referrals` ADD `reward_applied_at` text;--> statement-breakpoint
CREATE INDEX `idx_referrals_referrer_id` ON `referrals` (`referrer_id`);--> statement-breakpoint
CREATE INDEX `idx_referrals_status` ON `referrals` (`status`);--> statement-breakpoint
CREATE INDEX `idx_referrals_referred_email` ON `referrals` (`referred_email`);--> statement-breakpoint
ALTER TABLE `users` ADD `notes` text;--> statement-breakpoint
CREATE INDEX `idx_delivery_queue_status` ON `delivery_queue` (`status`);--> statement-breakpoint
CREATE INDEX `idx_delivery_queue_scheduled_for` ON `delivery_queue` (`scheduled_for`);--> statement-breakpoint
CREATE INDEX `idx_delivery_queue_status_scheduled` ON `delivery_queue` (`status`,`scheduled_for`);--> statement-breakpoint
CREATE INDEX `idx_posts_status` ON `posts` (`status`);--> statement-breakpoint
CREATE INDEX `idx_posts_category` ON `posts` (`category`);--> statement-breakpoint
CREATE INDEX `idx_posts_published_at` ON `posts` (`published_at`);--> statement-breakpoint
CREATE INDEX `idx_subscriptions_user_id` ON `subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_subscriptions_status` ON `subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_subscriptions_user_status` ON `subscriptions` (`user_id`,`status`);