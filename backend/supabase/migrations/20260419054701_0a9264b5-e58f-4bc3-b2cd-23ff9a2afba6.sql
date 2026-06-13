ALTER TABLE public.tm_reviews
  ADD COLUMN IF NOT EXISTS alert_review_procedure_text TEXT,
  ADD COLUMN IF NOT EXISTS edd_procedure_text TEXT,
  ADD COLUMN IF NOT EXISTS risk_recalc_procedure_text TEXT;