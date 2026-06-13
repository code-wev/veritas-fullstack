-- Legal & Regulatory Framework — reframe to test BOTH policy and procedure
--
-- The earlier policy-AND-procedure reframing migration
-- (20260517170000_pp_policy_and_procedures.sql) did not cover LRF-01..06
-- because LRF was originally slated for retirement. Now that the firm is
-- keeping LRF as section 2, this migration brings the LRF rows into line
-- with the rest of the working paper: each control explicitly tests
-- whether the document includes (a) the policy statement and
-- (b) the operational procedure for staff to follow.
--
-- Targets rows by question_code so it's idempotent across migration order.

WITH new_wordings(code, analyst_guidance, pass_criteria) AS (
  VALUES
  ('LRF-01',
   'Verify BOTH: (a) Policy: the PCMLTFA and PCMLTFR are expressly cited as the governing legal framework; AND (b) Procedure: each statutory obligation is mapped to an internal procedure (e.g. cross-references in the manual, a regulation-to-procedure mapping, training rollouts when regulations change).',
   'Policy cites PCMLTFA / PCMLTFR and procedure operationalizes each obligation into staff-level steps.'),

  ('LRF-02',
   'Verify BOTH: (a) Policy: relevant FINTRAC guidance is referenced or embedded; AND (b) Procedure: how the firm monitors guidance updates and translates them into operational changes — owner, cadence, evidence of the most recent update.',
   'Policy cites FINTRAC guidance and procedure describes how guidance updates are monitored and operationalized.'),

  ('LRF-03',
   'Verify BOTH: (a) Policy: sanctions framework legislation (United Nations Act, SEMA, JVCFOA, Criminal Code / RIUNRST) is expressly referenced; AND (b) Procedure: how staff screen clients and transactions against the lists, escalation on hits, evidence retention.',
   'Sanctions legislation is referenced and the operating screening/escalation procedure is documented (or cross-referenced to the SAN section).'),

  ('LRF-04',
   'Verify BOTH: (a) Policy: current Ministerial Directives applicable to Russia and DPRK / North Korea are cited; AND (b) Procedure: the specific enhanced measures the firm applies (CDD, transaction restrictions, recordkeeping, approvals, escalation) for affected clients/transactions.',
   'Policy cites the directives and procedure documents the operational measures the firm actually applies.'),

  ('LRF-05',
   'Verify BOTH: (a) Policy: the updated Ministerial Directive on the Islamic Republic of Iran (November 2025) is cited; AND (b) Procedure: the specific enhanced measures the firm applies for Iran-related exposures (CDD, transaction restrictions, recordkeeping, approvals, escalation).',
   'Policy cites the updated Iran directive and procedure documents the operational measures the firm applies.'),

  ('LRF-06',
   'Verify BOTH: (a) Policy: where the firm holds correspondent banking or foreign affiliate relationships, the relevant requirements are documented (or the policy correctly scopes them as N/A for the business model); AND (b) Procedure: pre-entry diligence (sanctions screening, ownership / control review, senior management approval), periodic review cadence, evidence retention.',
   'Either policy and procedure both address correspondent banking / foreign relationships, or the section is properly scoped as N/A with documented rationale.')
)
UPDATE public.aml_program_question_templates t
SET analyst_guidance = nw.analyst_guidance,
    pass_criteria    = nw.pass_criteria
FROM new_wordings nw
WHERE t.submodule    = 'policies_procedures'
  AND t.control_area = 'core_controls'
  AND t.question_code = nw.code;

NOTIFY pgrst, 'reload schema';
