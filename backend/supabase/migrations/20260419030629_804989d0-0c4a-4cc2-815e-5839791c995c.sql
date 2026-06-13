
ALTER TABLE public.kyc_individual_samples
  ADD COLUMN IF NOT EXISTS occupation_description TEXT;
