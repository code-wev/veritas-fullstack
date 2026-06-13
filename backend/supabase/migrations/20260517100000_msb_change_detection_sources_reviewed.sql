-- Track which evidence sources the auditor reviewed when answering the
-- 9-category Change Detection section. Defensible audit trail — partner
-- reviewers can see *how* the auditor verified each category, not just
-- what they marked.

ALTER TABLE public.msb_change_detection
  ADD COLUMN IF NOT EXISTS sources_corporate_profile_reviewed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sources_articles_reviewed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sources_compliance_officer_interview_done boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sources_management_interview_done boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sources_internal_records_reviewed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sources_reviewed_notes text;

COMMENT ON COLUMN public.msb_change_detection.sources_corporate_profile_reviewed IS
  'Auditor reviewed the most recent federal/provincial Corporate Profile Report when assessing change categories.';
COMMENT ON COLUMN public.msb_change_detection.sources_articles_reviewed IS
  'Auditor reviewed articles of incorporation / shareholders register.';
COMMENT ON COLUMN public.msb_change_detection.sources_compliance_officer_interview_done IS
  'Auditor interviewed the compliance officer about potential changes (CO appointment, services, controls).';
COMMENT ON COLUMN public.msb_change_detection.sources_management_interview_done IS
  'Auditor interviewed management about potential changes (directors, ownership, business activities).';
COMMENT ON COLUMN public.msb_change_detection.sources_internal_records_reviewed IS
  'Auditor reviewed internal records (agent registers, branch lists, bank statements, etc.).';

NOTIFY pgrst, 'reload schema';
