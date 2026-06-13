ALTER TABLE public.tm_submodule_status
  ADD COLUMN IF NOT EXISTS finding_type        text,
  ADD COLUMN IF NOT EXISTS system_finding_type text,
  ADD COLUMN IF NOT EXISTS override_rationale  text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tm_submodule_status_finding_type_chk') THEN
    ALTER TABLE public.tm_submodule_status ADD CONSTRAINT tm_submodule_status_finding_type_chk
      CHECK (finding_type IS NULL OR finding_type IN
        ('complete_nc','partial_important','partial_moderate','partial_lesser','observation'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tm_submodule_status_system_finding_type_chk') THEN
    ALTER TABLE public.tm_submodule_status ADD CONSTRAINT tm_submodule_status_system_finding_type_chk
      CHECK (system_finding_type IS NULL OR system_finding_type IN
        ('complete_nc','partial_important','partial_moderate','partial_lesser','observation'));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';