ALTER TABLE public.kyc_individual_samples
  ADD COLUMN IF NOT EXISTS pep_office_position_documented boolean,
  ADD COLUMN IF NOT EXISTS pep_determination_date_documented boolean,
  ADD COLUMN IF NOT EXISTS pep_source_of_funds_measures boolean,
  ADD COLUMN IF NOT EXISTS pep_source_of_wealth_measures boolean,
  ADD COLUMN IF NOT EXISTS pep_senior_mgmt_review_30_days boolean,
  ADD COLUMN IF NOT EXISTS pep_classified_high_risk boolean;