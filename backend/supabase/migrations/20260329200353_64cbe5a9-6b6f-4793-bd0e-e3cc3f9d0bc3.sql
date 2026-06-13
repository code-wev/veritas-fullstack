
ALTER TABLE public.msb_status_validation
  ADD COLUMN IF NOT EXISTS fintrac_forms_obtained text,
  ADD COLUMN IF NOT EXISTS fintrac_forms_notes text,
  ADD COLUMN IF NOT EXISTS fintrac_info_complete text,
  ADD COLUMN IF NOT EXISTS fintrac_info_notes text,
  ADD COLUMN IF NOT EXISTS fintrac_consistency_result text,
  ADD COLUMN IF NOT EXISTS fintrac_consistency_notes text,
  ADD COLUMN IF NOT EXISTS undisclosed_changes_identified text,
  ADD COLUMN IF NOT EXISTS undisclosed_changes_notes text,
  ADD COLUMN IF NOT EXISTS changes_reported_within_30_days text,
  ADD COLUMN IF NOT EXISTS changes_30day_notes text,
  ADD COLUMN IF NOT EXISTS post_submission_changes_reported text,
  ADD COLUMN IF NOT EXISTS post_submission_notes text,
  ADD COLUMN IF NOT EXISTS cessation_reported text,
  ADD COLUMN IF NOT EXISTS cessation_notes text,
  ADD COLUMN IF NOT EXISTS fintrac_requests_responded text,
  ADD COLUMN IF NOT EXISTS fintrac_requests_notes text;
