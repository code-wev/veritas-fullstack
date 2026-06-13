ALTER TABLE public.kyc_business_samples
  ADD COLUMN IF NOT EXISTS authorized_persons_documented BOOLEAN,
  ADD COLUMN IF NOT EXISTS articles_or_bylaws_obtained BOOLEAN,
  ADD COLUMN IF NOT EXISTS cheque_date_cashed BOOLEAN,
  ADD COLUMN IF NOT EXISTS cheque_provider_name BOOLEAN,
  ADD COLUMN IF NOT EXISTS cheque_provider_address BOOLEAN,
  ADD COLUMN IF NOT EXISTS cheque_provider_occupation BOOLEAN,
  ADD COLUMN IF NOT EXISTS cheque_provider_dob BOOLEAN,
  ADD COLUMN IF NOT EXISTS cheque_total_amount BOOLEAN,
  ADD COLUMN IF NOT EXISTS cheque_issuer_name BOOLEAN,
  ADD COLUMN IF NOT EXISTS cheque_account_number BOOLEAN,
  ADD COLUMN IF NOT EXISTS cheque_account_type BOOLEAN,
  ADD COLUMN IF NOT EXISTS cheque_account_holder_name BOOLEAN,
  ADD COLUMN IF NOT EXISTS cheque_reference_number BOOLEAN,
  ADD COLUMN IF NOT EXISTS cheque_vc_transaction_identifier BOOLEAN;

ALTER TABLE public.kyc_individual_samples
  ADD COLUMN IF NOT EXISTS cheque_date_cashed BOOLEAN,
  ADD COLUMN IF NOT EXISTS cheque_provider_name BOOLEAN,
  ADD COLUMN IF NOT EXISTS cheque_provider_address BOOLEAN,
  ADD COLUMN IF NOT EXISTS cheque_provider_occupation BOOLEAN,
  ADD COLUMN IF NOT EXISTS cheque_provider_dob BOOLEAN,
  ADD COLUMN IF NOT EXISTS cheque_total_amount BOOLEAN,
  ADD COLUMN IF NOT EXISTS cheque_issuer_name BOOLEAN,
  ADD COLUMN IF NOT EXISTS cheque_account_number BOOLEAN,
  ADD COLUMN IF NOT EXISTS cheque_account_type BOOLEAN,
  ADD COLUMN IF NOT EXISTS cheque_account_holder_name BOOLEAN,
  ADD COLUMN IF NOT EXISTS cheque_reference_number BOOLEAN,
  ADD COLUMN IF NOT EXISTS cheque_vc_transaction_identifier BOOLEAN;