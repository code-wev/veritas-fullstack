ALTER TABLE public.tm_reviews
  ADD COLUMN IF NOT EXISTS screening_procedure_text text,
  ADD COLUMN IF NOT EXISTS fintrac_remediation_procedure_text text,
  ADD COLUMN IF NOT EXISTS prior_review_remediation_procedure_text text;