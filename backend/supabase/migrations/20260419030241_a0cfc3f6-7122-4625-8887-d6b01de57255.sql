
ALTER TABLE public.kyc_individual_samples
  ADD COLUMN IF NOT EXISTS third_party_type TEXT,
  ADD COLUMN IF NOT EXISTS third_party_individual_name BOOLEAN,
  ADD COLUMN IF NOT EXISTS third_party_individual_address BOOLEAN,
  ADD COLUMN IF NOT EXISTS third_party_individual_dob BOOLEAN,
  ADD COLUMN IF NOT EXISTS third_party_individual_occupation BOOLEAN,
  ADD COLUMN IF NOT EXISTS third_party_entity_name BOOLEAN,
  ADD COLUMN IF NOT EXISTS third_party_entity_address BOOLEAN,
  ADD COLUMN IF NOT EXISTS third_party_entity_nature_of_business BOOLEAN,
  ADD COLUMN IF NOT EXISTS third_party_entity_incorporation_number BOOLEAN,
  ADD COLUMN IF NOT EXISTS third_party_entity_place_of_incorporation BOOLEAN,
  ADD COLUMN IF NOT EXISTS third_party_relationship_documented BOOLEAN,
  ADD COLUMN IF NOT EXISTS third_party_relationship_type TEXT;

ALTER TABLE public.kyc_business_samples
  ADD COLUMN IF NOT EXISTS third_party_type TEXT,
  ADD COLUMN IF NOT EXISTS third_party_individual_name BOOLEAN,
  ADD COLUMN IF NOT EXISTS third_party_individual_address BOOLEAN,
  ADD COLUMN IF NOT EXISTS third_party_individual_dob BOOLEAN,
  ADD COLUMN IF NOT EXISTS third_party_individual_occupation BOOLEAN,
  ADD COLUMN IF NOT EXISTS third_party_entity_name BOOLEAN,
  ADD COLUMN IF NOT EXISTS third_party_entity_address BOOLEAN,
  ADD COLUMN IF NOT EXISTS third_party_entity_nature_of_business BOOLEAN,
  ADD COLUMN IF NOT EXISTS third_party_entity_incorporation_number BOOLEAN,
  ADD COLUMN IF NOT EXISTS third_party_entity_place_of_incorporation BOOLEAN,
  ADD COLUMN IF NOT EXISTS third_party_relationship_documented BOOLEAN,
  ADD COLUMN IF NOT EXISTS third_party_relationship_type TEXT;
