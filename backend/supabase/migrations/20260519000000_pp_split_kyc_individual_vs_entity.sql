-- Policies & Procedures — split Client Identification into two sections
--
-- The legacy single KYC section combines individual-client verification with
-- corporate-client verification, which forces analysts to mark a chunk of
-- the section N/A for entities whose business model only touches one client
-- type. Split into two adjacent sections so each can be marked N/A as a
-- block (with a required rationale) when the reporting entity doesn't
-- onboard that client type.
--
-- Driven by question_code so it's idempotent against any current state of
-- section_code. The integer-string section_code at the KYC position holds
-- Individual; the next position holds Corporate / Entity. Sections after
-- KYC are shifted down by one to make room.
--
-- Mapping (legacy library):
--   KYC-01 .. KYC-10   -> Individual Client Identification & Verification
--   KYC-11, KYC-12     -> Corporate / Entity Client Identification & Verification

DO $$
DECLARE
  kyc_code text;
  kyc_pos  integer;
  corp_pos integer;
BEGIN
  -- Find the section_code currently holding the active KYC questions.
  SELECT DISTINCT section_code INTO kyc_code
  FROM public.aml_program_question_templates
  WHERE submodule    = 'policies_procedures'
    AND control_area = 'core_controls'
    AND is_active    = true
    AND question_code LIKE 'KYC-%'
  LIMIT 1;

  IF kyc_code IS NULL THEN
    RAISE NOTICE 'No active KYC- rows found; skipping split.';
    RETURN;
  END IF;

  BEGIN
    kyc_pos := kyc_code::integer;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'KYC section_code "%" is not an integer; cannot split.', kyc_code;
  END;

  corp_pos := kyc_pos + 1;

  -- Shift every section AFTER KYC down by one to make room for Corporate.
  -- Skip the section-99 orphan bucket and any other non-numeric codes.
  UPDATE public.aml_program_question_templates
  SET section_code = ((section_code::integer) + 1)::text,
      sort_order   = sort_order + 1000
  WHERE submodule    = 'policies_procedures'
    AND control_area = 'core_controls'
    AND is_active    = true
    AND section_code ~ '^\d+$'
    AND section_code::integer > kyc_pos
    AND section_code::integer < 99;

  -- Move the entity-specific KYC rows (KYC-11, KYC-12) into the new
  -- Corporate / Entity section.
  UPDATE public.aml_program_question_templates
  SET section_code = corp_pos::text,
      section_name = 'Corporate / Entity Client Identification & Verification',
      sort_order   = corp_pos * 1000
                     + CASE question_code
                         WHEN 'KYC-11' THEN 1
                         WHEN 'KYC-12' THEN 2
                         ELSE 99
                       END
  WHERE submodule    = 'policies_procedures'
    AND control_area = 'core_controls'
    AND is_active    = true
    AND question_code IN ('KYC-11', 'KYC-12');

  -- Rename the remaining (individual-focused) KYC rows.
  UPDATE public.aml_program_question_templates
  SET section_name = 'Individual Client Identification & Verification'
  WHERE submodule    = 'policies_procedures'
    AND control_area = 'core_controls'
    AND is_active    = true
    AND section_code = kyc_code
    AND question_code LIKE 'KYC-%';
END $$;

NOTIFY pgrst, 'reload schema';
