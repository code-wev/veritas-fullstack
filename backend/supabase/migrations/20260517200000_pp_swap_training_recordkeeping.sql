-- Policies & Procedures — swap Training (was 4) and Recordkeeping (was 5)
--
-- New positions:
--   4  Recordkeeping     (was 5)
--   5  Training Program  (was 4)
--
-- Single UPDATE flips both section_code and sort_order for the two sections.
-- The CASE expressions evaluate against the ORIGINAL section_code value of
-- each row, so the swap is atomic (no intermediate collision).
--   TRN rows previously had sort_order in 4001..4009 → now 5001..5009
--   RK  rows previously had sort_order in 5001..5007 → now 4001..4007

UPDATE public.aml_program_question_templates t
SET section_code = CASE t.section_code
                     WHEN '4' THEN '5'
                     WHEN '5' THEN '4'
                     ELSE t.section_code
                   END,
    sort_order   = CASE
                     WHEN t.section_code = '4' THEN t.sort_order + 1000
                     WHEN t.section_code = '5' THEN t.sort_order - 1000
                     ELSE t.sort_order
                   END
WHERE t.submodule    = 'policies_procedures'
  AND t.control_area = 'core_controls'
  AND t.section_code IN ('4', '5');

NOTIFY pgrst, 'reload schema';
