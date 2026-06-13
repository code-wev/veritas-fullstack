ALTER TABLE public.kyc_individual_samples
ADD COLUMN IF NOT EXISTS id_attr_expiry_na boolean DEFAULT false;