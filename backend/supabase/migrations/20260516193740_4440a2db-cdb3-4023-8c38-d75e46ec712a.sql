ALTER TABLE public.findings
  ADD COLUMN IF NOT EXISTS compliance_dimension text,
  ADD COLUMN IF NOT EXISTS is_first_miss boolean,
  ADD COLUMN IF NOT EXISTS auto_flag_weaknesses jsonb;

ALTER TABLE public.findings
  DROP CONSTRAINT IF EXISTS findings_compliance_dimension_check;

ALTER TABLE public.findings
  ADD CONSTRAINT findings_compliance_dimension_check
  CHECK (compliance_dimension IS NULL OR compliance_dimension IN (
    'documentation', 'application', 'both'
  ));

CREATE INDEX IF NOT EXISTS findings_compliance_dimension_idx
  ON public.findings (compliance_dimension)
  WHERE compliance_dimension IS NOT NULL;

CREATE INDEX IF NOT EXISTS findings_first_miss_idx
  ON public.findings (is_first_miss)
  WHERE is_first_miss IS NOT NULL;