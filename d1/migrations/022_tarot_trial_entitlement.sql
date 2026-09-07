-- One lifetime tarot trial per existing Google member.
-- Paid membership remains sourced exclusively from subscriptions/subscription_charges.
ALTER TABLE profile_member_metadata ADD COLUMN tarot_trial_started_at TEXT;
ALTER TABLE profile_member_metadata ADD COLUMN tarot_trial_ends_at TEXT;
ALTER TABLE profile_member_metadata ADD COLUMN tarot_trial_used_at TEXT;

-- Preserve currently-paid members without placing them into a trial. Members
-- who are not currently subscribed (including legacy expired members) retain
-- trial_available, per the approved migration policy. No free-quota history is
-- used for this decision.
UPDATE profile_member_metadata
   SET tarot_trial_used_at = COALESCE(
     (SELECT MIN(c.paid_at)
        FROM subscription_charges c
        JOIN subscriptions s ON s.id = c.subscription_id
       WHERE s.user_id = profile_member_metadata.user_id
         AND c.plan_code = 'tarot_monthly_600'
         AND c.status = 'paid'),
     datetime('now')
   )
 WHERE EXISTS (
   SELECT 1
     FROM subscriptions s
    WHERE s.user_id = profile_member_metadata.user_id
      AND COALESCE(s.plan_code, s.item_id) = 'tarot_monthly_600'
      AND s.status IN ('active', 'cancelled')
      AND datetime(COALESCE(s.current_period_end, s.current_period_ends_at)) > datetime('now')
      AND EXISTS (SELECT 1 FROM subscription_charges c WHERE c.subscription_id = s.id AND c.status = 'paid')
 );

CREATE INDEX IF NOT EXISTS idx_profile_member_metadata_tarot_trial_end
  ON profile_member_metadata(tarot_trial_ends_at)
  WHERE tarot_trial_ends_at IS NOT NULL;
