-- Per-item evidence uploads for the MSB Status Validation checklist.
--
-- Each row links a file in the `client-files` storage bucket to a specific
-- checklist item (e.g. 'registration_confirmed_on_website',
-- 'fintrac_forms_obtained') on a specific MSB registration. The auditor can
-- upload multiple files per item.
--
-- Files themselves live in the existing `client-files` storage bucket (which
-- already has engagement-scoped RLS via has_engagement_access). Storage path
-- convention:
--   <engagement_id>/msb-validation/<registration_id>/<item_key>/<timestamp>_<filename>

CREATE TABLE IF NOT EXISTS public.msb_validation_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.msb_registrations(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  storage_path text NOT NULL,
  filename text NOT NULL,
  file_size integer,
  content_type text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS msb_validation_evidence_reg_item_idx
  ON public.msb_validation_evidence (registration_id, item_key);

ALTER TABLE public.msb_validation_evidence ENABLE ROW LEVEL SECURITY;

-- Access is gated by engagement membership on the parent registration.
DROP POLICY IF EXISTS "Engagement members read msb_validation_evidence" ON public.msb_validation_evidence;
CREATE POLICY "Engagement members read msb_validation_evidence"
ON public.msb_validation_evidence FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.msb_registrations r
  WHERE r.id = registration_id
    AND public.has_engagement_access(auth.uid(), r.engagement_id)
));

DROP POLICY IF EXISTS "Engagement members insert msb_validation_evidence" ON public.msb_validation_evidence;
CREATE POLICY "Engagement members insert msb_validation_evidence"
ON public.msb_validation_evidence FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.msb_registrations r
  WHERE r.id = registration_id
    AND public.has_engagement_access(auth.uid(), r.engagement_id)
));

DROP POLICY IF EXISTS "Engagement members delete msb_validation_evidence" ON public.msb_validation_evidence;
CREATE POLICY "Engagement members delete msb_validation_evidence"
ON public.msb_validation_evidence FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.msb_registrations r
  WHERE r.id = registration_id
    AND public.has_engagement_access(auth.uid(), r.engagement_id)
));

NOTIFY pgrst, 'reload schema';
