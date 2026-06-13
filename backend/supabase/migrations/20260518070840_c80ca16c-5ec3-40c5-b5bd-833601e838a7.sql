-- 20260518110000_kyc_telephone_authorized_persons.sql
ALTER TABLE public.kyc_individual_samples
  ADD COLUMN IF NOT EXISTS telephone_present boolean;

ALTER TABLE public.kyc_business_samples
  ADD COLUMN IF NOT EXISTS telephone_present              boolean,
  ADD COLUMN IF NOT EXISTS authorized_persons_documented  boolean,
  ADD COLUMN IF NOT EXISTS authorized_persons_id_verified boolean;

-- 20260518120000_kyc_sample_evidence.sql
CREATE TABLE IF NOT EXISTS public.kyc_sample_evidence (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_sample_id uuid REFERENCES public.kyc_individual_samples(id) ON DELETE CASCADE,
  business_sample_id   uuid REFERENCES public.kyc_business_samples(id)   ON DELETE CASCADE,
  storage_path         text NOT NULL,
  filename             text NOT NULL,
  file_size            bigint,
  content_type         text,
  page_label           text,
  notes                text,
  uploaded_by          uuid,
  uploaded_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kyc_sample_evidence_one_owner
    CHECK ((individual_sample_id IS NOT NULL) <> (business_sample_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS kyc_sample_evidence_individual_idx ON public.kyc_sample_evidence (individual_sample_id);
CREATE INDEX IF NOT EXISTS kyc_sample_evidence_business_idx   ON public.kyc_sample_evidence (business_sample_id);

ALTER TABLE public.kyc_sample_evidence ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kyc_sample_evidence') THEN
    CREATE POLICY "kyc_sample_evidence_select_all" ON public.kyc_sample_evidence FOR SELECT TO authenticated USING (true);
    CREATE POLICY "kyc_sample_evidence_insert_all" ON public.kyc_sample_evidence FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "kyc_sample_evidence_update_all" ON public.kyc_sample_evidence FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "kyc_sample_evidence_delete_all" ON public.kyc_sample_evidence FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';