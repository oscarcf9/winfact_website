-- Fix 9: Parlay support.
-- Adds pick_type + leg_count to picks, plus parlay_legs table for per-leg tracking.
-- Singles remain pick_type='single' (default). Parlays have pick_type='parlay'
-- with N child rows in parlay_legs, each evaluated independently at settlement.
--
-- Idempotent: the apply script handles "duplicate column / already exists".

ALTER TABLE `picks` ADD COLUMN `pick_type` text DEFAULT 'single';--> statement-breakpoint
ALTER TABLE `picks` ADD COLUMN `leg_count` integer;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `idx_picks_pick_type` ON `picks` (`pick_type`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `parlay_legs` (
	`id` text PRIMARY KEY NOT NULL,
	`pick_id` text NOT NULL,
	`leg_index` integer NOT NULL,
	`sport` text NOT NULL,
	`league` text,
	`matchup` text NOT NULL,
	`pick_text` text NOT NULL,
	`game_date` text,
	`odds` integer,
	`result` text,
	`settled_at` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `idx_parlay_legs_pick_id` ON `parlay_legs` (`pick_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_parlay_legs_pick_index` ON `parlay_legs` (`pick_id`, `leg_index`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_parlay_legs_sport` ON `parlay_legs` (`sport`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_parlay_legs_result` ON `parlay_legs` (`result`);
