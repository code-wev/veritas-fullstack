ALTER TABLE public.kyc_individual_samples
  ADD COLUMN IF NOT EXISTS cf_name_address_dob_match boolean,
  ADD COLUMN IF NOT EXISTS cf_credit_bureau_name boolean,
  ADD COLUMN IF NOT EXISTS cf_credit_file_number boolean,
  ADD COLUMN IF NOT EXISTS cf_existence_3_years boolean,
  ADD COLUMN IF NOT EXISTS cf_two_tradelines boolean,
  ADD COLUMN IF NOT EXISTS cf_consultation_date boolean,
  ADD COLUMN IF NOT EXISTS dp_person_name boolean,
  ADD COLUMN IF NOT EXISTS dp_two_independent_sources boolean,
  ADD COLUMN IF NOT EXISTS dp_information_type boolean,
  ADD COLUMN IF NOT EXISTS dp_document_valid_current boolean,
  ADD COLUMN IF NOT EXISTS dp_document_number boolean,
  ADD COLUMN IF NOT EXISTS dp_date_verified boolean;