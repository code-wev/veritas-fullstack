-- Create helper functions using existing app_role enum values
CREATE OR REPLACE FUNCTION public.can_edit_audit_report(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('lead_consultant', 'partner', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_findings(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('manager', 'lead_consultant', 'partner', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'partner' THEN 1
      WHEN 'lead_consultant' THEN 2
      WHEN 'admin' THEN 3
      WHEN 'manager' THEN 4
      WHEN 'analyst' THEN 5
    END
  LIMIT 1
$$;

-- Scope methodology templates table
CREATE TABLE IF NOT EXISTS public.audit_report_scope_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  template_key TEXT NOT NULL UNIQUE,
  template_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_report_scope_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All users can view scope templates" ON public.audit_report_scope_templates;
CREATE POLICY "All users can view scope templates"
ON public.audit_report_scope_templates FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage scope templates" ON public.audit_report_scope_templates;
CREATE POLICY "Admins can manage scope templates"
ON public.audit_report_scope_templates FOR ALL
USING (public.is_admin(auth.uid()));

-- Insert default scope templates
INSERT INTO public.audit_report_scope_templates (template_key, template_name, template_content, sort_order) VALUES
('scope_intro', 'Scope Introduction', 'The scope of this AML/ATF Compliance Review & Effectiveness Testing engagement included reviewing and testing the following regulatory obligations:', 1),
('scope_msb', 'MSB Registration', 'FINTRAC and Revenu Québec MSB Registration requirements', 2),
('scope_compliance_officer', 'Compliance Officer', 'Appointment of a Compliance Officer', 3),
('scope_policies', 'Policies & Procedures', 'Documentation of Compliance Policies and Procedures', 4),
('scope_risk_assessment', 'Risk Assessment', 'Documentation of the AML/ATF Compliance Risk Assessment', 5),
('scope_training', 'Training Program', 'Documentation and Effectiveness of the Ongoing Training Program', 6),
('scope_two_year_review', 'Two-Year Review', 'Review of the Compliance Program within the prescribed two-year timeframe', 7),
('scope_kyc', 'KYC Obligations', 'Client Identification and Record-keeping Obligations', 8),
('scope_reporting', 'Reporting Obligations', 'Reporting Obligations – LVCTR, EFTs, STRs and TPRs', 9),
('scope_monitoring', 'Ongoing Monitoring', 'Ongoing Monitoring Obligations', 10)
ON CONFLICT (template_key) DO NOTHING;

-- Add scope selections to audit_reports
ALTER TABLE public.audit_reports 
ADD COLUMN IF NOT EXISTS scope_selections TEXT[] DEFAULT ARRAY['scope_msb', 'scope_compliance_officer', 'scope_policies', 'scope_risk_assessment', 'scope_training', 'scope_two_year_review', 'scope_kyc', 'scope_reporting', 'scope_monitoring'],
ADD COLUMN IF NOT EXISTS executive_summary TEXT,
ADD COLUMN IF NOT EXISTS executive_summary_edited_by UUID,
ADD COLUMN IF NOT EXISTS executive_summary_edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS methodology_text TEXT DEFAULT 'Our review methodology included document review, interview-based assessments, and transactional testing. We examined policies, procedures, risk assessments, training records, and transaction reports against regulatory requirements set forth by FINTRAC and applicable provincial regulations.';

-- Add management response fields to findings if not exist
ALTER TABLE public.findings
ADD COLUMN IF NOT EXISTS management_response_owner TEXT,
ADD COLUMN IF NOT EXISTS management_response_date TIMESTAMP WITH TIME ZONE;