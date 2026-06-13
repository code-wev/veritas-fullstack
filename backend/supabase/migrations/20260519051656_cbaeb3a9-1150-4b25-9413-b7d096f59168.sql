-- Transaction Reporting: source-list reconciliation (FINTRAC LCTR-1 / LVCTR-1 / EFTR-1)
CREATE TABLE IF NOT EXISTS public.reporting_source_population (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.reporting_reviews(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('lctr', 'eftr', 'lvctr')),
  period_start DATE,
  period_end DATE,
  source_file_path TEXT,
  source_file_name TEXT,
  source_file_type TEXT,
  total_rows INTEGER NOT NULL DEFAULT 0,
  matched_rows INTEGER NOT NULL DEFAULT 0,
  unmatched_rows INTEGER NOT NULL DEFAULT 0,
  excluded_rows INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (review_id, report_type)
);

CREATE INDEX IF NOT EXISTS idx_reporting_source_population_review
  ON public.reporting_source_population (review_id);
CREATE INDEX IF NOT EXISTS idx_reporting_source_population_engagement
  ON public.reporting_source_population (engagement_id);

CREATE TABLE IF NOT EXISTS public.reporting_source_population_rows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  population_id UUID NOT NULL REFERENCES public.reporting_source_population(id) ON DELETE CASCADE,
  source_reference TEXT,
  transaction_date DATE,
  transaction_amount NUMERIC(18, 2),
  transaction_currency TEXT,
  client_name TEXT,
  client_identifier TEXT,
  raw_row JSONB,
  matched_sample_id UUID REFERENCES public.reporting_samples(id) ON DELETE SET NULL,
  match_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (match_status IN ('pending', 'matched', 'unmatched', 'excluded')),
  match_method TEXT
    CHECK (match_method IS NULL OR match_method IN ('reference', 'amount_date', 'manual')),
  match_score NUMERIC(4, 3),
  exclusion_reason TEXT,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reporting_source_population_rows_population
  ON public.reporting_source_population_rows (population_id);
CREATE INDEX IF NOT EXISTS idx_reporting_source_population_rows_status
  ON public.reporting_source_population_rows (population_id, match_status);
CREATE INDEX IF NOT EXISTS idx_reporting_source_population_rows_sample
  ON public.reporting_source_population_rows (matched_sample_id);

ALTER TABLE public.reporting_source_population ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporting_source_population_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage reporting source population"
  ON public.reporting_source_population;
CREATE POLICY "Users can manage reporting source population"
  ON public.reporting_source_population FOR ALL
  USING (has_engagement_access(auth.uid(), engagement_id));

DROP POLICY IF EXISTS "Users can manage reporting source population rows"
  ON public.reporting_source_population_rows;
CREATE POLICY "Users can manage reporting source population rows"
  ON public.reporting_source_population_rows FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.reporting_source_population p
    WHERE p.id = reporting_source_population_rows.population_id
      AND has_engagement_access(auth.uid(), p.engagement_id)
  ));

CREATE OR REPLACE TRIGGER update_reporting_source_population_updated_at
  BEFORE UPDATE ON public.reporting_source_population
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_reporting_source_population_rows_updated_at
  BEFORE UPDATE ON public.reporting_source_population_rows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.reporting_source_population IS
  'FINTRAC LCTR-1/LVCTR-1/EFTR-1 source-list reconciliation: one batch per (review, report_type) holding the RE-supplied list of in-scope transactions.';
COMMENT ON TABLE public.reporting_source_population_rows IS
  'Individual rows from the RE source list, each reconciled against a reporting_samples record (or flagged as unmatched / excluded).';
COMMENT ON COLUMN public.reporting_source_population_rows.match_method IS
  'How the row was matched to a sample: reference (exact report_reference_id), amount_date (amount + date within tolerance), or manual (auditor link).';
COMMENT ON COLUMN public.reporting_source_population_rows.exclusion_reason IS
  'When match_status=excluded, the auditor-supplied reason (e.g. duplicate, below threshold, out-of-scope sector).';