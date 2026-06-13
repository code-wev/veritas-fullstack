ALTER TABLE public.kyc_individual_samples
  ADD COLUMN IF NOT EXISTS eft_fund_type_amount BOOLEAN,
  ADD COLUMN IF NOT EXISTS vc_type_of_vc BOOLEAN;

ALTER TABLE public.kyc_business_samples
  ADD COLUMN IF NOT EXISTS eft_fund_type_amount BOOLEAN,
  ADD COLUMN IF NOT EXISTS vc_type_of_vc BOOLEAN;