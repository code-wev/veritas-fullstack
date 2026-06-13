-- Add per-sample columns for Alerts (alert population type already covered by alert_type)
ALTER TABLE public.tm_alert_samples
  ADD COLUMN IF NOT EXISTS no_backlog BOOLEAN,
  ADD COLUMN IF NOT EXISTS decision_documented BOOLEAN,
  ADD COLUMN IF NOT EXISTS rationale_aligns BOOLEAN;

-- Add per-sample columns for EDD (high-risk identification + reason already covered)
ALTER TABLE public.tm_edd_samples
  ADD COLUMN IF NOT EXISTS high_risk_identified BOOLEAN;

-- Add per-sample columns for Risk Recalc (methodology + trigger consistency)
ALTER TABLE public.tm_risk_recalc_samples
  ADD COLUMN IF NOT EXISTS risk_factors_defined BOOLEAN,
  ADD COLUMN IF NOT EXISTS scoring_logic_documented BOOLEAN,
  ADD COLUMN IF NOT EXISTS triggers_defined BOOLEAN,
  ADD COLUMN IF NOT EXISTS str_upgrade_applied BOOLEAN,
  ADD COLUMN IF NOT EXISTS volume_trigger_applied BOOLEAN,
  ADD COLUMN IF NOT EXISTS other_triggers_consistent BOOLEAN;