-- Create enums for KYC module
DO $$ BEGIN
  CREATE TYPE risk_rating AS ENUM ('low', 'medium', 'high');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TYPE kyc_sample_source AS ENUM ('transaction', 'customer', 'mixed');
CREATE TYPE kyc_identification_method AS ENUM ('government_id', 'credit_file', 'dual_process', 'affiliate', 'other');
CREATE TYPE kyc_triggered_obligation AS ENUM ('onboarding', 'transaction', 'lctr', 'eft', 'vc_transaction', 'remittance');
CREATE TYPE kyc_issue_severity AS ENUM ('high', 'medium', 'low');
CREATE TYPE kyc_issue_status AS ENUM ('open', 'in_progress', 'closed');

-- Main KYC Review record (one per engagement)
CREATE TABLE kyc_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
  review_period_start DATE,
  review_period_end DATE,
  reviewer_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed')),
  
  -- Sampling configuration
  individual_sample_source kyc_sample_source,
  individual_selection_rationale TEXT,
  individual_population_size INTEGER,
  individual_sample_size INTEGER,
  
  business_sample_source kyc_sample_source,
  business_selection_rationale TEXT,
  business_population_size INTEGER,
  business_sample_size INTEGER,
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(engagement_id)
);

-- Individual KYC Samples
CREATE TABLE kyc_individual_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES kyc_reviews(id) ON DELETE CASCADE,
  
  -- Core identification
  customer_id TEXT,
  customer_name TEXT,
  onboarding_date DATE,
  risk_rating risk_rating NOT NULL DEFAULT 'low',
  triggered_obligation kyc_triggered_obligation,
  identification_method kyc_identification_method,
  evidence_type TEXT, -- 'report', 'excel', 'both'
  
  -- Mandatory fields (auto-pass/fail)
  name_present BOOLEAN,
  dob_present BOOLEAN,
  address_present BOOLEAN,
  occupation_present BOOLEAN,
  occupation_required BOOLEAN DEFAULT false, -- if transaction >= $1000
  id_verified BOOLEAN,
  id_contains_required_attributes BOOLEAN,
  pep_hio_determination_completed BOOLEAN,
  third_party_determination_made BOOLEAN,
  record_retention_evidenced BOOLEAN,
  
  -- Reasonable measures (contextual)
  source_of_funds_documented BOOLEAN,
  source_of_wealth_documented BOOLEAN,
  enhanced_monitoring_evidenced BOOLEAN,
  senior_management_review_completed BOOLEAN,
  senior_management_review_within_30_days BOOLEAN,
  
  -- Test results
  mandatory_test_result TEXT CHECK (mandatory_test_result IN ('pass', 'fail', 'pending')),
  reasonable_measures_result TEXT CHECK (reasonable_measures_result IN ('pass', 'fail', 'partial', 'n/a', 'pending')),
  overall_result TEXT CHECK (overall_result IN ('pass', 'fail', 'partial', 'pending')),
  
  deficiencies TEXT,
  notes TEXT,
  evidence_file_ids UUID[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Business/Entity KYC Samples
CREATE TABLE kyc_business_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES kyc_reviews(id) ON DELETE CASCADE,
  
  -- Core identification
  customer_id TEXT,
  business_name TEXT,
  onboarding_date DATE,
  risk_rating risk_rating NOT NULL DEFAULT 'low',
  triggered_obligation kyc_triggered_obligation,
  evidence_type TEXT,
  
  -- Mandatory business identity fields
  legal_name_present BOOLEAN,
  address_present BOOLEAN,
  nature_of_business_documented BOOLEAN,
  incorporation_number_present BOOLEAN,
  jurisdiction_documented BOOLEAN,
  directors_list_obtained BOOLEAN,
  
  -- Beneficial ownership (mandatory)
  bo_25_percent_identified BOOLEAN,
  bo_natural_persons_identified BOOLEAN,
  bo_identity_verified BOOLEAN,
  smo_identified_if_bo_unknown BOOLEAN,
  bo_pep_hio_determination_completed BOOLEAN,
  
  -- Third-party and control
  third_party_determination_made BOOLEAN,
  relationship_documented BOOLEAN,
  supporting_evidence_available BOOLEAN,
  
  -- Record retention
  record_retention_evidenced BOOLEAN,
  
  -- Reasonable measures for high-risk
  source_of_funds_documented BOOLEAN,
  source_of_wealth_documented BOOLEAN,
  enhanced_monitoring_evidenced BOOLEAN,
  senior_management_review_completed BOOLEAN,
  
  -- Test results
  mandatory_test_result TEXT CHECK (mandatory_test_result IN ('pass', 'fail', 'pending')),
  bo_test_result TEXT CHECK (bo_test_result IN ('pass', 'fail', 'pending')),
  reasonable_measures_result TEXT CHECK (reasonable_measures_result IN ('pass', 'fail', 'partial', 'n/a', 'pending')),
  overall_result TEXT CHECK (overall_result IN ('pass', 'fail', 'partial', 'pending')),
  
  deficiencies TEXT,
  notes TEXT,
  evidence_file_ids UUID[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Beneficial Owners (linked to business samples)
CREATE TABLE kyc_beneficial_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_sample_id UUID NOT NULL REFERENCES kyc_business_samples(id) ON DELETE CASCADE,
  
  owner_name TEXT,
  ownership_percentage DECIMAL(5,2),
  is_natural_person BOOLEAN DEFAULT true,
  identity_verified BOOLEAN,
  verification_method kyc_identification_method,
  is_pep BOOLEAN,
  is_hio BOOLEAN,
  pep_hio_determination_date DATE,
  
  notes TEXT,
  evidence_file_ids UUID[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transaction-Triggered KYC Samples
CREATE TABLE kyc_transaction_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES kyc_reviews(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_id TEXT,
  transaction_date DATE,
  transaction_type TEXT CHECK (transaction_type IN ('vc_transaction', 'eft', 'remittance', 'non_eft_transmission', 'lctr', 'other')),
  transaction_amount DECIMAL(15,2),
  currency TEXT DEFAULT 'CAD',
  
  -- Linked client
  linked_customer_id TEXT,
  linked_customer_name TEXT,
  customer_risk_rating risk_rating,
  
  -- Triggered obligations based on type/amount
  occupation_required BOOLEAN DEFAULT false,
  occupation_obtained BOOLEAN,
  third_party_required BOOLEAN DEFAULT false,
  third_party_documented BOOLEAN,
  
  -- Record requirements
  eft_record_complete BOOLEAN,
  vc_record_complete BOOLEAN,
  lctr_record_complete BOOLEAN,
  
  -- KYC linkage
  kyc_file_linked BOOLEAN,
  kyc_file_current BOOLEAN,
  
  -- Test results
  test_result TEXT CHECK (test_result IN ('pass', 'fail', 'partial', 'pending')),
  deficiencies TEXT,
  notes TEXT,
  evidence_file_ids UUID[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- KYC Issues/Findings
CREATE TABLE kyc_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES kyc_reviews(id) ON DELETE CASCADE,
  
  -- Source reference
  individual_sample_id UUID REFERENCES kyc_individual_samples(id) ON DELETE SET NULL,
  business_sample_id UUID REFERENCES kyc_business_samples(id) ON DELETE SET NULL,
  transaction_sample_id UUID REFERENCES kyc_transaction_samples(id) ON DELETE SET NULL,
  
  issue_category TEXT NOT NULL CHECK (issue_category IN ('mandatory', 'reasonable_measures', 'bo_verification', 'transaction_records', 'other')),
  issue_title TEXT NOT NULL,
  issue_description TEXT,
  
  severity kyc_issue_severity NOT NULL DEFAULT 'medium',
  status kyc_issue_status NOT NULL DEFAULT 'open',
  
  is_auto_generated BOOLEAN DEFAULT false,
  auto_flag_reason TEXT,
  
  recommendation TEXT,
  management_response TEXT,
  target_completion_date DATE,
  
  evidence_file_ids UUID[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE kyc_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_individual_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_business_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_beneficial_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_transaction_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_issues ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users with engagement access can manage kyc reviews"
  ON kyc_reviews FOR ALL
  USING (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can manage individual samples via review access"
  ON kyc_individual_samples FOR ALL
  USING (EXISTS (
    SELECT 1 FROM kyc_reviews r
    WHERE r.id = kyc_individual_samples.review_id
    AND has_engagement_access(auth.uid(), r.engagement_id)
  ));

CREATE POLICY "Users can manage business samples via review access"
  ON kyc_business_samples FOR ALL
  USING (EXISTS (
    SELECT 1 FROM kyc_reviews r
    WHERE r.id = kyc_business_samples.review_id
    AND has_engagement_access(auth.uid(), r.engagement_id)
  ));

CREATE POLICY "Users can manage beneficial owners via business sample access"
  ON kyc_beneficial_owners FOR ALL
  USING (EXISTS (
    SELECT 1 FROM kyc_business_samples bs
    JOIN kyc_reviews r ON r.id = bs.review_id
    WHERE bs.id = kyc_beneficial_owners.business_sample_id
    AND has_engagement_access(auth.uid(), r.engagement_id)
  ));

CREATE POLICY "Users can manage transaction samples via review access"
  ON kyc_transaction_samples FOR ALL
  USING (EXISTS (
    SELECT 1 FROM kyc_reviews r
    WHERE r.id = kyc_transaction_samples.review_id
    AND has_engagement_access(auth.uid(), r.engagement_id)
  ));

CREATE POLICY "Users can manage kyc issues via review access"
  ON kyc_issues FOR ALL
  USING (EXISTS (
    SELECT 1 FROM kyc_reviews r
    WHERE r.id = kyc_issues.review_id
    AND has_engagement_access(auth.uid(), r.engagement_id)
  ));

-- Triggers for updated_at
CREATE TRIGGER update_kyc_reviews_updated_at
  BEFORE UPDATE ON kyc_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kyc_individual_samples_updated_at
  BEFORE UPDATE ON kyc_individual_samples
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kyc_business_samples_updated_at
  BEFORE UPDATE ON kyc_business_samples
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kyc_beneficial_owners_updated_at
  BEFORE UPDATE ON kyc_beneficial_owners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kyc_transaction_samples_updated_at
  BEFORE UPDATE ON kyc_transaction_samples
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kyc_issues_updated_at
  BEFORE UPDATE ON kyc_issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();