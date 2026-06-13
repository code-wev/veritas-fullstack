-- Workpaper-style review fields on aml_pp_control_results
--
-- The new P&P working-paper UI is a two-column layout per control:
--   LEFT  — testing & assessment (question, test, pass criteria, response,
--           deficiency severity classification)
--   RIGHT — evidence & documentation (client doc ref, notes, deficiency
--           explanation, reviewer recommendation, remediation notes)
--
-- The existing schema already carries `doc_reference`, `notes` and
-- `observation_best_practice`. This migration adds three more columns to
-- support the right-hand panel:
--
--   deficiency_explanation   — what's missing and why it matters (analyst's
--                              narrative when a No/Partial response is
--                              recorded; surfaces in the audit-report
--                              finding description)
--   reviewer_recommendation  — recommended remediation action stated in
--                              auditor language (the "what should be done")
--   remediation_notes        — tracking of remediation status / commitments
--                              from the client / actual progress observed

ALTER TABLE public.aml_pp_control_results
  ADD COLUMN IF NOT EXISTS deficiency_explanation  text,
  ADD COLUMN IF NOT EXISTS reviewer_recommendation text,
  ADD COLUMN IF NOT EXISTS remediation_notes       text;

NOTIFY pgrst, 'reload schema';
