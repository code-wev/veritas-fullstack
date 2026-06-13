-- Per-category source attribution.
--
-- Replaces the 5 single-record source booleans (added 20260517100000) with
-- a single jsonb column that maps each change-category key to the array of
-- source codes the auditor consulted. Lets each row in the Change Detection
-- list its own evidence stack rather than one global stack.
--
-- Shape:
--   {
--     "board_of_directors_changed": ["corporate_profile", "articles"],
--     "senior_management_changed":  ["corporate_profile", "management_interview"],
--     ...
--   }

ALTER TABLE public.msb_change_detection
  ADD COLUMN IF NOT EXISTS category_sources jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.msb_change_detection.category_sources IS
  'For each change category (key = column name like "board_of_directors_changed"), '
  'the array of source codes the auditor consulted. Source codes: '
  'corporate_profile | articles | compliance_officer_interview | management_interview | internal_records.';

-- Drop the prior single-record source booleans + notes. They were added
-- earlier today and never wired into the per-category UI; data loss is
-- intended (no production data yet).
ALTER TABLE public.msb_change_detection
  DROP COLUMN IF EXISTS sources_corporate_profile_reviewed,
  DROP COLUMN IF EXISTS sources_articles_reviewed,
  DROP COLUMN IF EXISTS sources_compliance_officer_interview_done,
  DROP COLUMN IF EXISTS sources_management_interview_done,
  DROP COLUMN IF EXISTS sources_internal_records_reviewed,
  DROP COLUMN IF EXISTS sources_reviewed_notes;

NOTIFY pgrst, 'reload schema';
