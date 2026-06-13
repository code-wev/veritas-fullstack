-- Governance Review module — multi-interviewee support, transcript evidence,
-- and prune of change-management questions duplicated by MSB Change Detection.
--
-- Background:
-- Per audit workflow, a single Governance interview commonly involves more
-- than one person in the room (e.g. two board members; CO + one team lead;
-- 3-4 frontline staff). The legacy schema only allowed one interviewee per
-- interview row. This migration introduces a child table
-- `governance_interviewees` and keeps the legacy fields on
-- `governance_interviews` for backwards compatibility.
--
-- Interviews are typically conducted over Microsoft Teams with auto-
-- transcription. We add `governance_interview_evidence` so the analyst can
-- attach the transcript, recording, or any supporting document to the
-- interview as audit evidence.
--
-- Finally, `change_management` questions 7 and 8 (reportable changes
-- notified to FINTRAC / notifications timely?) duplicate the per-category
-- 30-day testing already performed in the MSB Registration > Change
-- Detection module with objective evidence. We soft-delete them so the
-- Governance interview focuses on the *process* (Q1, Q2, Q5, Q9, etc.) and
-- the MSB module handles *event-level execution*.

-- =========================================================================
-- 1. Multiple interviewees per Governance interview
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.governance_interviewees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES public.governance_interviews(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  -- e.g. "Board Member", "CO Deputy", "Teller — Branch 2"
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
-- 2. Transcript / recording evidence per interview
-- =========================================================================
--
-- Files live in the existing `client-files` bucket (engagement-scoped RLS
-- via has_engagement_access). Storage path convention:
--   <engagement_id>/governance/<interview_id>/<timestamp>_<filename>

CREATE TABLE IF NOT EXISTS public.governance_interview_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES public.governance_interviews(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  filename text NOT NULL,
  file_size integer,
  content_type text,
  -- 'transcript' | 'recording' | 'notes' | 'other'
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
-- 3. Prune duplicative change_management questions
-- =========================================================================
-- Q7 ("Were all reportable changes notified to FINTRAC?") and
-- Q8 ("Were notifications timely?") are tested operationally — per change
-- category, with objective evidence — in MSB Registration > Change
-- Detection. Soft-delete keeps any historical responses intact.

UPDATE public.governance_question_templates
SET is_active = false
WHERE submodule = 'change_management'
  AND question_number IN (7, 8);

NOTIFY pgrst, 'reload schema';
