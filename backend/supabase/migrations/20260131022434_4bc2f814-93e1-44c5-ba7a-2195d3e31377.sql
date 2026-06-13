-- AML Program Review Tables

-- Main AML Program Review record
CREATE TABLE public.aml_program_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'ready_for_review', 'approved', 'locked')),
  overall_assessment TEXT CHECK (overall_assessment IN ('effective', 'needs_improvement', 'ineffective')),
  summary_for_report TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(engagement_id)
);

-- Policies & Procedures Review (Step 1-5 data)
CREATE TABLE public.aml_pp_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_review_id UUID NOT NULL REFERENCES public.aml_program_reviews(id) ON DELETE CASCADE,
  -- Step 1: Document Intake
  policy_document_ids UUID[] DEFAULT '{}',
  document_names TEXT[] DEFAULT '{}',
  version_number TEXT,
  last_updated_date DATE,
  approval_evidence_ids UUID[] DEFAULT '{}',
  approval_present TEXT CHECK (approval_present IN ('yes', 'no', 'partial')),
  version_control_present TEXT CHECK (version_control_present IN ('yes', 'no', 'partial')),
  -- Step 3: Business Model Selection
  business_activities TEXT[] DEFAULT '{}',
  uses_agents_branches BOOLEAN DEFAULT false,
  deals_in_virtual_currency BOOLEAN DEFAULT false,
  offers_international_efts BOOLEAN DEFAULT false,
  account_based_relationships BOOLEAN DEFAULT false,
  -- Step 5: Summary
  overall_design_rating TEXT CHECK (overall_design_rating IN ('effective', 'needs_improvement', 'ineffective')),
  summary_narrative TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'ready_for_review', 'approved')),
  current_step INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(program_review_id)
);

-- Control Results for Step 2 and Step 3 checklists
CREATE TABLE public.aml_pp_control_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pp_review_id UUID NOT NULL REFERENCES public.aml_pp_reviews(id) ON DELETE CASCADE,
  control_area TEXT NOT NULL,
  control_category TEXT NOT NULL,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  response TEXT CHECK (response IN ('yes', 'no', 'partially', 'na')),
  deficiency_flag BOOLEAN DEFAULT false,
  severity_suggested TEXT CHECK (severity_suggested IN ('low', 'medium', 'high')),
  notes TEXT,
  doc_reference TEXT,
  evidence_file_ids UUID[] DEFAULT '{}',
  auto_flag_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pp_review_id, control_area, question_number)
);

-- AML Program Question Templates (for all submodules)
CREATE TABLE public.aml_program_question_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submodule TEXT NOT NULL,
  control_area TEXT NOT NULL,
  control_category TEXT NOT NULL,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  regulatory_reference TEXT,
  guidance TEXT,
  evidence_required BOOLEAN DEFAULT false,
  auto_flag_condition JSONB,
  is_conditional BOOLEAN DEFAULT false,
  condition_field TEXT,
  condition_value TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-generated findings from AML Program Review
CREATE TABLE public.aml_program_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pp_review_id UUID REFERENCES public.aml_pp_reviews(id) ON DELETE SET NULL,
  control_result_id UUID REFERENCES public.aml_pp_control_results(id) ON DELETE SET NULL,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  finding_title TEXT NOT NULL,
  finding_description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'remediated', 'accepted')),
  recommendation TEXT,
  management_response TEXT,
  is_auto_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.aml_program_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aml_pp_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aml_pp_control_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aml_program_question_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aml_program_findings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users with engagement access can manage program reviews"
ON public.aml_program_reviews FOR ALL
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users with engagement access can manage pp reviews"
ON public.aml_pp_reviews FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.aml_program_reviews pr
  WHERE pr.id = aml_pp_reviews.program_review_id
  AND public.has_engagement_access(auth.uid(), pr.engagement_id)
));

CREATE POLICY "Users with engagement access can manage control results"
ON public.aml_pp_control_results FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.aml_pp_reviews ppr
  JOIN public.aml_program_reviews pr ON pr.id = ppr.program_review_id
  WHERE ppr.id = aml_pp_control_results.pp_review_id
  AND public.has_engagement_access(auth.uid(), pr.engagement_id)
));

CREATE POLICY "All users can view question templates"
ON public.aml_program_question_templates FOR SELECT
USING (true);

CREATE POLICY "Admins can manage question templates"
ON public.aml_program_question_templates FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users with engagement access can manage program findings"
ON public.aml_program_findings FOR ALL
USING (public.has_engagement_access(auth.uid(), engagement_id));

-- Triggers for updated_at
CREATE TRIGGER update_aml_program_reviews_updated_at
  BEFORE UPDATE ON public.aml_program_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_aml_pp_reviews_updated_at
  BEFORE UPDATE ON public.aml_pp_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_aml_pp_control_results_updated_at
  BEFORE UPDATE ON public.aml_pp_control_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_aml_program_findings_updated_at
  BEFORE UPDATE ON public.aml_program_findings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed Question Templates for Policies & Procedures
INSERT INTO public.aml_program_question_templates (submodule, control_area, control_category, question_number, question_text, regulatory_reference, auto_flag_condition, evidence_required, sort_order) VALUES
-- Step 2: Core Control Checklist - A. Governance and Control Environment
('policies_procedures', 'core_controls', 'governance_environment', 1, 'Version control documented', 'PCMLTFR 71', NULL, true, 1),
('policies_procedures', 'core_controls', 'governance_environment', 2, 'Approved by senior management / Board', 'PCMLTFR 71(1)(a)', '{"trigger_on": "no", "flag_reason": "Core AML Program Design Deficiency - Missing approval"}', true, 2),
('policies_procedures', 'core_controls', 'governance_environment', 3, 'Reviewed and updated periodically and upon material changes', 'PCMLTFR 71', NULL, true, 3),
('policies_procedures', 'core_controls', 'governance_environment', 4, 'Tailored to business model and services offered', 'PCMLTFR 71', '{"trigger_on": "no", "flag_reason": "Core AML Program Design Deficiency - Not tailored to business"}', true, 4),
('policies_procedures', 'core_controls', 'governance_environment', 5, 'Roles and responsibilities defined (Board, senior mgmt, employees, compliance officer)', 'PCMLTFR 71', NULL, true, 5),
-- B. Compliance Program Elements
('policies_procedures', 'core_controls', 'program_elements', 6, 'Appointment of Compliance Officer documented', 'PCMLTFR 71(1)(a)', '{"trigger_on": "no", "flag_reason": "Core AML Program Design Deficiency - No CO appointment"}', true, 6),
('policies_procedures', 'core_controls', 'program_elements', 7, 'Written policies and procedures documented', 'PCMLTFR 71(1)(b)', '{"trigger_on": "no", "flag_reason": "Core AML Program Design Deficiency - No written P&P"}', true, 7),
('policies_procedures', 'core_controls', 'program_elements', 8, 'Risk assessment documented', 'PCMLTFR 71(1)(c)', '{"trigger_on": "no", "flag_reason": "Core AML Program Design Deficiency - No risk assessment"}', true, 8),
('policies_procedures', 'core_controls', 'program_elements', 9, 'Ongoing training program documented', 'PCMLTFR 71(1)(d)', '{"trigger_on": "no", "flag_reason": "Core AML Program Design Deficiency - No training program"}', true, 9),
('policies_procedures', 'core_controls', 'program_elements', 10, 'Biennial effectiveness review documented', 'PCMLTFR 71(1)(e)', '{"trigger_on": "no", "flag_reason": "Core AML Program Design Deficiency - No effectiveness review"}', true, 10),
-- C. High-Level Control Coverage
('policies_procedures', 'core_controls', 'control_coverage', 11, 'Client identification and verification documented', 'PCMLTFR 64-67', '{"trigger_on": "no", "flag_reason": "Core AML Program Design Deficiency - No client ID procedures"}', true, 11),
('policies_procedures', 'core_controls', 'control_coverage', 12, 'Beneficial ownership documented', 'PCMLTFR 67', NULL, true, 12),
('policies_procedures', 'core_controls', 'control_coverage', 13, 'Third party determination documented', 'PCMLTFR 68', NULL, true, 13),
('policies_procedures', 'core_controls', 'control_coverage', 14, 'Ongoing monitoring documented', 'PCMLTFR 71', NULL, true, 14),
('policies_procedures', 'core_controls', 'control_coverage', 15, 'Recordkeeping and retention documented (5 years)', 'PCMLTFR 69-70', '{"trigger_on": "no", "flag_reason": "Core AML Program Design Deficiency - No recordkeeping procedures"}', true, 15),
('policies_procedures', 'core_controls', 'control_coverage', 16, 'Suspicious transaction identification and reporting documented', 'PCMLTFA 7', '{"trigger_on": "no", "flag_reason": "Core AML Program Design Deficiency - No STR procedures"}', true, 16),
('policies_procedures', 'core_controls', 'control_coverage', 17, 'LCTR policy documented (if applicable)', 'PCMLTFR 12', NULL, false, 17),
('policies_procedures', 'core_controls', 'control_coverage', 18, 'EFTR policy documented (if applicable)', 'PCMLTFR 12', NULL, false, 18),
('policies_procedures', 'core_controls', 'control_coverage', 19, 'Terrorist property / sanctions obligations documented', 'PCMLTFA 7.1', NULL, true, 19),
('policies_procedures', 'core_controls', 'control_coverage', 20, 'Escalation and exception handling documented', 'Best Practice', NULL, false, 20),
-- Step 3: Topic Coverage - Regulatory References
('policies_procedures', 'topic_regulatory', 'regulatory_references', 1, 'PCMLTFA referenced', NULL, NULL, false, 21),
('policies_procedures', 'topic_regulatory', 'regulatory_references', 2, 'PCMLTFR referenced', NULL, NULL, false, 22),
('policies_procedures', 'topic_regulatory', 'regulatory_references', 3, 'FINTRAC guidance referenced', NULL, '{"trigger_on": "no", "flag_reason": "Incomplete Regulatory Framework Reference"}', false, 23),
('policies_procedures', 'topic_regulatory', 'regulatory_references', 4, 'Sanctions regimes referenced', NULL, '{"trigger_on": "no", "flag_reason": "Sanctions Reference Gap"}', false, 24),
-- KYC and Verification
('policies_procedures', 'topic_kyc', 'kyc_verification', 1, 'When identity verification is required documented', 'PCMLTFR 64-67', NULL, false, 25),
('policies_procedures', 'topic_kyc', 'kyc_verification', 2, 'Methods used documented', 'PCMLTFR 64-67', NULL, false, 26),
('policies_procedures', 'topic_kyc', 'kyc_verification', 3, 'Recordkeeping for IDV documented', 'PCMLTFR 69-70', '{"trigger_on": "no", "flag_reason": "KYC Recordkeeping Policy Gap"}', false, 27),
('policies_procedures', 'topic_kyc', 'kyc_verification', 4, 'Business relationship definition documented', 'PCMLTFR 1', NULL, false, 28),
('policies_procedures', 'topic_kyc', 'kyc_verification', 5, 'Client info updates based on risk documented', 'PCMLTFR 71', NULL, false, 29),
-- Beneficial Ownership and Third Party
('policies_procedures', 'topic_bo', 'beneficial_ownership', 1, 'BO threshold and procedures documented', 'PCMLTFR 67', '{"trigger_on": "no", "flag_reason": "Beneficial Ownership Policy Gap"}', false, 30),
('policies_procedures', 'topic_bo', 'beneficial_ownership', 2, 'BO recordkeeping documented', 'PCMLTFR 69-70', NULL, false, 31),
('policies_procedures', 'topic_bo', 'beneficial_ownership', 3, 'Third party determination documented', 'PCMLTFR 68', NULL, false, 32),
-- Reporting Requirements
('policies_procedures', 'topic_reporting', 'reporting_requirements', 1, 'LCTR documented (if cash services)', 'PCMLTFR 12', NULL, false, 33),
('policies_procedures', 'topic_reporting', 'reporting_requirements', 2, 'EFTR documented (if international EFT)', 'PCMLTFR 12', NULL, false, 34),
('policies_procedures', 'topic_reporting', 'reporting_requirements', 3, 'STR and attempted STR documented', 'PCMLTFA 7', '{"trigger_on": "no", "flag_reason": "STR Policy Gap"}', false, 35),
('policies_procedures', 'topic_reporting', 'reporting_requirements', 4, 'Timelines documented', 'PCMLTFR 12', NULL, false, 36),
-- Sanctions and Terrorist Property
('policies_procedures', 'topic_sanctions', 'sanctions_terrorist', 1, 'Sanctions screening policy exists', 'UN Act, SEMA', '{"trigger_on": "no", "flag_reason": "Sanctions Screening Policy Gap"}', false, 37),
('policies_procedures', 'topic_sanctions', 'sanctions_terrorist', 2, 'Terrorist property reporting exists', 'PCMLTFA 7.1', NULL, false, 38),
('policies_procedures', 'topic_sanctions', 'sanctions_terrorist', 3, 'Sanctions evasion reporting incorporated', 'PCMLTFA 7.1', '{"trigger_on": "no", "flag_reason": "Sanctions Evasion Update Gap"}', false, 39),
-- Ongoing Monitoring and EDD
('policies_procedures', 'topic_monitoring', 'ongoing_monitoring', 1, 'Risk rating methodology documented', 'PCMLTFR 71(1)(c)', NULL, false, 40),
('policies_procedures', 'topic_monitoring', 'ongoing_monitoring', 2, 'EDD measures documented', 'PCMLTFR 71', NULL, false, 41),
('policies_procedures', 'topic_monitoring', 'ongoing_monitoring', 3, 'Ongoing monitoring documented', 'PCMLTFR 71', '{"trigger_on": "no", "flag_reason": "Ongoing Monitoring Policy Gap"}', false, 42),
('policies_procedures', 'topic_monitoring', 'ongoing_monitoring', 4, 'Escalation documented', 'Best Practice', NULL, false, 43),
-- Agents and Third Parties
('policies_procedures', 'topic_agents', 'agents_third_parties', 1, 'Written agreement requirement documented', 'PCMLTFR 56', '{"trigger_on": "no", "flag_reason": "Agent Agreement Policy Gap"}', false, 44),
('policies_procedures', 'topic_agents', 'agents_third_parties', 2, 'Agent due diligence documented', 'PCMLTFR 56', NULL, false, 45),
('policies_procedures', 'topic_agents', 'agents_third_parties', 3, 'Agent monitoring documented', 'PCMLTFR 56', NULL, false, 46),
('policies_procedures', 'topic_agents', 'agents_third_parties', 4, 'Agent termination documented', 'PCMLTFR 56', NULL, false, 47),
-- Ministerial Directives
('policies_procedures', 'topic_ministerial', 'ministerial_directives', 1, 'Ministerial directives awareness and handling documented', 'PCMLTFA 11.42-11.43', NULL, false, 48),
('policies_procedures', 'topic_ministerial', 'ministerial_directives', 2, 'Production orders and law enforcement requests documented', 'PCMLTFA 62-63', NULL, false, 49),
('policies_procedures', 'topic_ministerial', 'ministerial_directives', 3, 'Tipping off restrictions documented', 'PCMLTFA 8', NULL, false, 50);