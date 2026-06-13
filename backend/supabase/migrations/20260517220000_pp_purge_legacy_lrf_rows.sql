-- Policies & Procedures — purge legacy section-99 / LRF rows
--
-- The previous P&P rebuild migration (20260517150000) soft-deleted the
-- legacy 120-question library, but the LRF-* rows from the legacy
-- "Legal & Regulatory Framework" section (originally inserted by
-- 20260419042400) ended up with is_active=true in some environments.
-- The final-order migration (20260517210000) then hit them with its
-- ELSE-99 branch (since LRF doesn't match any current section prefix),
-- producing a phantom "99. Legal & Regulatory Framework" tail section
-- in the working-paper UI.
--
-- The substance of those legacy rows is already covered in the new
-- taxonomy (DCG-05/06/07 for PCMLTFA / sanctions / FINTRAC-guidance
-- references, plus the entire SAN section), so this migration soft-
-- deletes anything outside the 15-section question_code allow-list.
-- Soft-delete keeps any historical responses intact — aml_pp_control_
-- results.question_id is a FK that would block a hard delete.

UPDATE public.aml_program_question_templates
SET is_active = false
WHERE submodule    = 'policies_procedures'
  AND control_area = 'core_controls'
  AND (
    question_code IS NULL
    OR NOT (
      question_code LIKE 'DCG-%' OR
      question_code LIKE 'ECR-%' OR
      question_code LIKE 'RR-%'  OR
      question_code LIKE 'TRN-%' OR
      question_code LIKE 'MSB-%' OR
      question_code LIKE 'KYC-%' OR
      question_code LIKE 'BO-%'  OR
      question_code LIKE 'BR-%'  OR
      question_code LIKE 'TPD-%' OR
      question_code LIKE 'PEP-%' OR
      question_code LIKE 'REP-%' OR
      question_code LIKE 'RK-%'  OR
      question_code LIKE 'SAN-%' OR
      question_code LIKE 'CBR-%' OR
      question_code LIKE 'LED-%'
    )
  );

NOTIFY pgrst, 'reload schema';
