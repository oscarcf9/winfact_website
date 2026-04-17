-- Add capperId to picks for per-capper attribution
ALTER TABLE picks ADD COLUMN capper_id TEXT;

-- Add reward tracking fields to referrals
ALTER TABLE referrals ADD COLUMN reward_type TEXT;
ALTER TABLE referrals ADD COLUMN reward_applied_at TEXT;
