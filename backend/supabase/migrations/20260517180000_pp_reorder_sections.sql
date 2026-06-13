-- Policies & Procedures — reorder working-paper sections
--
-- Move Training (was 13) and Recordkeeping (was 12) up to sit next to the
-- compliance-regime pillars and Roles & Responsibilities. Move Law
-- Enforcement, Disclosures & Self-Disclosure (was 14) to the end. Pull
-- Beneficial Ownership up so it sits immediately after Client ID & KYC.
--
-- New order:
--   1  Document Control & Governance      (unchanged)
--   2  Effective Compliance Regime        (unchanged)
--   3  Roles & Responsibilities           (unchanged)
--   4  Training Program                   (was 13 — moved up)
--   5  Recordkeeping                      (was 12 — moved up)
--   6  MSB Registration & FINTRAC Notif.  (was 4  — conditional msb_required)
--   7  Client Identification & KYC        (was 5)
--   8  Beneficial Ownership & Disc Rep    (was 8  — now directly after KYC)
--   9  Business Relationship & Ong Monit. (was 6)
--   10 Third Party Determination          (was 7)
--   11 PEP / HIO                          (was 9)
--   12 Reporting Obligations              (was 10)
--   13 Sanctions & Ministerial Directives (was 11)
--   14 Correspondent Banking              (was 15 — conditional fi_only)
--   15 Law Enforcement, Disclosures…      (was 14 — moved to last)
--
-- We update section_code and sort_order in a single statement. Within each
-- section the relative ordering of questions is preserved.

WITH remap(old_code, new_code, new_position) AS (
  VALUES
    ('1',  '1',  1),
    ('2',  '2',  2),
    ('3',  '3',  3),
    ('13', '4',  4),
    ('12', '5',  5),
    ('4',  '6',  6),
    ('5',  '7',  7),
    ('8',  '8',  8),
    ('6',  '9',  9),
    ('7',  '10', 10),
    ('9',  '11', 11),
    ('10', '12', 12),
    ('11', '13', 13),
    ('15', '14', 14),
    ('14', '15', 15)
),
new_orders AS (
  SELECT
    t.id,
    remap.new_code AS new_section_code,
    remap.new_position * 1000
      + ROW_NUMBER() OVER (
          PARTITION BY t.section_code
          ORDER BY t.sort_order
        ) AS new_sort_order
  FROM public.aml_program_question_templates t
  JOIN remap ON t.section_code = remap.old_code
  WHERE t.submodule    = 'policies_procedures'
    AND t.control_area = 'core_controls'
)
UPDATE public.aml_program_question_templates t
SET section_code = new_orders.new_section_code,
    sort_order   = new_orders.new_sort_order
FROM new_orders
WHERE t.id = new_orders.id;

NOTIFY pgrst, 'reload schema';
