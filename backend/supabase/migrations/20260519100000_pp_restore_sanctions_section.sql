-- Restore Sanctions & Ministerial Directives as a section under P&P
--
-- Earlier we pulled SAN-* out of the P&P working paper into a standalone
-- top-level module (sanctions_reviews / sanctions_control_results, plus a
-- separate question library under submodule='sanctions_directives'). The
-- firm has decided to keep it as a section under P&P instead, so this
-- migration:
--   1. Drops the standalone-module tables (and their RLS policies).
--   2. Deletes the question rows for the standalone-module library.
--   3. Shifts current P&P sections 12, 13, 14 down by one to make room.
--   4. Reactivates the original SAN-* rows (still in submodule=
--      'policies_procedures', is_active=false from the earlier migration)
--      and places them at section 12, between PEP and REP — the natural
--      position for screening obligations that drive downstream reporting.

-- =========================================================================
-- 1. Drop the standalone Sanctions module schema
-- =========================================================================

DROP TABLE IF EXISTS public.sanctions_control_results CASCADE;
DROP TABLE IF EXISTS public.sanctions_reviews CASCADE;
DROP FUNCTION IF EXISTS public.sanctions_reviews_set_updated_at();

-- =========================================================================
-- 2. Remove the standalone-module question rows
-- =========================================================================

DELETE FROM public.aml_program_question_templates
WHERE submodule = 'sanctions_directives';

-- =========================================================================
-- 3. Shift current P&P sections 12 / 13 / 14 down by one to make room
-- =========================================================================
-- After this:
--   12 -> 13 (REP)
--   13 -> 14 (RK)
--   14 -> 15 (LED)

UPDATE public.aml_program_question_templates
SET section_code = ((section_code::integer) + 1)::text,
    sort_order   = sort_order + 1000
WHERE submodule    = 'policies_procedures'
  AND control_area = 'core_controls'
  AND is_active    = true
  AND section_code IN ('12', '13', '14');

-- =========================================================================
-- 4. Reactivate SAN-* in P&P and place at section 12
-- =========================================================================

UPDATE public.aml_program_question_templates
SET is_active    = true,
    section_code = '12',
    section_name = 'Sanctions & Ministerial Directives',
    sort_order   = 12000 + CASE question_code
                            WHEN 'SAN-01' THEN 1
                            WHEN 'SAN-02' THEN 2
                            WHEN 'SAN-03' THEN 3
                            WHEN 'SAN-04' THEN 4
                            WHEN 'SAN-05' THEN 5
                            WHEN 'SAN-06' THEN 6
                            ELSE 99
                          END
WHERE submodule    = 'policies_procedures'
  AND control_area = 'core_controls'
  AND question_code LIKE 'SAN-%';

NOTIFY pgrst, 'reload schema';
