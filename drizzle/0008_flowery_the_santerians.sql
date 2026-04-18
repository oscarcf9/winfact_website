-- Fix 7: per-channel commentary routing.
-- Adds a `channel` column to commentary_log so Telegram Miami-voice messages
-- and Buffer professional-voice messages dedup against their own channel,
-- not each other.
--
-- NOTE: drizzle-kit re-emitted columns already applied in 0005/0006 due to
-- snapshot drift during the revert/reapply sequence earlier today. Those
-- extra ALTERs were stripped — only the genuinely new Fix-7 statements
-- remain below. Idempotent: safe to re-run (each ALTER/CREATE INDEX is
-- guarded by the apply script's "duplicate column / already exists" handler).

ALTER TABLE `commentary_log` ADD COLUMN `channel` text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_commentary_channel_sport_category_posted`
  ON `commentary_log` (`channel`, `sport`, `category`, `posted_at`);
