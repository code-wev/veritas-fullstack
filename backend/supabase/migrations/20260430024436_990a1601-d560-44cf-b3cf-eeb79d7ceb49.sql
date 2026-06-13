ALTER TABLE public.reporting_samples
  ADD COLUMN IF NOT EXISTS aggregation_type TEXT,
  ADD COLUMN IF NOT EXISTS txn_aggregation_type BOOLEAN,
  ADD COLUMN IF NOT EXISTS txn_aggregation_period_start BOOLEAN,
  ADD COLUMN IF NOT EXISTS txn_aggregation_period_end BOOLEAN;