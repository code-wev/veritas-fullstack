-- Expand the findings table with additional fields for the centralized register
ALTER TABLE public.findings 
ADD COLUMN IF NOT EXISTS observation text,
ADD COLUMN IF NOT EXISTS nature_of_obligation text DEFAULT 'mandatory',
ADD COLUMN IF NOT EXISTS reviewed_by uuid,
ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS date_identified date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS recommendation text,
ADD COLUMN IF NOT EXISTS original_severity text,
ADD COLUMN IF NOT EXISTS severity_override_reason text,
ADD COLUMN IF NOT EXISTS severity_changed_by uuid,
ADD COLUMN IF NOT EXISTS severity_changed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS source_kyc_individual_id uuid,
ADD COLUMN IF NOT EXISTS source_kyc_business_id uuid,
ADD COLUMN IF NOT EXISTS source_reporting_sample_id uuid,
ADD COLUMN IF NOT EXISTS source_aml_finding_id uuid,
ADD COLUMN IF NOT EXISTS source_governance_response_id uuid,
ADD COLUMN IF NOT EXISTS is_consolidated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS consolidated_from_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS management_response text,
ADD COLUMN IF NOT EXISTS target_remediation_date date,
ADD COLUMN IF NOT EXISTS remediation_status text DEFAULT 'open';

-- Add foreign key references
ALTER TABLE public.findings
ADD CONSTRAINT findings_source_kyc_individual_id_fkey 
FOREIGN KEY (source_kyc_individual_id) REFERENCES kyc_individual_samples(id) ON DELETE SET NULL;

ALTER TABLE public.findings
ADD CONSTRAINT findings_source_kyc_business_id_fkey 
FOREIGN KEY (source_kyc_business_id) REFERENCES kyc_business_samples(id) ON DELETE SET NULL;

ALTER TABLE public.findings
ADD CONSTRAINT findings_source_reporting_sample_id_fkey 
FOREIGN KEY (source_reporting_sample_id) REFERENCES reporting_samples(id) ON DELETE SET NULL;

ALTER TABLE public.findings
ADD CONSTRAINT findings_source_aml_finding_id_fkey 
FOREIGN KEY (source_aml_finding_id) REFERENCES aml_program_findings(id) ON DELETE SET NULL;

ALTER TABLE public.findings
ADD CONSTRAINT findings_source_governance_response_id_fkey 
FOREIGN KEY (source_governance_response_id) REFERENCES governance_responses(id) ON DELETE SET NULL;

-- Create enum for nature of obligation if not exists
DO $$ BEGIN
  CREATE TYPE obligation_nature AS ENUM ('mandatory', 'reasonable_measures', 'best_practice');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for remediation status if not exists
DO $$ BEGIN
  CREATE TYPE remediation_status AS ENUM ('open', 'in_progress', 'remediated', 'accepted_risk', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;