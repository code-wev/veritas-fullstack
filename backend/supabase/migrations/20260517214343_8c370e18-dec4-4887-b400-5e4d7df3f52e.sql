-- Combined schema catch-up — creates all missing tables and columns that the
-- codebase already references but which have not yet been applied from the
-- pending on-disk migration files.

-- =========================================================================
-- 1. Missing columns on existing tables
-- =========================================================================

ALTER TABLE public.aml_program_question_templates
  ADD COLUMN IF NOT EXISTS subsection text;

ALTER TABLE public.aml_program_question_templates
  ADD COLUMN IF NOT EXISTS suggested_finding_type text;

ALTER TABLE public.aml_program_question_templates
  ADD COLUMN IF NOT EXISTS applicability text;

ALTER TABLE public.aml_pp_control_results
  ADD COLUMN IF NOT EXISTS finding_type text;

ALTER TABLE public.aml_pp_reviews
  ADD COLUMN IF NOT EXISTS overall_finding_type text,
  ADD COLUMN IF NOT EXISTS overall_finding_type_overridden boolean NOT NULL DEFAULT false;

-- =========================================================================
-- 2. governance_interviewees
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.governance_interviewees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES public.governance_interviews(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  role_context text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS governance_interviewees_interview_idx
  ON public.governance_interviewees (interview_id);

ALTER TABLE public.governance_interviewees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Engagement members read governance_interviewees" ON public.governance_interviewees;
CREATE POLICY "Engagement members read governance_interviewees"
ON public.governance_interviewees FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.governance_interviews i
  WHERE i.id = interview_id
    AND public.has_engagement_access(auth.uid(), i.engagement_id)
));

DROP POLICY IF EXISTS "Engagement members insert governance_interviewees" ON public.governance_interviewees;
CREATE POLICY "Engagement members insert governance_interviewees"
ON public.governance_interviewees FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.governance_interviews i
  WHERE i.id = interview_id
    AND public.has_engagement_access(auth.uid(), i.engagement_id)
));

DROP POLICY IF EXISTS "Engagement members update governance_interviewees" ON public.governance_interviewees;
CREATE POLICY "Engagement members update governance_interviewees"
ON public.governance_interviewees FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.governance_interviews i
  WHERE i.id = interview_id
    AND public.has_engagement_access(auth.uid(), i.engagement_id)
));

DROP POLICY IF EXISTS "Engagement members delete governance_interviewees" ON public.governance_interviewees;
CREATE POLICY "Engagement members delete governance_interviewees"
ON public.governance_interviewees FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.governance_interviews i
  WHERE i.id = interview_id
    AND public.has_engagement_access(auth.uid(), i.engagement_id)
));

-- =========================================================================
-- 3. governance_interview_evidence
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.governance_interview_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES public.governance_interviews(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  filename text NOT NULL,
  file_size integer,
  content_type text,
  evidence_kind text NOT NULL DEFAULT 'transcript',
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS governance_interview_evidence_interview_idx
  ON public.governance_interview_evidence (interview_id);

ALTER TABLE public.governance_interview_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Engagement members read governance_interview_evidence" ON public.governance_interview_evidence;
CREATE POLICY "Engagement members read governance_interview_evidence"
ON public.governance_interview_evidence FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.governance_interviews i
  WHERE i.id = interview_id
    AND public.has_engagement_access(auth.uid(), i.engagement_id)
));

DROP POLICY IF EXISTS "Engagement members insert governance_interview_evidence" ON public.governance_interview_evidence;
CREATE POLICY "Engagement members insert governance_interview_evidence"
ON public.governance_interview_evidence FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.governance_interviews i
  WHERE i.id = interview_id
    AND public.has_engagement_access(auth.uid(), i.engagement_id)
));

DROP POLICY IF EXISTS "Engagement members delete governance_interview_evidence" ON public.governance_interview_evidence;
CREATE POLICY "Engagement members delete governance_interview_evidence"
ON public.governance_interview_evidence FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.governance_interviews i
  WHERE i.id = interview_id
    AND public.has_engagement_access(auth.uid(), i.engagement_id)
));

-- =========================================================================
-- 4. aml_pp_documents
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.aml_pp_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pp_review_id uuid NOT NULL REFERENCES public.aml_pp_reviews(id) ON DELETE CASCADE,
  name text NOT NULL,
  version_number text,
  date_prepared date,
  date_approved date,
  approval_authority text,
  scope text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS aml_pp_documents_review_idx
  ON public.aml_pp_documents (pp_review_id);

ALTER TABLE public.aml_pp_documents ENABLE ROW LEVEL SECURITY;

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

-- updated_at trigger for aml_pp_documents
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

NOTIFY pgrst, 'reload schema';