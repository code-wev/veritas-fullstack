-- Create Quebec nexus triage table for Revenu Québec MSB registration gate
CREATE TABLE IF NOT EXISTS public.msb_quebec_nexus_triage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID NOT NULL REFERENCES public.msb_registrations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL,
  has_physical_presence_qc TEXT, -- 'yes' | 'no' | null
  serves_quebec_id_clients TEXT, -- 'yes' | 'no' | null
  targets_quebec_residents TEXT, -- 'yes' | 'no' | null (transactions targeting QC)
  is_registered_with_rq BOOLEAN DEFAULT false,
  triage_notes TEXT,
  triage_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(registration_id)
);

ALTER TABLE public.msb_quebec_nexus_triage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with engagement access can view QC triage"
ON public.msb_quebec_nexus_triage FOR SELECT
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users with engagement access can insert QC triage"
ON public.msb_quebec_nexus_triage FOR INSERT
WITH CHECK (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users with engagement access can update QC triage"
ON public.msb_quebec_nexus_triage FOR UPDATE
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users with engagement access can delete QC triage"
ON public.msb_quebec_nexus_triage FOR DELETE
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE TRIGGER update_msb_quebec_nexus_triage_updated_at
BEFORE UPDATE ON public.msb_quebec_nexus_triage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add Quebec-specific fields to msb_registrations
ALTER TABLE public.msb_registrations
  ADD COLUMN IF NOT EXISTS qc_licence_number TEXT,
  ADD COLUMN IF NOT EXISTS qc_other_names TEXT[],
  ADD COLUMN IF NOT EXISTS qc_authorized_services TEXT[],
  ADD COLUMN IF NOT EXISTS qc_mandataries TEXT,
  ADD COLUMN IF NOT EXISTS qc_branches TEXT,
  ADD COLUMN IF NOT EXISTS qc_atms TEXT,
  ADD COLUMN IF NOT EXISTS qc_crypto_atms TEXT;