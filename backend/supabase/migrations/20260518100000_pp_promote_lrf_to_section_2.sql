-- Promote the legacy "Legal & Regulatory Framework" (LRF) rows from the
-- phantom section 99 up to position 2, and slide everything currently at
-- 2..12 down by one. Close the gap left by the prior LED move by pulling
-- LED from 15 → 14.
--
-- Final order:
--   1  Document Control & Governance
--   2  Legal & Regulatory Framework   (was 99)
--   3  Effective Compliance Regime
--   4  Roles & Responsibilities
--   5  Training Program
--   6  MSB Registration & FINTRAC Filings
--   7  Client Identification & Verification
--   8  Beneficial Ownership & Discrepancy Reporting
--   9  Business Relationships & Ongoing Monitoring
--   10 Third Party Determination
--   11 PEP / HIO / Family / Close Associate Controls
--   12 Reporting Requirements
--   13 Recordkeeping
--   14 Law Enforcement, Disclosure & Non-Compliance  (was 15)
--
-- Only touches active rows so any inactive historical rows stay where they
-- are. sort_order is recomputed globally so within-section ordering is
-- preserved via ROW_NUMBER on (old section_code, existing sort_order).

WITH remap(old_code, new_code, new_position) AS (
  VALUES
    ('1',  '1',  1),
    ('99', '2',  2),
    ('2',  '3',  3),
    ('3',  '4',  4),
    ('4',  '5',  5),
    ('5',  '6',  6),
    ('6',  '7',  7),
    ('7',  '8',  8),
    ('8',  '9',  9),
    ('9',  '10', 10),
    ('10', '11', 11),
    ('11', '12', 12),
    ('12', '13', 13),
    ('15', '14', 14)
),
new_orders AS (
  SELECT
    t.id,
    remap.new_code AS new_section_code,
    remap.new_position * 1000
      + ROW_NUMBER() OVER (
          PARTITION BY t.section_code
          ORDER BY t.sort_order, t.question_number
        ) AS new_sort_order
  FROM public.aml_program_question_templates t
  JOIN remap ON t.section_code = remap.old_code
  WHERE t.submodule    = 'policies_procedures'
    AND t.control_area = 'core_controls'
    AND t.is_active    = true
)
UPDATE public.aml_program_question_templates t
SET section_code = new_orders.new_section_code,
    sort_order   = new_orders.new_sort_order
FROM new_orders
WHERE t.id = new_orders.id;

NOTIFY pgrst, 'reload schema';
