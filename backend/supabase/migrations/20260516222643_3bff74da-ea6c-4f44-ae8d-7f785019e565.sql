ALTER TABLE public.msb_change_detection
  ADD COLUMN IF NOT EXISTS category_sources jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.msb_change_detection.category_sources IS
  'For each change category, the array of source codes the auditor consulted.';

ALTER TABLE public.msb_change_detection
  DROP COLUMN IF EXISTS sources_corporate_profile_reviewed,
  DROP COLUMN IF EXISTS sources_articles_reviewed,
  DROP COLUMN IF EXISTS sources_compliance_officer_interview_done,
  DROP COLUMN IF EXISTS sources_management_interview_done,
  DROP COLUMN IF EXISTS sources_internal_records_reviewed,
  DROP COLUMN IF EXISTS sources_reviewed_notes;

NOTIFY pgrst, 'reload schema';