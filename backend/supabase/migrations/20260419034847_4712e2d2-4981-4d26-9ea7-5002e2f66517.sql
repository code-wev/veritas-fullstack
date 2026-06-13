-- Add new KYC testing fields to individual samples
ALTER TABLE public.kyc_individual_samples
  ADD COLUMN IF NOT EXISTS id_valid_at_verification boolean,
  ADD COLUMN IF NOT EXISTS pep_status_recorded boolean,
  ADD COLUMN IF NOT EXISTS pep_senior_mgmt_approval boolean,
  ADD COLUMN IF NOT EXISTS eft_date_of_initiation boolean,
  ADD COLUMN IF NOT EXISTS eft_requesting_client_match_kyc boolean,
  ADD COLUMN IF NOT EXISTS eft_account_details boolean,
  ADD COLUMN IF NOT EXISTS eft_exchange_rate_source boolean,
  ADD COLUMN IF NOT EXISTS lctr_amount_confirmed boolean,
  ADD COLUMN IF NOT EXISTS lctr_24h_aggregation boolean,
  ADD COLUMN IF NOT EXISTS lctr_currency_conversion boolean,
  ADD COLUMN IF NOT EXISTS lctr_third_party_determination boolean,
  ADD COLUMN IF NOT EXISTS lctr_third_party_details boolean,
  ADD COLUMN IF NOT EXISTS vc_amount_confirmed boolean,
  ADD COLUMN IF NOT EXISTS vc_exchange_rate_source boolean,
  ADD COLUMN IF NOT EXISTS vc_third_party_determination boolean;

-- Add the same fields to business samples (except Government ID + PEP which are individual-only)
ALTER TABLE public.kyc_business_samples
  ADD COLUMN IF NOT EXISTS eft_date_of_initiation boolean,
  ADD COLUMN IF NOT EXISTS eft_requesting_client_match_kyc boolean,
  ADD COLUMN IF NOT EXISTS eft_account_details boolean,
  ADD COLUMN IF NOT EXISTS eft_exchange_rate_source boolean,
  ADD COLUMN IF NOT EXISTS lctr_amount_confirmed boolean,
  ADD COLUMN IF NOT EXISTS lctr_24h_aggregation boolean,
  ADD COLUMN IF NOT EXISTS lctr_currency_conversion boolean,
  ADD COLUMN IF NOT EXISTS lctr_third_party_determination boolean,
  ADD COLUMN IF NOT EXISTS lctr_third_party_details boolean,
  ADD COLUMN IF NOT EXISTS vc_amount_confirmed boolean,
  ADD COLUMN IF NOT EXISTS vc_exchange_rate_source boolean,
  ADD COLUMN IF NOT EXISTS vc_third_party_determination boolean;