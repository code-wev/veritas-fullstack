-- Consolidated P&P state after standalone-Sanctions rollback
--
-- Combines: drop the standalone sanctions tables/rows, reactivate SAN-* in
-- P&P, soft-delete any orphan legacy rows (LRF-%, ACS-%, etc. that aren't in
-- the 15-section allow-list — except LRF which is intentionally kept and
-- promoted to section 2), and rebuild section_code + sort_order for every
-- active row using a question_code-prefix map.
--
-- Idempotent: re-running produces the same final state.
--
-- Final 15-section order:
--   1  DCG  Document Control & Governance
--   2  LRF  Legal & Regulatory Framework
--   3  ECR  Effective Compliance Regime
--   4  RR   Roles & Responsibilities
--   5  TRN  Training Program
--   6  MSB  MSB Registration & FINTRAC Filings
--   7  KYC  Client Identification & Verification
--   8  BO   Beneficial Ownership & Discrepancy Reporting
--   9  BR   Business Relationships & Ongoing Monitoring
--   10 TPD  Third Party Determination
--   11 PEP  PEP / HIO / Family / Close Associate Controls
--   12 SAN  Sanctions & Ministerial Directives
--   13 REP  Reporting Requirements
--   14 RK   Recordkeeping
--   15 LED  Law Enforcement, Disclosure & Non-Compliance

-- 1. Drop the standalone Sanctions module schema + question rows.
DROP TABLE IF EXISTS public.sanctions_control_results CASCADE;
DROP TABLE IF EXISTS public.sanctions_reviews CASCADE;
DROP FUNCTION IF EXISTS public.sanctions_reviews_set_updated_at();

DELETE FROM public.aml_program_question_templates
WHERE submodule = 'sanctions_directives';

-- 2. Reactivate the original SAN-01..06 rows in P&P.
UPDATE public.aml_program_question_templates
SET is_active = true
WHERE submodule    = 'policies_procedures'
  AND control_area = 'core_controls'
  AND question_code LIKE 'SAN-%';

-- 3. Soft-delete any legacy stragglers outside the 15-section allow-list.
UPDATE public.aml_program_question_templates
SET is_active = false
WHERE submodule    = 'policies_procedures'
  AND control_area = 'core_controls'
  AND (
    question_code IS NULL
    OR NOT (
      question_code LIKE 'DCG-%' OR
      question_code LIKE 'LRF-%' OR
      question_code LIKE 'ECR-%' OR
      question_code LIKE 'RR-%'  OR
      question_code LIKE 'TRN-%' OR
      question_code LIKE 'MSB-%' OR
      question_code LIKE 'KYC-%' OR
      question_code LIKE 'BO-%'  OR
      question_code LIKE 'BR-%'  OR
      question_code LIKE 'TPD-%' OR
      question_code LIKE 'PEP-%' OR
      question_code LIKE 'SAN-%' OR
      question_code LIKE 'REP-%' OR
      question_code LIKE 'RK-%'  OR
      question_code LIKE 'LED-%'
    )
  );

-- 4. Rebuild section_code + section_name + sort_order for every active row.
WITH mapping AS (
  SELECT
    t.id,
    t.question_number,
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
  WHERE t.submodule    = 'policies_procedures'
    AND t.control_area = 'core_controls'
    AND t.is_active    = true
),
ordered AS (
  SELECT
    id,
    new_pos,
    new_name,
    new_pos * 1000
      + ROW_NUMBER() OVER (PARTITION BY new_pos ORDER BY question_number) AS new_sort_order
  FROM mapping
)
UPDATE public.aml_program_question_templates t
SET section_code = ordered.new_pos::text,
    section_name = ordered.new_name,
    sort_order   = ordered.new_sort_order
FROM ordered
WHERE t.id = ordered.id;

NOTIFY pgrst, 'reload schema';
