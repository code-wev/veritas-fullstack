ALTER TABLE public.kyc_business_samples
  -- Section 2: Authorized persons / signatories
  ADD COLUMN IF NOT EXISTS authorized_persons_names_recorded boolean,
  ADD COLUMN IF NOT EXISTS signature_card_obtained boolean,
  -- Section 4 row 1: BO identification
  ADD COLUMN IF NOT EXISTS bo_name_address_recorded boolean,
  -- Section 4 row 2: Ownership percentage completeness
  ADD COLUMN IF NOT EXISTS bo_percentages_total_100 boolean,
  ADD COLUMN IF NOT EXISTS bo_percentage_gap_explanation boolean,
  -- Section 4 row 3: Control & structure
  ADD COLUMN IF NOT EXISTS ownership_structure_documented boolean,
  ADD COLUMN IF NOT EXISTS control_structure_documented boolean,
  ADD COLUMN IF NOT EXISTS bo_supporting_docs_obtained boolean,
  -- Section 5: Entity type gates
  ADD COLUMN IF NOT EXISTS entity_is_corporation boolean,
  ADD COLUMN IF NOT EXISTS entity_is_trust boolean,
  ADD COLUMN IF NOT EXISTS entity_is_widely_held boolean,
  ADD COLUMN IF NOT EXISTS entity_is_other boolean,
  ADD COLUMN IF NOT EXISTS entity_is_nfp boolean,
  -- Corporation-specific
  ADD COLUMN IF NOT EXISTS corp_directors_names_recorded boolean,
  ADD COLUMN IF NOT EXISTS corp_25pct_owners_name_address boolean,
  ADD COLUMN IF NOT EXISTS corp_ownership_control_structure boolean,
  -- Trust-specific
  ADD COLUMN IF NOT EXISTS trust_trustees_name_address boolean,
  ADD COLUMN IF NOT EXISTS trust_beneficiaries_name_address boolean,
  ADD COLUMN IF NOT EXISTS trust_settlors_name_address boolean,
  ADD COLUMN IF NOT EXISTS trust_ownership_control_structure boolean,
  -- Widely Held / Public Trust-specific
  ADD COLUMN IF NOT EXISTS wht_trustees_names boolean,
  ADD COLUMN IF NOT EXISTS wht_25pct_owners_identified boolean,
  ADD COLUMN IF NOT EXISTS wht_ownership_control_documented boolean,
  -- Other entity-specific
  ADD COLUMN IF NOT EXISTS other_25pct_owners_identified boolean,
  ADD COLUMN IF NOT EXISTS other_ownership_control_documented boolean,
  -- Not-for-profit specific
  ADD COLUMN IF NOT EXISTS nfp_registered_charity boolean,
  ADD COLUMN IF NOT EXISTS nfp_non_charity_soliciting boolean;