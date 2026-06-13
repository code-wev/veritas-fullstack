-- Create audit reports table
CREATE TABLE public.audit_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  
  -- Report metadata
  report_type TEXT NOT NULL DEFAULT 'aml_effectiveness_review',
  status TEXT NOT NULL DEFAULT 'draft',
  
  -- Cover page info
  report_title TEXT DEFAULT 'AML/ATF COMPLIANCE REVIEW & EFFECTIVENESS TESTING: A REPORT',
  draft_report_date DATE,
  final_report_date DATE,
  
  -- Prepared for
  prepared_for_name TEXT,
  prepared_for_title TEXT,
  prepared_for_company TEXT,
  prepared_for_address TEXT,
  
  -- Prepared by
  prepared_by_company TEXT,
  prepared_by_address TEXT,
  prepared_by_contact TEXT,
  lead_reviewer_name TEXT,
  lead_reviewer_credentials TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  
  CONSTRAINT audit_reports_engagement_unique UNIQUE (engagement_id)
);

-- Create audit report sections table
CREATE TABLE public.audit_report_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.audit_reports(id) ON DELETE CASCADE,
  
  -- Section identification
  section_key TEXT NOT NULL, -- e.g., 'restrictions', 'scope', 'about_entity', etc.
  section_title TEXT NOT NULL,
  section_order INTEGER NOT NULL DEFAULT 0,
  
  -- Content
  content TEXT, -- Rich text/markdown content
  is_editable BOOLEAN NOT NULL DEFAULT true,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  
  -- For findings sections - which module this section covers
  source_module TEXT, -- e.g., 'msb_registration', 'governance', 'kyc', 'reporting'
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT audit_report_sections_unique UNIQUE (report_id, section_key)
);

-- Create audit report findings summary table (for the summary table)
CREATE TABLE public.audit_report_findings_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.audit_reports(id) ON DELETE CASCADE,
  finding_id UUID REFERENCES public.findings(id) ON DELETE SET NULL,
  
  -- Summary fields
  regulatory_requirement TEXT NOT NULL,
  finding_summary TEXT,
  categorization TEXT, -- 'complete_non_compliance', 'important_weakness', 'moderate_weakness', 'lesser_weakness', 'no_findings'
  page_reference TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- Manual override fields
  is_manually_edited BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit report appendix items table
CREATE TABLE public.audit_report_appendix_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.audit_reports(id) ON DELETE CASCADE,
  
  appendix_type TEXT NOT NULL, -- 'source_documentation', 'action_plan', 'deficiencies', 'reviewer_bio'
  item_order INTEGER NOT NULL DEFAULT 0,
  
  -- For source documentation
  filename TEXT,
  file_size_kb NUMERIC,
  file_type TEXT,
  evidence_file_id UUID REFERENCES public.evidence_files(id),
  
  -- For action plan
  finding_reference TEXT,
  management_action TEXT,
  responsible_person TEXT,
  target_date DATE,
  action_status TEXT,
  
  -- For deficiencies record
  deficiency_description TEXT,
  deficiency_evidence TEXT,
  
  -- For reviewer bio
  reviewer_name TEXT,
  reviewer_bio TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_report_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_report_findings_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_report_appendix_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users with engagement access can manage audit reports"
ON public.audit_reports FOR ALL
USING (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can manage report sections via report access"
ON public.audit_report_sections FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.audit_reports ar
  WHERE ar.id = audit_report_sections.report_id
  AND has_engagement_access(auth.uid(), ar.engagement_id)
));

CREATE POLICY "Users can manage findings summary via report access"
ON public.audit_report_findings_summary FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.audit_reports ar
  WHERE ar.id = audit_report_findings_summary.report_id
  AND has_engagement_access(auth.uid(), ar.engagement_id)
));

CREATE POLICY "Users can manage appendix items via report access"
ON public.audit_report_appendix_items FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.audit_reports ar
  WHERE ar.id = audit_report_appendix_items.report_id
  AND has_engagement_access(auth.uid(), ar.engagement_id)
));

-- Create function to auto-generate report sections
CREATE OR REPLACE FUNCTION public.initialize_audit_report_sections(p_report_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default sections based on the AML Effectiveness Review template
  INSERT INTO public.audit_report_sections (report_id, section_key, section_title, section_order, source_module, content) VALUES
    (p_report_id, 'restrictions', 'Restrictions and Intended Use', 1, NULL, 
     E'[COMPANY_NAME] Professional Services Inc. ("[COMPANY_SHORT]") has completed an independent effectiveness review of [CLIENT_NAME]''s Anti-Money Laundering ("AML") and Anti-Terrorist Financing (ATF) compliance programs against applicable AML regulatory requirements outlined in the Proceeds of Crime (Money Laundering) and Terrorist Financing Act ("PCMLTFA"), Proceeds of Crime (Money Laundering) and Terrorist Financing Regulations ("PCMLTFR"), and the Financial Transactions and Reports Analysis Centre of Canada ("FINTRAC") Guidelines (collectively referred to as the "AML Regulations").\n\nThe PCMLTFA requires all reporting entities to undergo a comprehensive AML review at least biennially. The AML review must cover [CLIENT_NAME]''s policies and procedures, assessment of risks related to the PCMLTFA and the Company''s training program and test its effectiveness.'),
    (p_report_id, 'scope', 'Scope and Approach', 2, NULL,
     E'As per the signed engagement letter, [CLIENT_NAME] engaged [COMPANY_NAME] to conduct an independent review of its AML/ATF compliance program. The review focuses on the evaluation and implementation of its policies and procedures, risk-based assessment framework, and training program to ensure alignment with Canadian AML regulations applicable to Money Service Businesses (MSBs).\n\n**Five Pillars of AML/ATF Compliance:**\n1. The appointment of a compliance officer\n2. The development and application of written compliance policies and procedures\n3. A risk assessment of the Company''s business activities and client relationships\n4. The development and maintenance of a written ongoing compliance training program\n5. The institution and documentation of an effectiveness review every two years'),
    (p_report_id, 'categorization', 'Categorization of Our Findings', 3, NULL,
     E'We have categorized our findings to assist [CLIENT_NAME] with its implementation priorities. Our findings have been categorized to align with FINTRAC''s penalties for non-compliance (i.e., the "harm done assessment").\n\n**Findings are deficiencies categorized as:**\n\n1. **Complete non-compliance** - A requirement has not been met because the reporting entity has not put in place measures to meet the requirement to any degree.\n\n2. **Partial non-compliance with important weaknesses** - An element that is priority for achieving the objectives of the Act or FINTRAC''s mandate is not met.\n\n3. **Partial non-compliance with moderate weaknesses** - An element that forms the basis for achieving the objectives is not met.\n\n4. **Partial non-compliance with lesser weaknesses** - An element that enables efficient achievement of objectives is not met.\n\n**Observations** are not deficiencies against the AML Regulations, but rather processes which can be improved upon based on industry best practices.'),
    (p_report_id, 'about_entity', 'About the Reporting Entity', 4, NULL, 
     E'[CLIENT_NAME] was incorporated under the laws of [JURISDICTION]. The Company is registered with FINTRAC under MSB registration number [MSB_NUMBER].\n\n**Governance Structure:**\n[Describe the compliance team structure and reporting lines]\n\n**Compliance Regime:**\n[CLIENT_NAME] maintains a compliance program, including having a compliance officer, written compliance policies and procedures, risk assessment, ongoing compliance training program, and a review of its compliance program.\n\n**Coverage Period:**\nOur review covered [PERIOD_START] to [PERIOD_END].'),
    (p_report_id, 'summary_findings', 'Summary of Findings', 5, NULL, NULL),
    (p_report_id, 'detailed_msb_registration', 'FINTRAC and Revenu Québec MSB Registration', 10, 'msb_registration', NULL),
    (p_report_id, 'detailed_compliance_officer', 'Appointment of a Compliance Officer', 11, 'governance', NULL),
    (p_report_id, 'detailed_policies', 'Documentation of the Compliance Policies and Procedures', 12, 'aml_program', NULL),
    (p_report_id, 'detailed_risk_assessment', 'Documentation of the AML/ATF Compliance Risk Assessment', 13, 'aml_program', NULL),
    (p_report_id, 'detailed_training', 'Documentation and Effectiveness of the Ongoing Training Program', 14, 'training', NULL),
    (p_report_id, 'detailed_review_timeframe', 'Adherence to the Prescribed Review Timeframe', 15, 'governance', NULL),
    (p_report_id, 'detailed_kyc', 'Client Identification and Record-keeping Obligations', 16, 'kyc', NULL),
    (p_report_id, 'detailed_reporting', 'Reporting Obligations – LVCTR, EFTs, STRs and TPRs', 17, 'reporting', NULL),
    (p_report_id, 'detailed_monitoring', 'Ongoing Monitoring Obligations', 18, 'monitoring', NULL),
    (p_report_id, 'appendix_sources', 'Appendix A: Source Documentation', 30, NULL, NULL),
    (p_report_id, 'appendix_action_plan', 'Appendix B: Management Action Plan', 31, NULL, NULL),
    (p_report_id, 'appendix_deficiencies', 'Appendix C: Records of Deficiencies', 32, NULL, NULL),
    (p_report_id, 'appendix_reviewer', 'Appendix D: Lead Reviewer', 33, NULL, NULL)
  ON CONFLICT (report_id, section_key) DO NOTHING;
END;
$$;