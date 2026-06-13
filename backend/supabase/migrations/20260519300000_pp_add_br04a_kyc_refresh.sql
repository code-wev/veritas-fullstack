-- BR-04A — Periodic KYC Refresh and Customer Information Updates
--
-- Adds a new P&P design-review control between BR-04 (Ongoing monitoring)
-- and BR-05 in the Business Relationships & Ongoing Monitoring section.
-- Tests whether the policy AND procedure document a periodic KYC refresh
-- program that:
--   - sets risk-based refresh timelines (high 1-2y, medium 2-3y, low 5y)
--   - covers dormant / inactive customers (review applies even without
--     transactions or alerts)
--   - addresses contact details, sanctions/PEP rescreen, BO re-confirm
--   - defines consequences when the customer cannot be reached
--     (restrictions, enhanced monitoring, suspension, offboarding)
--   - describes the operating procedure: ownership, outreach script,
--     escalation path, evidence retention, overdue-refresh tracking.
--
-- This migration assumes the consolidated P&P section order has been
-- applied (20260519200000_pp_consolidated_section_order.sql), so BR lives
-- at section_code = '9'. If applied beforehand, adjust section_code below.
--
-- Idempotent: the INSERT is gated on NOT EXISTS, so re-running is safe.

INSERT INTO public.aml_program_question_templates
  (submodule, control_area, control_category, question_number, question_text,
   regulatory_reference, evidence_required, sort_order, regulatory_category,
   analyst_guidance, pass_criteria, max_points, section_code, section_name,
   subsection, question_code, is_new_or_updated, suggested_finding_type)
SELECT
  'policies_procedures',
  'core_controls',
  'business_relationships_monitoring',
  4045,
  'Periodic KYC Refresh and Customer Information Updates',
  'PCMLTFR; FINTRAC Guidance on ongoing monitoring',
  true,
  9045,
  'Requirement',
  'Verify BOTH: (a) Policy: a documented periodic KYC refresh and customer-information update procedure that specifies risk-based refresh timelines (e.g. high-risk 1-2 years, medium-risk 2-3 years, low-risk 5 years), trigger events (material change, transaction patterns, dormant-client review deadline), the information to update (contact details, occupation / nature of business, sanctions / PEP re-screening, beneficial ownership re-confirmation), the dormant / inactive client review path (periodic review applies even when no transactions or alerts have occurred), and the consequences where refresh cannot be completed (account restrictions, enhanced monitoring, suspension, offboarding); AND (b) Procedure: how staff actually operationalize the refresh — owner, outreach script, escalation path when the customer cannot be reached, evidence retention, audit trail of attempts, and how the system tracks overdue refreshes.',
  'Policy states risk-based refresh timelines and trigger events, the required information to update, the dormant / inactive client review path, and the consequences when the customer cannot be reached. Procedure describes the operating mechanism (ownership, outreach, escalation, recordkeeping, overdue tracking).',
  NULL,
  '9',
  'Business Relationships & Ongoing Monitoring',
  'KYC Refresh and Customer Information Updates',
  'BR-04A',
  true,
  'partial_important'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.aml_program_question_templates
  WHERE submodule    = 'policies_procedures'
    AND control_area = 'core_controls'
    AND question_code = 'BR-04A'
);

-- Re-rank every active BR-* row by question_code so BR-04A sorts between
-- BR-04 and BR-05 ('BR-04' < 'BR-04A' < 'BR-05' lexicographically).
WITH br AS (
  SELECT
    id,
    (CASE WHEN section_code ~ '^\d+$' THEN section_code::integer ELSE 99 END) * 1000
      + ROW_NUMBER() OVER (ORDER BY question_code) AS new_sort
  FROM public.aml_program_question_templates
  WHERE submodule    = 'policies_procedures'
    AND control_area = 'core_controls'
    AND is_active    = true
    AND question_code LIKE 'BR-%'
)
UPDATE public.aml_program_question_templates t
SET sort_order = br.new_sort
FROM br
WHERE t.id = br.id;

NOTIFY pgrst, 'reload schema';
