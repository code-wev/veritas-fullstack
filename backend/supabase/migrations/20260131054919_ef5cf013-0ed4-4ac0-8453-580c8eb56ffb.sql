-- Add new enums (IF NOT EXISTS pattern)
DO $$ BEGIN
  CREATE TYPE reporting_type AS ENUM ('lctr', 'eftr', 'str', 'lvctr', 'lpepr');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE filing_method AS ENUM ('manual', 'batch');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE test_result_enum AS ENUM ('pass', 'fail', 'na', 'pending');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reporting_finding_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reporting_finding_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create reporting_reviews table if not exists
CREATE TABLE IF NOT EXISTS public.reporting_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft',
  review_period_start DATE,
  review_period_end DATE,
  reviewer_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(engagement_id)
);

-- Add new columns to existing reporting_samples table
ALTER TABLE public.reporting_samples 
  ADD COLUMN IF NOT EXISTS review_id UUID REFERENCES public.reporting_reviews(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS filing_method TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS report_reference_id TEXT,
  ADD COLUMN IF NOT EXISTS fintrac_submission_date DATE,
  ADD COLUMN IF NOT EXISTS transaction_date DATE,
  ADD COLUMN IF NOT EXISTS transaction_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS transaction_currency TEXT DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS is_aggregated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS aggregation_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS aggregation_period_end TIMESTAMPTZ,
  -- Completeness: Header section
  ADD COLUMN IF NOT EXISTS header_reporting_entity BOOLEAN,
  ADD COLUMN IF NOT EXISTS header_submission_timestamp BOOLEAN,
  ADD COLUMN IF NOT EXISTS header_report_reference BOOLEAN,
  ADD COLUMN IF NOT EXISTS header_complete TEXT DEFAULT 'pending',
  -- Completeness: Transaction section
  ADD COLUMN IF NOT EXISTS txn_amount BOOLEAN,
  ADD COLUMN IF NOT EXISTS txn_currency BOOLEAN,
  ADD COLUMN IF NOT EXISTS txn_date_time BOOLEAN,
  ADD COLUMN IF NOT EXISTS txn_aggregation_indicator BOOLEAN,
  ADD COLUMN IF NOT EXISTS txn_complete TEXT DEFAULT 'pending',
  -- Completeness: Client section
  ADD COLUMN IF NOT EXISTS client_name BOOLEAN,
  ADD COLUMN IF NOT EXISTS client_address BOOLEAN,
  ADD COLUMN IF NOT EXISTS client_dob BOOLEAN,
  ADD COLUMN IF NOT EXISTS client_occupation BOOLEAN,
  ADD COLUMN IF NOT EXISTS client_incorporation_info BOOLEAN,
  ADD COLUMN IF NOT EXISTS client_complete TEXT DEFAULT 'pending',
  -- Completeness: Beneficiary section
  ADD COLUMN IF NOT EXISTS beneficiary_name BOOLEAN,
  ADD COLUMN IF NOT EXISTS beneficiary_address BOOLEAN,
  ADD COLUMN IF NOT EXISTS beneficiary_account_wallet BOOLEAN,
  ADD COLUMN IF NOT EXISTS beneficiary_complete TEXT DEFAULT 'pending',
  -- Completeness: Third party
  ADD COLUMN IF NOT EXISTS third_party_indicator BOOLEAN,
  ADD COLUMN IF NOT EXISTS third_party_details BOOLEAN,
  ADD COLUMN IF NOT EXISTS third_party_complete TEXT DEFAULT 'pending',
  -- Special fields
  ADD COLUMN IF NOT EXISTS exchange_rate BOOLEAN,
  ADD COLUMN IF NOT EXISTS exchange_rate_source BOOLEAN,
  ADD COLUMN IF NOT EXISTS vc_identifiers BOOLEAN,
  ADD COLUMN IF NOT EXISTS str_narrative BOOLEAN,
  ADD COLUMN IF NOT EXISTS special_fields_complete TEXT DEFAULT 'pending',
  -- Accuracy
  ADD COLUMN IF NOT EXISTS accuracy_matches_ledger TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS accuracy_matches_kyc TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS accuracy_matches_system TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS accuracy_notes TEXT,
  ADD COLUMN IF NOT EXISTS accuracy_overall TEXT DEFAULT 'pending',
  -- Timeliness
  ADD COLUMN IF NOT EXISTS timeliness_transaction_date DATE,
  ADD COLUMN IF NOT EXISTS timeliness_filing_date DATE,
  ADD COLUMN IF NOT EXISTS timeliness_suspicion_date DATE,
  ADD COLUMN IF NOT EXISTS timeliness_days_to_file INTEGER,
  ADD COLUMN IF NOT EXISTS timeliness_notes TEXT,
  -- STR specific
  ADD COLUMN IF NOT EXISTS str_investigation_conducted BOOLEAN,
  ADD COLUMN IF NOT EXISTS str_suspicion_documented BOOLEAN,
  ADD COLUMN IF NOT EXISTS str_rationale_documented BOOLEAN,
  ADD COLUMN IF NOT EXISTS str_escalation_performed BOOLEAN,
  ADD COLUMN IF NOT EXISTS str_filed_promptly BOOLEAN,
  ADD COLUMN IF NOT EXISTS str_decision_notes TEXT,
  -- Overall results
  ADD COLUMN IF NOT EXISTS overall_result TEXT DEFAULT 'pending',
  -- Evidence
  ADD COLUMN IF NOT EXISTS evidence_file_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS parsed_json JSONB,
  ADD COLUMN IF NOT EXISTS manual_notes TEXT,
  ADD COLUMN IF NOT EXISTS deficiencies TEXT;

-- Create reporting_findings table
CREATE TABLE IF NOT EXISTS public.reporting_findings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID REFERENCES public.reporting_reviews(id) ON DELETE CASCADE,
  sample_id UUID REFERENCES public.reporting_samples(id) ON DELETE SET NULL,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  issue_category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  finding_title TEXT NOT NULL,
  finding_description TEXT,
  root_cause TEXT,
  recommendation TEXT,
  management_response TEXT,
  is_auto_generated BOOLEAN DEFAULT false,
  auto_flag_reason TEXT,
  evidence_file_ids UUID[] DEFAULT '{}',
  target_completion_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create reporting_governance table
CREATE TABLE IF NOT EXISTS public.reporting_governance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.reporting_reviews(id) ON DELETE CASCADE,
  -- Training
  training_program_exists BOOLEAN,
  training_covers_reporting_types BOOLEAN,
  training_evidence_ids UUID[] DEFAULT '{}',
  training_notes TEXT,
  -- Procedures
  procedures_documented BOOLEAN,
  procedures_cover_identification BOOLEAN,
  procedures_cover_escalation BOOLEAN,
  procedures_cover_filing BOOLEAN,
  procedures_evidence_ids UUID[] DEFAULT '{}',
  procedures_notes TEXT,
  -- QA/Monitoring
  qa_process_exists BOOLEAN,
  qa_frequency TEXT,
  qa_covers_completeness BOOLEAN,
  qa_covers_accuracy BOOLEAN,
  qa_covers_timeliness BOOLEAN,
  qa_evidence_ids UUID[] DEFAULT '{}',
  qa_notes TEXT,
  -- Escalation
  escalation_process_documented BOOLEAN,
  escalation_roles_defined BOOLEAN,
  escalation_timelines_defined BOOLEAN,
  escalation_evidence_ids UUID[] DEFAULT '{}',
  escalation_notes TEXT,
  -- Overall
  overall_assessment TEXT,
  summary_narrative TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(review_id)
);

-- Enable RLS on new tables
ALTER TABLE public.reporting_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporting_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporting_governance ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users with engagement access can manage reporting reviews"
  ON public.reporting_reviews FOR ALL
  USING (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can manage reporting findings"
  ON public.reporting_findings FOR ALL
  USING (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can manage reporting governance via review access"
  ON public.reporting_governance FOR ALL
  USING (EXISTS (
    SELECT 1 FROM reporting_reviews r
    WHERE r.id = reporting_governance.review_id
    AND has_engagement_access(auth.uid(), r.engagement_id)
  ));

-- Triggers for updated_at
CREATE OR REPLACE TRIGGER update_reporting_reviews_updated_at
  BEFORE UPDATE ON public.reporting_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_reporting_findings_updated_at
  BEFORE UPDATE ON public.reporting_findings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_reporting_governance_updated_at
  BEFORE UPDATE ON public.reporting_governance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();