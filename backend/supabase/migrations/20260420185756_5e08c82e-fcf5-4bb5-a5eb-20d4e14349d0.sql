ALTER TABLE public.reporting_samples
  ADD COLUMN IF NOT EXISTS activity_sector_code boolean,
  ADD COLUMN IF NOT EXISTS eft_direction boolean,
  ADD COLUMN IF NOT EXISTS ministerial_directive boolean,
  ADD COLUMN IF NOT EXISTS submitting_re_number boolean,
  ADD COLUMN IF NOT EXISTS on_behalf_of_requester boolean,
  ADD COLUMN IF NOT EXISTS on_behalf_of_beneficiary boolean,
  ADD COLUMN IF NOT EXISTS requester_account boolean,
  ADD COLUMN IF NOT EXISTS requester_identification boolean,
  ADD COLUMN IF NOT EXISTS beneficiary_identification boolean,
  ADD COLUMN IF NOT EXISTS authorized_persons boolean;