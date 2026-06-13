ALTER TABLE public.tm_screening_samples    ADD COLUMN IF NOT EXISTS finding_type text, ADD COLUMN IF NOT EXISTS system_finding_type text, ADD COLUMN IF NOT EXISTS override_rationale text;
ALTER TABLE public.tm_alert_samples        ADD COLUMN IF NOT EXISTS finding_type text, ADD COLUMN IF NOT EXISTS system_finding_type text, ADD COLUMN IF NOT EXISTS override_rationale text;
ALTER TABLE public.tm_edd_samples          ADD COLUMN IF NOT EXISTS finding_type text, ADD COLUMN IF NOT EXISTS system_finding_type text, ADD COLUMN IF NOT EXISTS override_rationale text;
ALTER TABLE public.tm_risk_recalc_samples  ADD COLUMN IF NOT EXISTS finding_type text, ADD COLUMN IF NOT EXISTS system_finding_type text, ADD COLUMN IF NOT EXISTS override_rationale text;
ALTER TABLE public.tm_remediation_items    ADD COLUMN IF NOT EXISTS finding_type text, ADD COLUMN IF NOT EXISTS system_finding_type text, ADD COLUMN IF NOT EXISTS override_rationale text;
ALTER TABLE public.tm_submodule_status     ADD COLUMN IF NOT EXISTS finding_type text, ADD COLUMN IF NOT EXISTS system_finding_type text, ADD COLUMN IF NOT EXISTS override_rationale text;
ALTER TABLE public.tm_findings             ADD COLUMN IF NOT EXISTS finding_type text;

ALTER TABLE public.tm_alert_samples
  ADD COLUMN IF NOT EXISTS pep_source_of_funds_documented  boolean,
  ADD COLUMN IF NOT EXISTS pep_source_of_wealth_documented boolean,
  ADD COLUMN IF NOT EXISTS pep_senior_mgmt_approval        boolean,
  ADD COLUMN IF NOT EXISTS pep_sm_approval_within_30_days  boolean;

ALTER TABLE public.tm_submodule_status
  ADD COLUMN IF NOT EXISTS policy_sla_days integer;

ALTER TABLE public.tm_alert_samples
  ADD COLUMN IF NOT EXISTS escalated_to    text,
  ADD COLUMN IF NOT EXISTS escalation_date date,
  ADD COLUMN IF NOT EXISTS reviewed_by     text,
  ADD COLUMN IF NOT EXISTS approved_by     text,
  ADD COLUMN IF NOT EXISTS approved_at     date;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tm_screening_finding_type_chk') THEN
    ALTER TABLE public.tm_screening_samples ADD CONSTRAINT tm_screening_finding_type_chk
      CHECK (finding_type IS NULL OR finding_type IN ('complete_nc','partial_important','partial_moderate','partial_lesser','observation'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tm_alert_finding_type_chk') THEN
    ALTER TABLE public.tm_alert_samples ADD CONSTRAINT tm_alert_finding_type_chk
      CHECK (finding_type IS NULL OR finding_type IN ('complete_nc','partial_important','partial_moderate','partial_lesser','observation'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tm_edd_finding_type_chk') THEN
    ALTER TABLE public.tm_edd_samples ADD CONSTRAINT tm_edd_finding_type_chk
      CHECK (finding_type IS NULL OR finding_type IN ('complete_nc','partial_important','partial_moderate','partial_lesser','observation'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tm_risk_recalc_finding_type_chk') THEN
    ALTER TABLE public.tm_risk_recalc_samples ADD CONSTRAINT tm_risk_recalc_finding_type_chk
      CHECK (finding_type IS NULL OR finding_type IN ('complete_nc','partial_important','partial_moderate','partial_lesser','observation'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tm_remediation_finding_type_chk') THEN
    ALTER TABLE public.tm_remediation_items ADD CONSTRAINT tm_remediation_finding_type_chk
      CHECK (finding_type IS NULL OR finding_type IN ('complete_nc','partial_important','partial_moderate','partial_lesser','observation'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tm_submodule_status_finding_type_chk') THEN
    ALTER TABLE public.tm_submodule_status ADD CONSTRAINT tm_submodule_status_finding_type_chk
      CHECK (finding_type IS NULL OR finding_type IN ('complete_nc','partial_important','partial_moderate','partial_lesser','observation'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tm_findings_finding_type_chk') THEN
    ALTER TABLE public.tm_findings ADD CONSTRAINT tm_findings_finding_type_chk
      CHECK (finding_type IS NULL OR finding_type IN ('complete_nc','partial_important','partial_moderate','partial_lesser','observation'));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';