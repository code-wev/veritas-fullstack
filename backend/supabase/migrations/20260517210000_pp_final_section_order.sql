-- Policies & Procedures — set the final section order
--
-- Targets:
--   1  Document Control & Governance
--   2  Effective Compliance Regime
--   3  Roles & Responsibilities
--   4  Training Program
--   5  MSB Registration & FINTRAC Notifications  (msb_required)
--   6  Client Identification & KYC
--   7  Beneficial Ownership & Discrepancy Reporting
--   8  Business Relationship & Ongoing Monitoring
--   9  Third Party Determination
--   10 PEP / HIO
--   11 Reporting Obligations
--   12 Recordkeeping
--   13 Sanctions & Ministerial Directives
--   14 Correspondent Banking                      (fi_only)
--   15 Law Enforcement, Disclosures & Self-Disclosure
--
-- Driven by the question_code prefix so it's idempotent and survives
-- whatever state the table is currently in. sort_order is recomputed
-- globally (new_section_position * 1000 + within-section rank by
-- question_number) so within-section ordering is preserved.

WITH mapping AS (
  SELECT
    t.id,
    t.question_number,
    CASE
      WHEN t.question_code LIKE 'DCG-%' THEN 1
      WHEN t.question_code LIKE 'ECR-%' THEN 2
      WHEN t.question_code LIKE 'RR-%'  THEN 3
      WHEN t.question_code LIKE 'TRN-%' THEN 4
      WHEN t.question_code LIKE 'MSB-%' THEN 5
      WHEN t.question_code LIKE 'KYC-%' THEN 6
      WHEN t.question_code LIKE 'BO-%'  THEN 7
      WHEN t.question_code LIKE 'BR-%'  THEN 8
      WHEN t.question_code LIKE 'TPD-%' THEN 9
      WHEN t.question_code LIKE 'PEP-%' THEN 10
      WHEN t.question_code LIKE 'REP-%' THEN 11
      WHEN t.question_code LIKE 'RK-%'  THEN 12
      WHEN t.question_code LIKE 'SAN-%' THEN 13
      WHEN t.question_code LIKE 'CBR-%' THEN 14
      WHEN t.question_code LIKE 'LED-%' THEN 15
      ELSE 99
    END AS new_section_pos
  FROM public.aml_program_question_templates t
  WHERE t.submodule    = 'policies_procedures'
    AND t.control_area = 'core_controls'
),
ordered AS (
  SELECT
    id,
    new_section_pos::text AS new_section_code,
    new_section_pos * 1000
      + ROW_NUMBER() OVER (PARTITION BY new_section_pos ORDER BY question_number) AS new_sort_order
  FROM mapping
)
UPDATE public.aml_program_question_templates t
SET section_code = o.new_section_code,
    sort_order   = o.new_sort_order
FROM ordered o
WHERE t.id = o.id;

NOTIFY pgrst, 'reload schema';
