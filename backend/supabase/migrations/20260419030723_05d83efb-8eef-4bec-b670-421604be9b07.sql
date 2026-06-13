
ALTER TABLE public.kyc_individual_samples
  ADD COLUMN IF NOT EXISTS id_attr_person_name BOOLEAN,
  ADD COLUMN IF NOT EXISTS id_attr_document_type BOOLEAN,
  ADD COLUMN IF NOT EXISTS id_attr_identifying_number BOOLEAN,
  ADD COLUMN IF NOT EXISTS id_attr_jurisdiction BOOLEAN,
  ADD COLUMN IF NOT EXISTS id_attr_expiry_date BOOLEAN;
