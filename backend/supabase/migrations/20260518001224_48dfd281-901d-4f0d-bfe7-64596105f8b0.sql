-- 1. Schema additions
ALTER TABLE public.aml_pp_control_results
  ADD COLUMN IF NOT EXISTS deficiency_explanation  text,
  ADD COLUMN IF NOT EXISTS reviewer_recommendation text,
  ADD COLUMN IF NOT EXISTS remediation_notes       text;

ALTER TABLE public.aml_program_question_templates
  ADD COLUMN IF NOT EXISTS procedure_statement text;

-- 2. Drop standalone Sanctions module; reactivate SAN-* in P&P
DROP TABLE IF EXISTS public.sanctions_control_results CASCADE;
DROP TABLE IF EXISTS public.sanctions_reviews CASCADE;
DROP FUNCTION IF EXISTS public.sanctions_reviews_set_updated_at();

DELETE FROM public.aml_program_question_templates
WHERE submodule = 'sanctions_directives';

UPDATE public.aml_program_question_templates
SET is_active = true
WHERE submodule    = 'policies_procedures'
  AND control_area = 'core_controls'
  AND question_code LIKE 'SAN-%';

-- 3. Soft-delete stragglers outside the 15-section allow-list
UPDATE public.aml_program_question_templates
SET is_active = false
WHERE submodule    = 'policies_procedures'
  AND control_area = 'core_controls'
  AND (
    question_code IS NULL
    OR NOT (
      question_code LIKE 'DCG-%' OR question_code LIKE 'LRF-%' OR
      question_code LIKE 'ECR-%' OR question_code LIKE 'RR-%'  OR
      question_code LIKE 'TRN-%' OR question_code LIKE 'MSB-%' OR
      question_code LIKE 'KYC-%' OR question_code LIKE 'BO-%'  OR
      question_code LIKE 'BR-%'  OR question_code LIKE 'TPD-%' OR
      question_code LIKE 'PEP-%' OR question_code LIKE 'SAN-%' OR
      question_code LIKE 'REP-%' OR question_code LIKE 'RK-%'  OR
      question_code LIKE 'LED-%'
    )
  );

-- 4. Insert BR-04A if missing
INSERT INTO public.aml_program_question_templates
  (submodule, control_area, control_category, question_number, question_text,
   regulatory_reference, evidence_required, sort_order, regulatory_category,
   analyst_guidance, pass_criteria, max_points, section_code, section_name,
   subsection, question_code, is_new_or_updated, suggested_finding_type)
SELECT
  'policies_procedures', 'core_controls', 'business_relationships_monitoring', 4045,
  'Periodic KYC Refresh and Customer Information Updates',
  'PCMLTFR; FINTRAC Guidance on ongoing monitoring', true, 9045, 'Requirement',
  'Verify BOTH: (a) Policy: a documented periodic KYC refresh and customer-information update procedure that specifies risk-based refresh timelines (e.g. high-risk 1-2 years, medium-risk 2-3 years, low-risk 5 years), trigger events (material change, transaction patterns, dormant-client review deadline), the information to update (contact details, occupation / nature of business, sanctions / PEP re-screening, beneficial ownership re-confirmation), the dormant / inactive client review path (periodic review applies even when no transactions or alerts have occurred), and the consequences where refresh cannot be completed (account restrictions, enhanced monitoring, suspension, offboarding); AND (b) Procedure: how staff actually operationalize the refresh — owner, outreach script, escalation path when the customer cannot be reached, evidence retention, audit trail of attempts, and how the system tracks overdue refreshes.',
  'Policy states risk-based refresh timelines and trigger events, the required information to update, the dormant / inactive client review path, and the consequences when the customer cannot be reached. Procedure describes the operating mechanism (ownership, outreach, escalation, recordkeeping, overdue tracking).',
  NULL, '9', 'Business Relationships & Ongoing Monitoring',
  'KYC Refresh and Customer Information Updates', 'BR-04A', true, 'partial_important'
WHERE NOT EXISTS (
  SELECT 1 FROM public.aml_program_question_templates
  WHERE submodule = 'policies_procedures' AND control_area = 'core_controls'
    AND question_code = 'BR-04A'
);

-- 5. Rebuild section_code/name/sort_order by question_code prefix
WITH mapping AS (
  SELECT t.id, t.question_number,
    CASE
      WHEN t.question_code LIKE 'DCG-%' THEN 1
      WHEN t.question_code LIKE 'LRF-%' THEN 2
      WHEN t.question_code LIKE 'ECR-%' THEN 3
      WHEN t.question_code LIKE 'RR-%'  THEN 4
      WHEN t.question_code LIKE 'TRN-%' THEN 5
      WHEN t.question_code LIKE 'MSB-%' THEN 6
      WHEN t.question_code LIKE 'KYC-%' THEN 7
      WHEN t.question_code LIKE 'BO-%'  THEN 8
      WHEN t.question_code LIKE 'BR-%'  THEN 9
      WHEN t.question_code LIKE 'TPD-%' THEN 10
      WHEN t.question_code LIKE 'PEP-%' THEN 11
      WHEN t.question_code LIKE 'SAN-%' THEN 12
      WHEN t.question_code LIKE 'REP-%' THEN 13
      WHEN t.question_code LIKE 'RK-%'  THEN 14
      WHEN t.question_code LIKE 'LED-%' THEN 15
      ELSE 99
    END AS new_pos,
    CASE
      WHEN t.question_code LIKE 'DCG-%' THEN 'Document Control & Governance'
      WHEN t.question_code LIKE 'LRF-%' THEN 'Legal & Regulatory Framework'
      WHEN t.question_code LIKE 'ECR-%' THEN 'Effective Compliance Regime'
      WHEN t.question_code LIKE 'RR-%'  THEN 'Roles & Responsibilities'
      WHEN t.question_code LIKE 'TRN-%' THEN 'Training Program'
      WHEN t.question_code LIKE 'MSB-%' THEN 'MSB Registration & FINTRAC Filings'
      WHEN t.question_code LIKE 'KYC-%' THEN 'Client Identification & Verification'
      WHEN t.question_code LIKE 'BO-%'  THEN 'Beneficial Ownership & Discrepancy Reporting'
      WHEN t.question_code LIKE 'BR-%'  THEN 'Business Relationships & Ongoing Monitoring'
      WHEN t.question_code LIKE 'TPD-%' THEN 'Third Party Determination'
      WHEN t.question_code LIKE 'PEP-%' THEN 'PEP / HIO / Family / Close Associate Controls'
      WHEN t.question_code LIKE 'SAN-%' THEN 'Sanctions & Ministerial Directives'
      WHEN t.question_code LIKE 'REP-%' THEN 'Reporting Requirements'
      WHEN t.question_code LIKE 'RK-%'  THEN 'Recordkeeping'
      WHEN t.question_code LIKE 'LED-%' THEN 'Law Enforcement, Disclosure & Non-Compliance'
      ELSE t.section_name
    END AS new_name
  FROM public.aml_program_question_templates t
  WHERE t.submodule = 'policies_procedures' AND t.control_area = 'core_controls'
    AND t.is_active = true
),
ordered AS (
  SELECT id, new_pos, new_name,
    new_pos * 1000 + ROW_NUMBER() OVER (PARTITION BY new_pos ORDER BY question_number) AS new_sort_order
  FROM mapping
)
UPDATE public.aml_program_question_templates t
SET section_code = ordered.new_pos::text,
    section_name = ordered.new_name,
    sort_order   = ordered.new_sort_order
FROM ordered
WHERE t.id = ordered.id;

-- 6. LRF-01..06 — reframe to test BOTH policy and procedure
WITH lrf_wordings(code, analyst_guidance, pass_criteria) AS (VALUES
  ('LRF-01','Verify BOTH: (a) Policy: the PCMLTFA and PCMLTFR are expressly cited as the governing legal framework; AND (b) Procedure: each statutory obligation is mapped to an internal procedure (e.g. cross-references in the manual, a regulation-to-procedure mapping, training rollouts when regulations change).','Policy cites PCMLTFA / PCMLTFR and procedure operationalizes each obligation into staff-level steps.'),
  ('LRF-02','Verify BOTH: (a) Policy: relevant FINTRAC guidance is referenced or embedded; AND (b) Procedure: how the firm monitors guidance updates and translates them into operational changes — owner, cadence, evidence of the most recent update.','Policy cites FINTRAC guidance and procedure describes how guidance updates are monitored and operationalized.'),
  ('LRF-03','Verify BOTH: (a) Policy: sanctions framework legislation (United Nations Act, SEMA, JVCFOA, Criminal Code / RIUNRST) is expressly referenced; AND (b) Procedure: how staff screen clients and transactions against the lists, escalation on hits, evidence retention.','Sanctions legislation is referenced and the operating screening/escalation procedure is documented (or cross-referenced to the SAN section).'),
  ('LRF-04','Verify BOTH: (a) Policy: current Ministerial Directives applicable to Russia and DPRK / North Korea are cited; AND (b) Procedure: the specific enhanced measures the firm applies (CDD, transaction restrictions, recordkeeping, approvals, escalation) for affected clients/transactions.','Policy cites the directives and procedure documents the operational measures the firm actually applies.'),
  ('LRF-05','Verify BOTH: (a) Policy: the updated Ministerial Directive on the Islamic Republic of Iran (November 2025) is cited; AND (b) Procedure: the specific enhanced measures the firm applies for Iran-related exposures (CDD, transaction restrictions, recordkeeping, approvals, escalation).','Policy cites the updated Iran directive and procedure documents the operational measures the firm applies.'),
  ('LRF-06','Verify BOTH: (a) Policy: where the firm holds correspondent banking or foreign affiliate relationships, the relevant requirements are documented (or the policy correctly scopes them as N/A for the business model); AND (b) Procedure: pre-entry diligence (sanctions screening, ownership / control review, senior management approval), periodic review cadence, evidence retention.','Either policy and procedure both address correspondent banking / foreign relationships, or the section is properly scoped as N/A with documented rationale.')
)
UPDATE public.aml_program_question_templates t
SET analyst_guidance = lw.analyst_guidance,
    pass_criteria    = lw.pass_criteria
FROM lrf_wordings lw
WHERE t.submodule = 'policies_procedures' AND t.control_area = 'core_controls'
  AND t.question_code = lw.code;

NOTIFY pgrst, 'reload schema';