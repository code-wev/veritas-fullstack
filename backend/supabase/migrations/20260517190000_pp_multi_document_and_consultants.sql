-- Policies & Procedures — multi-document intake + AML-consultant control
--
-- 1. Most firms maintain more than one P&P document (e.g. an AML manual, a
--    separate KYC procedures booklet, sanctions playbook, etc.), each with
--    its own version number and prepared / approved dates. The legacy
--    columns on aml_pp_reviews carried only one version_number and one
--    last_updated_date which collapses this real-world detail. This adds
--    `aml_pp_documents` as a child table — one row per document — with
--    full per-document metadata.
-- 2. Adds RR-08 to the Roles & Responsibilities section so the analyst
--    explicitly tests whether the program acknowledges the use of external
--    AML consultants and whether their roles and responsibilities are
--    defined in-program or in a referenced engagement letter.

-- =========================================================================
-- 1. aml_pp_documents — per-document metadata
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.aml_pp_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pp_review_id uuid NOT NULL REFERENCES public.aml_pp_reviews(id) ON DELETE CASCADE,
  name text NOT NULL,
  version_number text,
  date_prepared date,
  date_approved date,
  approval_authority text,
  -- Optional free-text scope statement (e.g. "Canadian MSB operations only")
  scope text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS aml_pp_documents_review_idx
  ON public.aml_pp_documents (pp_review_id);

ALTER TABLE public.aml_pp_documents ENABLE ROW LEVEL SECURITY;

-- Access traverses pp_review -> program_review -> engagement membership.
DROP POLICY IF EXISTS "Engagement members read aml_pp_documents" ON public.aml_pp_documents;
CREATE POLICY "Engagement members read aml_pp_documents"
ON public.aml_pp_documents FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.aml_pp_reviews pp
  JOIN public.aml_program_reviews pr ON pr.id = pp.program_review_id
  WHERE pp.id = aml_pp_documents.pp_review_id
    AND public.has_engagement_access(auth.uid(), pr.engagement_id)
));

DROP POLICY IF EXISTS "Engagement members insert aml_pp_documents" ON public.aml_pp_documents;
CREATE POLICY "Engagement members insert aml_pp_documents"
ON public.aml_pp_documents FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1
  FROM public.aml_pp_reviews pp
  JOIN public.aml_program_reviews pr ON pr.id = pp.program_review_id
  WHERE pp.id = aml_pp_documents.pp_review_id
    AND public.has_engagement_access(auth.uid(), pr.engagement_id)
));

DROP POLICY IF EXISTS "Engagement members update aml_pp_documents" ON public.aml_pp_documents;
CREATE POLICY "Engagement members update aml_pp_documents"
ON public.aml_pp_documents FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.aml_pp_reviews pp
  JOIN public.aml_program_reviews pr ON pr.id = pp.program_review_id
  WHERE pp.id = aml_pp_documents.pp_review_id
    AND public.has_engagement_access(auth.uid(), pr.engagement_id)
));

DROP POLICY IF EXISTS "Engagement members delete aml_pp_documents" ON public.aml_pp_documents;
CREATE POLICY "Engagement members delete aml_pp_documents"
ON public.aml_pp_documents FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.aml_pp_reviews pp
  JOIN public.aml_program_reviews pr ON pr.id = pp.program_review_id
  WHERE pp.id = aml_pp_documents.pp_review_id
    AND public.has_engagement_access(auth.uid(), pr.engagement_id)
));

-- Keep updated_at fresh on edits
CREATE OR REPLACE FUNCTION public.aml_pp_documents_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS aml_pp_documents_updated_at ON public.aml_pp_documents;
CREATE TRIGGER aml_pp_documents_updated_at
BEFORE UPDATE ON public.aml_pp_documents
FOR EACH ROW
EXECUTE FUNCTION public.aml_pp_documents_set_updated_at();

-- =========================================================================
-- 2. RR-08 — AML consultants engagement and roles
-- =========================================================================
-- Section 3 (Roles & Responsibilities). New subsection "External support"
-- so the row sits visually distinct from the in-house role rows above it.

INSERT INTO public.aml_program_question_templates
  (submodule, control_area, control_category, question_number, question_text, regulatory_reference, evidence_required, sort_order, regulatory_category, test_procedure, analyst_guidance, pass_criteria, max_points, section_code, section_name, subsection, question_code, is_new_or_updated, suggested_finding_type)
VALUES
('policies_procedures','core_controls','roles_responsibilities',200,
 'AML consultants — engagement and roles',
 'PCMLTFR; FINTRAC Guidance',
 true,
 3008,
 'Requirement',
 NULL,
 'Verify whether the AML program acknowledges the use of external AML consultants (e.g. compliance advisory firms, fractional CO services, training vendors, audit-support consultants). If consultants are used, verify BOTH: (a) Policy: the program identifies what role(s) the consultants perform (advisory, drafting, training, audit support, technical SME) and what is in-scope vs out-of-scope (e.g. consultants advise but do not act as the appointed CO); AND (b) Procedure: their roles and responsibilities are defined either in the program itself OR in a separate engagement letter that is explicitly referenced from the program (with the engagement letter retained as evidence). Mark N/A if the firm does not use AML consultants.',
 'Either the firm uses no AML consultants (mark N/A) or both the policy on what consultants do and the procedure for defining their roles (in-program or referenced engagement letter, with the letter retained as evidence) are documented.',
 NULL,
 '3','Roles & Responsibilities','External support','RR-08',true,
 'partial_moderate');

NOTIFY pgrst, 'reload schema';
