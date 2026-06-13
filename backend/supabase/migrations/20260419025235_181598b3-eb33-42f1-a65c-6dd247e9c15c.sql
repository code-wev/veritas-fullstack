ALTER TABLE public.kyc_individual_samples
ADD COLUMN IF NOT EXISTS telephone_present BOOLEAN;