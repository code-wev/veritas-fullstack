
-- Create the public.rba_review_type enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE public.rba_review_type AS ENUM ('baseline', 'intermediate', 'advanced');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create the public.risk_assessment_reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.risk_assessment_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  review_period_start date,
  review_period_end date,
  reviewer_name text,
  review_type public.rba_review_type DEFAULT 'baseline',
  rba_exists boolean,
  rba_retrievable text,
  approval_evidence_available text,
  approved_by_senior_mgmt text,
  version_number text,
  date_prepared date,
  date_last_updated date,
  version_control_maintained text,
  document_titles text,
  weights_explained text,
  scoring_reproducible text,
  uses_scoring_model text,
  updated_within_12_months text,
  ratings_documented_rationale text,
  defines_ml_tf_risk text,
  distinguishes_inherent_residual text,
  defines_likelihood_assessment text,
  defines_impact_assessment text,
  likelihood_impact_matrix text,
  risk_tolerance_statement text,
  risk_tolerance_approved text,
  risk_acceptance_process text,
  overall_assessment text,
  summary_for_report text,
  lock_state text NOT NULL DEFAULT 'draft',
  unlock_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(engagement_id)
);

-- Add document intake + step tracking fields to risk_assessment_reviews
ALTER TABLE public.risk_assessment_reviews
  ADD COLUMN IF NOT EXISTS current_step integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS rba_document_name text,
  ADD COLUMN IF NOT EXISTS rba_version text,
  ADD COLUMN IF NOT EXISTS rba_date_approved date,
  ADD COLUMN IF NOT EXISTS rba_approved_by text,
  ADD COLUMN IF NOT EXISTS rba_document_file_ids text[];

-- Question templates (library)
CREATE TABLE IF NOT EXISTS public.risk_assessment_question_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_code text NOT NULL,
  section_name text NOT NULL,
  control_area text NOT NULL,
  control_objective text NOT NULL,
  test_procedure text,
  expected_outcome text,
  max_points integer NOT NULL DEFAULT 2,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.risk_assessment_question_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates are readable by authenticated users"
  ON public.risk_assessment_question_templates
  FOR SELECT TO authenticated USING (true);

-- Control results (per-review responses)
CREATE TABLE IF NOT EXISTS public.risk_assessment_control_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.risk_assessment_reviews(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.risk_assessment_question_templates(id) ON DELETE SET NULL,
  section_code text NOT NULL,
  section_name text NOT NULL,
  control_area text NOT NULL,
  control_objective text NOT NULL,
  test_procedure text,
  expected_outcome text,
  response text,
  risk_rating text,
  points_achieved integer DEFAULT 0,
  max_points integer NOT NULL DEFAULT 2,
  comments text,
  observation_best_practice text,
  evidence_reviewed text,
  evidence_file_ids text[],
  deficiency_flag boolean DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(review_id, template_id)
);

ALTER TABLE public.risk_assessment_control_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with engagement access can view results"
  ON public.risk_assessment_control_results FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.risk_assessment_reviews r
    WHERE r.id = risk_assessment_control_results.review_id
      AND public.has_engagement_access(auth.uid(), r.engagement_id)
  ));

CREATE POLICY "Users with engagement access can insert results"
  ON public.risk_assessment_control_results FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.risk_assessment_reviews r
    WHERE r.id = risk_assessment_control_results.review_id
      AND public.has_engagement_access(auth.uid(), r.engagement_id)
  ));

CREATE POLICY "Users with engagement access can update results"
  ON public.risk_assessment_control_results FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.risk_assessment_reviews r
    WHERE r.id = risk_assessment_control_results.review_id
      AND public.has_engagement_access(auth.uid(), r.engagement_id)
  ));

CREATE POLICY "Users with engagement access can delete results"
  ON public.risk_assessment_control_results FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.risk_assessment_reviews r
    WHERE r.id = risk_assessment_control_results.review_id
      AND public.has_engagement_access(auth.uid(), r.engagement_id)
  ));

CREATE TRIGGER update_ra_control_results_updated_at
  BEFORE UPDATE ON public.risk_assessment_control_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_ra_control_results_review ON public.risk_assessment_control_results(review_id);
CREATE INDEX IF NOT EXISTS idx_ra_templates_section ON public.risk_assessment_question_templates(section_code, sort_order);

-- Seed the 14-section checklist
INSERT INTO public.risk_assessment_question_templates
  (section_code, section_name, control_area, control_objective, test_procedure, expected_outcome, sort_order) VALUES
-- 1. FRAMEWORK
('FRM', 'Framework', 'Risk Assessment Existence', 'Confirm client has a documented AML/ATF risk assessment', 'Review policy, methodology document, risk register, or spreadsheet used by client', 'Risk assessment is documented, current, and available for review', 10),
('FRM', 'Framework', 'Approval & Governance', 'Confirm the risk assessment is approved by appropriate governance', 'Review approval evidence and version history', 'Document shows approval/ownership by senior management or equivalent governance', 20),
('FRM', 'Framework', 'Coverage of Core Risk Areas', 'Confirm assessment covers client/business type, products & services, delivery channels, geography, new technologies, affiliates, and other relevant factors', 'Review scope and contents of the risk assessment', 'Includes products, services, delivery channels, geography, new technologies, affiliates, and other relevant factors', 30),
('FRM', 'Framework', 'Risk Reflects Business Reality', 'Confirm risk is defined and its assessment reflects actual operations', 'Compare risk assessment to actual business activities', 'Assessment aligns with real business model, clients, and exposure', 40),
('FRM', 'Framework', 'Methodology Defined', 'Confirm methodology and rating approach are documented', 'Review scoring guide, criteria definitions, and methodology notes', 'Low/Medium/High or scoring methodology is clearly defined and usable', 50),
('FRM', 'Framework', 'Review Frequency', 'Confirm periodic and event-driven review requirements are defined', 'Review update cycle and triggers for refresh', 'Assessment is updated on a set schedule and when material changes occur', 60),

-- 2. METHODOLOGY
('MTH', 'Methodology', 'Inherent vs Residual Risk', 'Confirm distinction between inherent and residual risk is made', 'Review inherent vs residual risk treatment', 'Inherent and residual risk are separately defined and applied', 70),
('MTH', 'Methodology', 'Granularity of Risk Factors', 'Confirm risk factors are specific rather than overly generic', 'Review factor definitions and rating criteria', 'Risk factors are granular enough to identify higher-risk exposure', 80),
('MTH', 'Methodology', 'Risk Rating Criteria', 'Confirm criteria for Low/Medium/High are defined', 'Review methodology tab or narrative', 'Criteria for each rating are documented and consistently usable', 90),
('MTH', 'Methodology', 'Risk-Control Linkage', 'Confirm mitigating controls are tied to specific risks', 'Review risk entries against stated controls', 'Controls are linked to identified risks and influence residual risk', 100),
('MTH', 'Methodology', 'Rationale for Ratings', 'Confirm rationale supports assigned ratings', 'Review narrative notes, comments, or justification fields', 'Ratings include clear rationale and are not arbitrary', 110),

-- 3. RISK TOLERANCE
('TOL', 'Risk Tolerance', 'Risk Tolerance Defined', 'Confirm risk tolerance is defined and documented', 'Review risk tolerance statements or governance documents', 'Risk tolerance is defined and approved by senior management', 120),
('TOL', 'Risk Tolerance', 'Risk Tolerance Applied', 'Confirm tolerance influences residual risk', 'Compare tolerance to final risk ratings', 'Residual risk aligns with defined risk tolerance', 130),

-- 4. CUSTOMER RISK
('CUS', 'Customer Risk', 'High-Risk Customer Types', 'Confirm high-risk customer categories are identified', 'Review customer-risk criteria and examples', 'Includes PEPs/HIOs, non-residents, cash-intensive businesses, complex ownership, STR/LPEPR filed, adverse media, high-risk sectors', 140),
('CUS', 'Customer Risk', 'Business Relationships', 'Confirm assessment considers business relationship risk', 'Review differentiation between ongoing and occasional clients', 'Business relationship characteristics are considered', 150),
('CUS', 'Customer Risk', 'Beneficial Ownership Complexity', 'Confirm complex ownership structures are considered', 'Review entity/customer risk criteria', 'Opaque or complex ownership structures increase risk', 160),

-- 5. PRODUCTS & SERVICES
('PRD', 'Products & Services', 'Product/Service Inventory', 'Confirm all relevant products and services are included', 'Compare assessed products to actual operations', 'All active products/services are captured', 170),
('PRD', 'Products & Services', 'High-Risk Product Features', 'Confirm higher-risk features are considered', 'Review product criteria (cash, VC, remittance, anonymity, speed, volume, cross-border)', 'Methodology identifies features that elevate ML/TF risk', 180),
('PRD', 'Products & Services', 'High-Risk Product Types', 'Confirm inherently higher-risk products are identified', 'Check inclusion of EFTs, prepaid cards, mobile payments, intermediaries', 'High-risk products are explicitly recognized and assessed', 190),

-- 6. GEOGRAPHY
('GEO', 'Geography', 'Jurisdiction Risk', 'Confirm geographic risk considers high-risk jurisdictions', 'Review country risk criteria and lists referenced', 'Includes FATF, SEMA, UN, and other relevant sources', 200),
('GEO', 'Geography', 'Domestic vs Cross-Border Exposure', 'Confirm cross-border activity is assessed', 'Review geographic criteria and business profile', 'Cross-border corridors and foreign exposure are separately considered', 210),
('GEO', 'Geography', 'Geographic Risk Drivers', 'Confirm broader geographic risks are considered', 'Review local risk factors (crime, borders, patterns, events)', 'Assessment considers environmental and situational risk factors', 220),
('GEO', 'Geography', 'International Risk Sources Used', 'Confirm credible international sources are used to assess jurisdiction risk', 'Review references and supporting documentation', 'References FATF high-risk jurisdictions, SEMA/UN sanctions, FINTRAC NIRA and advisories', 230),
('GEO', 'Geography', 'FATF High-Risk Jurisdictions', 'Confirm FATF listings are considered in geographic risk rating', 'Review whether FATF high-risk and grey list countries are incorporated', 'FATF high-risk and monitored jurisdictions are explicitly considered', 240),
('GEO', 'Geography', 'Sanctions & Restricted Jurisdictions', 'Confirm use of sanctions lists in risk assessment', 'Review inclusion of SEMA, UN sanctions', 'Countries subject to sanctions are identified and treated as high risk', 250),
('GEO', 'Geography', 'Domestic Risk Sources', 'Confirm local Canadian risk factors are considered', 'Review use of crime statistics, law enforcement publications, or internal data', 'Domestic risk considers crime trends, high-risk regions, or business exposure within Canada', 260),

-- 7. DELIVERY CHANNELS
('DLV', 'Delivery Channels', 'Face-to-Face Risk (In Person)', 'Confirm in-person onboarding/service delivery risk is assessed', 'Review channel criteria', 'Face-to-face (brick and mortar) channels are specifically considered', 270),
('DLV', 'Delivery Channels', 'Non-Face-to-Face Risk', 'Confirm non-face-to-face onboarding/service delivery risk is assessed', 'Review channel criteria', 'Non-face-to-face or digital channels are specifically considered', 280),
('DLV', 'Delivery Channels', 'Agents / Intermediaries / Third Parties', 'Confirm use of agents or reliance arrangements is assessed', 'Review channel methodology and business model', 'Third-party delivery or onboarding channels are assessed', 290),

-- 8. TECHNOLOGY & NEW DEVELOPMENTS
('TEC', 'Technology & New Developments', 'New Technology Risk', 'Confirm risks from new technologies are assessed', 'Review use of e-wallets, onboarding tools, digital platforms', 'Technology-related risks are identified and assessed', 300),
('TEC', 'Technology & New Developments', 'Communication & Identification Methods', 'Confirm evolving communication methods are considered', 'Review use of email, chat, remote onboarding tools', 'Non-traditional channels are assessed for ML/TF risk', 310),
('TEC', 'Technology & New Developments', 'Business Changes / Developments', 'Confirm new developments are incorporated', 'Review acquisitions, restructuring, new products, new owners', 'Assessment reflects evolving business model', 320),

-- 9. AFFILIATES & THIRD PARTIES
('AFF', 'Affiliates & Third Parties', 'Affiliate Risk', 'Confirm affiliate exposure is assessed', 'Review structure and operations of affiliates', 'Foreign and domestic affiliates are assessed for risk impact', 330),
('AFF', 'Affiliates & Third Parties', 'Third-Party / Service Provider Risk', 'Confirm outsourcing risk is assessed', 'Review reliance on third parties', 'Business remains accountable for third-party compliance', 340),

-- 10. INDICATORS, TYPOLOGIES & THREATS
('IND', 'Indicators, Typologies & Threats', 'Typologies Considered', 'Confirm ML/TF typologies are considered', 'Review inclusion of FATF or industry trends', 'Relevant ML/TF methods and trends are included', 350),
('IND', 'Indicators, Typologies & Threats', 'Threat Environment', 'Confirm threats (crime, terrorism, corruption) are considered', 'Review use of public data and reports', 'Threat actors and patterns are considered', 360),
('IND', 'Indicators, Typologies & Threats', 'Regulatory & External Factors', 'Confirm external drivers are considered', 'Review inclusion of sanctions, directives, national risk assessment', 'Includes SEMA, ministerial directives, national risk assessment', 370),

-- 11. CONTROLS & RESIDUAL RISK
('CTR', 'Controls & Residual Risk', 'Controls Implemented', 'Confirm controls are not just documented but applied', 'Verify evidence of implementation', 'Controls are operational and effective', 380),
('CTR', 'Controls & Residual Risk', 'Residual Risk Logic', 'Confirm residual risk reflects control effectiveness', 'Compare inherent vs residual ratings', 'Residual risk is adjusted and not a copy of inherent', 390),
('CTR', 'Controls & Residual Risk', 'Enhanced Due Diligence Triggering', 'Confirm high risk leads to enhanced measures', 'Review methodology and procedures', 'High-risk factors trigger EDD, monitoring, and escalation', 400),

-- 12. MONITORING & IMPLEMENTATION
('MON', 'Monitoring & Implementation', 'Ongoing Monitoring Linkage', 'Confirm risk assessment drives monitoring', 'Review linkage to monitoring rules and frequency', 'Monitoring intensity aligns with risk', 410),
('MON', 'Monitoring & Implementation', 'Use in Operations', 'Confirm risk assessment is actually used', 'Review onboarding, monitoring, training linkage', 'Assessment informs operational controls', 420),

-- 13. REVIEW & EFFECTIVENESS
('EFF', 'Review & Effectiveness', 'Consistency with Business Reality', 'Confirm assessment reflects actual business operations', 'Compare with real data and operations', 'Fully aligned with business activities', 430),
('EFF', 'Review & Effectiveness', 'Emerging / Evolving Risk', 'Confirm ability to capture new risks', 'Review updates for new products, geographies, typologies', 'Assessment is dynamic and updated', 440),
('EFF', 'Review & Effectiveness', 'Overall Conclusion', 'Conclude whether assessment aligns with FINTRAC expectations', 'Summarize completeness and effectiveness', 'Conclusion supported by testing and evidence', 450)
ON CONFLICT DO NOTHING;
