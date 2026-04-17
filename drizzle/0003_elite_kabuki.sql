CREATE TABLE `commentary_log` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`sport` text NOT NULL,
	`message` text NOT NULL,
	`posted_at` integer NOT NULL,
	`game_state` text
);
--> statement-breakpoint
CREATE INDEX `idx_commentary_game_posted` ON `commentary_log` (`game_id`,`posted_at`);--> statement-breakpoint
CREATE TABLE `ticket_history` (
	`id` text PRIMARY KEY NOT NULL,
	`image_url` text NOT NULL,
	`form_data` text NOT NULL,
	`sport` text,
	`bet_type` text,
	`sub_bet_type` text,
	`bet_description` text,
	`matchup` text,
	`odds` text,
	`wager` text,
	`paid` text,
	`pick_id` text,
	`game_url` text,
	`size_bytes` integer,
	`created_by` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `victory_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`pick_id` text NOT NULL,
	`image_url` text NOT NULL,
	`caption` text NOT NULL,
	`sport` text NOT NULL,
	`tier` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`posted_at` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
ALTER TABLE `picks` ADD `stars` integer;