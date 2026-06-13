ALTER TABLE public.reporting_samples
  ADD COLUMN IF NOT EXISTS source_file_path text,
  ADD COLUMN IF NOT EXISTS source_file_name text,
  ADD COLUMN IF NOT EXISTS source_file_type text;

NOTIFY pgrst, 'reload schema';