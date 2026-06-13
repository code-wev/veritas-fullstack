ALTER TABLE public.kyc_individual_samples
  ADD COLUMN IF NOT EXISTS pep_hio_identified boolean;

ALTER TABLE public.kyc_business_samples
  ADD COLUMN IF NOT EXISTS pep_hio_identified boolean;