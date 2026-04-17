CREATE TABLE `affiliate_payouts` (
	`id` text PRIMARY KEY NOT NULL,
	`affiliate_id` text,
	`amount` real NOT NULL,
	`status` text DEFAULT 'pending',
	`payment_method` text,
	`transaction_id` text,
	`period_start` text,
	`period_end` text,
	`created_at` text DEFAULT (datetime('now')),
	`paid_at` text,
	FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `affiliates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`tracking_code` text NOT NULL,
	`commission_rate` real DEFAULT 10,
	`commission_type` text DEFAULT 'percentage',
	`tier` text DEFAULT 'standard',
	`total_referrals` integer DEFAULT 0,
	`total_conversions` integer DEFAULT 0,
	`total_earned` real DEFAULT 0,
	`total_paid` real DEFAULT 0,
	`payment_method` text,
	`payment_email` text,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `affiliates_tracking_code_unique` ON `affiliates` (`tracking_code`);--> statement-breakpoint
CREATE TABLE `api_integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'disconnected',
	`api_key` text,
	`config` text,
	`last_health_check` text,
	`last_error` text,
	`requests_today` integer DEFAULT 0,
	`request_limit` integer,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `webhook_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`direction` text NOT NULL,
	`endpoint` text,
	`method` text,
	`status_code` integer,
	`payload` text,
	`response` text,
	`duration` integer,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `channel_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`channel` text NOT NULL,
	`enabled` integer DEFAULT false,
	`config` text NOT NULL,
	`last_tested_at` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `channel_configs_channel_unique` ON `channel_configs` (`channel`);--> statement-breakpoint
CREATE TABLE `content_calendar` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`stage` text DEFAULT 'idea',
	`scheduled_date` text,
	`assigned_to` text,
	`linked_post_id` text,
	`linked_pick_id` text,
	`template` text,
	`notes` text,
	`sport` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `delivery_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`pick_id` text,
	`queue_id` text,
	`channel` text NOT NULL,
	`status` text NOT NULL,
	`recipient_count` integer DEFAULT 0,
	`metadata` text,
	`error` text,
	`sent_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`pick_id`) REFERENCES `picks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `delivery_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`pick_id` text,
	`channels` text NOT NULL,
	`tier` text NOT NULL,
	`status` text DEFAULT 'pending',
	`scheduled_for` text,
	`processed_at` text,
	`error` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`pick_id`) REFERENCES `picks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `games_today` (
	`id` text PRIMARY KEY NOT NULL,
	`sport` text NOT NULL,
	`game_id` text NOT NULL,
	`home_team` text NOT NULL,
	`away_team` text NOT NULL,
	`commence_time` text NOT NULL,
	`venue` text,
	`status` text DEFAULT 'scheduled',
	`model_spread` real,
	`model_total` real,
	`model_edge` real,
	`sharp_action` text,
	`public_bet_pct` real,
	`public_money_pct` real,
	`injury_report` text,
	`weather` text,
	`pick_status` text DEFAULT 'pending',
	`pick_id` text,
	`edge_tier` text DEFAULT 'none',
	`fetched_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `games_today_game_id_unique` ON `games_today` (`game_id`);--> statement-breakpoint
CREATE TABLE `activity_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`resource_type` text,
	`resource_id` text,
	`details` text,
	`ip_address` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`url` text NOT NULL,
	`url_webp` text,
	`url_thumb` text,
	`size_bytes` integer,
	`mime_type` text,
	`width` integer,
	`height` integer,
	`alt_text` text,
	`uploaded_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`channel_email` integer DEFAULT true,
	`channel_push` integer DEFAULT true,
	`channel_sms` integer DEFAULT false,
	`channel_telegram` integer DEFAULT false,
	`sport_mlb` integer DEFAULT true,
	`sport_nfl` integer DEFAULT true,
	`sport_nba` integer DEFAULT true,
	`sport_nhl` integer DEFAULT true,
	`sport_soccer` integer DEFAULT true,
	`sport_ncaa` integer DEFAULT true,
	`quiet_hours_start` text,
	`quiet_hours_end` text,
	`timezone` text DEFAULT 'America/New_York',
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `odds_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`sport` text NOT NULL,
	`game_id` text NOT NULL,
	`home_team` text NOT NULL,
	`away_team` text NOT NULL,
	`commence_time` text NOT NULL,
	`bookmaker` text NOT NULL,
	`market_type` text NOT NULL,
	`home_odds` real,
	`away_odds` real,
	`draw_odds` real,
	`spread_home` real,
	`spread_away` real,
	`total_over` real,
	`total_under` real,
	`opening_home_odds` real,
	`opening_away_odds` real,
	`line_movement` real,
	`fetched_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `performance_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`period` text NOT NULL,
	`wins` integer DEFAULT 0,
	`losses` integer DEFAULT 0,
	`pushes` integer DEFAULT 0,
	`units_won` real DEFAULT 0,
	`roi_pct` real DEFAULT 0,
	`clv_avg` real DEFAULT 0,
	`computed_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `pick_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`pick_id` text,
	`user_id` text,
	`action` text NOT NULL,
	`changes_summary` text,
	`snapshot_before` text,
	`snapshot_after` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`pick_id`) REFERENCES `picks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `picks` (
	`id` text PRIMARY KEY NOT NULL,
	`sport` text NOT NULL,
	`league` text,
	`matchup` text NOT NULL,
	`pick_text` text NOT NULL,
	`game_date` text,
	`odds` integer,
	`units` real,
	`model_edge` real,
	`confidence` text DEFAULT 'standard',
	`analysis_en` text,
	`analysis_es` text,
	`tier` text DEFAULT 'vip',
	`status` text DEFAULT 'draft',
	`result` text,
	`closing_odds` integer,
	`clv` real,
	`published_at` text,
	`settled_at` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `post_tags` (
	`post_id` text NOT NULL,
	`sport` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title_en` text NOT NULL,
	`title_es` text,
	`body_en` text NOT NULL,
	`body_es` text,
	`category` text,
	`featured_image` text,
	`og_image` text,
	`seo_title` text,
	`seo_description` text,
	`canonical_url` text,
	`status` text DEFAULT 'draft',
	`published_at` text,
	`author` text DEFAULT 'WinFact',
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_slug_unique` ON `posts` (`slug`);--> statement-breakpoint
CREATE TABLE `promo_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`discount_type` text NOT NULL,
	`discount_value` real NOT NULL,
	`max_redemptions` integer,
	`current_redemptions` integer DEFAULT 0,
	`valid_from` text,
	`valid_until` text,
	`applicable_plans` text,
	`is_active` integer DEFAULT true,
	`stripe_promotion_id` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `promo_codes_code_unique` ON `promo_codes` (`code`);--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` text PRIMARY KEY NOT NULL,
	`referrer_id` text,
	`referred_email` text NOT NULL,
	`status` text DEFAULT 'pending',
	`reward_applied` integer DEFAULT false,
	`created_at` text DEFAULT (datetime('now')),
	`converted_at` text,
	FOREIGN KEY (`referrer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `revenue_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`type` text NOT NULL,
	`amount` real NOT NULL,
	`tier` text,
	`stripe_event_id` text,
	`promo_code` text,
	`affiliate_id` text,
	`source` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `site_content` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`stripe_subscription_id` text,
	`tier` text NOT NULL,
	`status` text NOT NULL,
	`current_period_start` text,
	`current_period_end` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_stripe_subscription_id_unique` ON `subscriptions` (`stripe_subscription_id`);--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`team_role` text NOT NULL,
	`permissions` text,
	`is_active` integer DEFAULT true,
	`invited_by` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`role` text DEFAULT 'member',
	`language` text DEFAULT 'en',
	`stripe_customer_id` text,
	`referral_code` text,
	`referred_by` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`referred_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_referral_code_unique` ON `users` (`referral_code`);