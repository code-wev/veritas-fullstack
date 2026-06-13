-- C&G ClearAudit Database Schema

-- 1. User Roles Enum
CREATE TYPE public.app_role AS ENUM ('analyst', 'manager', 'lead_consultant', 'partner', 'admin');

-- 2. User Roles Table (separate from profiles per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 3. Profiles Table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Clients Table (the MSB/PSP being reviewed)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'MSB/PSP', 'Casinos', 'Securities dealers', etc.
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 5. Client User Assignments (who can access which client)
CREATE TABLE public.client_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE (client_id, user_id)
);

-- 6. Engagements Table (each AML Effectiveness Review)
CREATE TABLE public.engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  scope TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, in_progress, review, completed, archived
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 7. Engagement User Assignments
CREATE TABLE public.engagement_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID REFERENCES public.engagements(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT, -- specific role for this engagement if different
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE (engagement_id, user_id)
);

-- 8. Module Status Tracking
CREATE TABLE public.module_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID REFERENCES public.engagements(id) ON DELETE CASCADE NOT NULL,
  module_name TEXT NOT NULL,
  submodule_name TEXT,
  status TEXT NOT NULL DEFAULT 'not_started', -- not_started, in_progress, ready_for_review, approved, locked
  percent_complete INTEGER DEFAULT 0,
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, module_name, submodule_name)
);

-- 9. Evidence Files (Client Files Vault)
CREATE TABLE public.evidence_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  engagement_id UUID REFERENCES public.engagements(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  file_type TEXT, -- pdf, jpeg, json, xlsx, etc.
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  category TEXT, -- policies, training, kyc, transaction_reports, etc.
  tags TEXT[],
  parsed_json JSONB, -- for JSON file contents
  version INTEGER DEFAULT 1,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Workpapers
CREATE TABLE public.workpapers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID REFERENCES public.engagements(id) ON DELETE CASCADE NOT NULL,
  module TEXT NOT NULL,
  submodule TEXT,
  title TEXT NOT NULL,
  objective TEXT,
  testing_steps TEXT,
  results TEXT,
  conclusion TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, in_progress, ready_for_review, approved, locked
  owner_id UUID REFERENCES auth.users(id),
  reviewer_id UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Checklist Templates
CREATE TABLE public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  submodule TEXT,
  question_text TEXT NOT NULL,
  guidance TEXT,
  regulation_reference TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Checklist Responses
CREATE TABLE public.checklist_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workpaper_id UUID REFERENCES public.workpapers(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.checklist_templates(id),
  question_text TEXT NOT NULL,
  answer TEXT, -- pass, fail, na, partial
  notes TEXT,
  evidence_ids UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Interviews
CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID REFERENCES public.engagements(id) ON DELETE CASCADE NOT NULL,
  interview_type TEXT NOT NULL, -- board_directors, compliance_officer, compliance_staff, frontline, customer_support
  interviewee_name TEXT,
  interviewee_title TEXT,
  interview_date DATE,
  summary_text TEXT,
  transcript_file_id UUID REFERENCES public.evidence_files(id),
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Interview Responses
CREATE TABLE public.interview_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  answer TEXT,
  notes TEXT,
  evidence_ids UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. KYC Samples
CREATE TABLE public.kyc_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID REFERENCES public.engagements(id) ON DELETE CASCADE NOT NULL,
  sample_type TEXT NOT NULL, -- individual, entity
  customer_id TEXT,
  customer_name TEXT,
  onboarding_date DATE,
  risk_rating TEXT,
  verification_method TEXT,
  test_result TEXT, -- pass, fail, partial
  deficiencies TEXT,
  notes TEXT,
  evidence_ids UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. Transaction Reporting Samples
CREATE TABLE public.reporting_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID REFERENCES public.engagements(id) ON DELETE CASCADE NOT NULL,
  report_type TEXT NOT NULL, -- lctr, lvctr, eftr, str, lpepr
  report_reference TEXT,
  reporting_period_start DATE,
  reporting_period_end DATE,
  timeliness_result TEXT,
  completeness_result TEXT,
  test_result TEXT, -- pass, fail, partial
  notes TEXT,
  evidence_ids UUID[],
  parsed_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. TM Rules
CREATE TABLE public.tm_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID REFERENCES public.engagements(id) ON DELETE CASCADE NOT NULL,
  rule_name TEXT NOT NULL,
  rule_category TEXT, -- sanctions, risk_scoring, monitoring, alerts
  rationale TEXT,
  expected_behavior TEXT,
  test_cases TEXT,
  test_outcome TEXT, -- pass, fail, partial
  notes TEXT,
  evidence_ids UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. Alerts Samples
CREATE TABLE public.alerts_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID REFERENCES public.engagements(id) ON DELETE CASCADE NOT NULL,
  alert_id TEXT,
  alert_date DATE,
  alert_type TEXT,
  disposition TEXT,
  escalation_decision TEXT,
  test_result TEXT, -- pass, fail
  case_notes TEXT,
  evidence_ids UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 19. Findings
CREATE TABLE public.findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID REFERENCES public.engagements(id) ON DELETE CASCADE NOT NULL,
  module TEXT NOT NULL,
  submodule TEXT,
  title TEXT NOT NULL,
  description TEXT,
  root_cause TEXT,
  severity TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  regulation_reference TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, manager_review, partner_signoff, final
  evidence_ids UUID[],
  source_workpaper_id UUID REFERENCES public.workpapers(id),
  source_interview_id UUID REFERENCES public.interviews(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 20. Recommendations
CREATE TABLE public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id UUID REFERENCES public.findings(id) ON DELETE CASCADE NOT NULL,
  recommendation_text TEXT NOT NULL,
  owner TEXT,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'open', -- open, in_progress, implemented, not_implemented
  management_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 21. Evidence Links (many-to-many linking)
CREATE TABLE public.evidence_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID REFERENCES public.evidence_files(id) ON DELETE CASCADE NOT NULL,
  workpaper_id UUID REFERENCES public.workpapers(id) ON DELETE CASCADE,
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE,
  finding_id UUID REFERENCES public.findings(id) ON DELETE CASCADE,
  kyc_sample_id UUID REFERENCES public.kyc_samples(id) ON DELETE CASCADE,
  reporting_sample_id UUID REFERENCES public.reporting_samples(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 22. Audit Log
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workpapers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporting_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Security Definer Functions for RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

CREATE OR REPLACE FUNCTION public.has_client_access(_user_id UUID, _client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_assignments
    WHERE user_id = _user_id AND client_id = _client_id
  ) OR public.is_admin(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.has_engagement_access(_user_id UUID, _engagement_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.engagement_assignments
    WHERE user_id = _user_id AND engagement_id = _engagement_id
  ) OR public.is_admin(_user_id)
$$;

-- RLS Policies

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User Roles: only admins can manage, users can view their own
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid()));

-- Clients: based on assignment
CREATE POLICY "Users can view assigned clients" ON public.clients FOR SELECT USING (public.has_client_access(auth.uid(), id));
CREATE POLICY "Admins can manage clients" ON public.clients FOR ALL USING (public.is_admin(auth.uid()));

-- Client Assignments
CREATE POLICY "Users can view their assignments" ON public.client_assignments FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage assignments" ON public.client_assignments FOR ALL USING (public.is_admin(auth.uid()));

-- Engagements: based on client access
CREATE POLICY "Users can view engagements for assigned clients" ON public.engagements FOR SELECT 
  USING (public.has_client_access(auth.uid(), client_id));
CREATE POLICY "Users with engagement access can update" ON public.engagements FOR UPDATE 
  USING (public.has_engagement_access(auth.uid(), id));
CREATE POLICY "Admins can manage engagements" ON public.engagements FOR ALL USING (public.is_admin(auth.uid()));

-- Engagement Assignments
CREATE POLICY "Users can view engagement assignments" ON public.engagement_assignments FOR SELECT 
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage engagement assignments" ON public.engagement_assignments FOR ALL 
  USING (public.is_admin(auth.uid()));

-- Module Status
CREATE POLICY "Users can view module status for their engagements" ON public.module_status FOR SELECT 
  USING (public.has_engagement_access(auth.uid(), engagement_id));
CREATE POLICY "Users can update module status" ON public.module_status FOR UPDATE 
  USING (public.has_engagement_access(auth.uid(), engagement_id));
CREATE POLICY "Users can insert module status" ON public.module_status FOR INSERT 
  WITH CHECK (public.has_engagement_access(auth.uid(), engagement_id));

-- Evidence Files
CREATE POLICY "Users can view evidence for assigned clients" ON public.evidence_files FOR SELECT 
  USING (public.has_client_access(auth.uid(), client_id));
CREATE POLICY "Users can upload evidence" ON public.evidence_files FOR INSERT 
  WITH CHECK (public.has_client_access(auth.uid(), client_id));
CREATE POLICY "Users can update evidence" ON public.evidence_files FOR UPDATE 
  USING (public.has_client_access(auth.uid(), client_id));

-- Workpapers
CREATE POLICY "Users can view workpapers for their engagements" ON public.workpapers FOR SELECT 
  USING (public.has_engagement_access(auth.uid(), engagement_id));
CREATE POLICY "Users can create workpapers" ON public.workpapers FOR INSERT 
  WITH CHECK (public.has_engagement_access(auth.uid(), engagement_id));
CREATE POLICY "Users can update workpapers" ON public.workpapers FOR UPDATE 
  USING (public.has_engagement_access(auth.uid(), engagement_id));

-- Checklist Templates: readable by all authenticated, manageable by admins
CREATE POLICY "All users can view templates" ON public.checklist_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage templates" ON public.checklist_templates FOR ALL USING (public.is_admin(auth.uid()));

-- Checklist Responses
CREATE POLICY "Users can view responses for their workpapers" ON public.checklist_responses FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.workpapers w WHERE w.id = workpaper_id AND public.has_engagement_access(auth.uid(), w.engagement_id)));
CREATE POLICY "Users can manage responses" ON public.checklist_responses FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.workpapers w WHERE w.id = workpaper_id AND public.has_engagement_access(auth.uid(), w.engagement_id)));

-- Interviews
CREATE POLICY "Users can view interviews for their engagements" ON public.interviews FOR SELECT 
  USING (public.has_engagement_access(auth.uid(), engagement_id));
CREATE POLICY "Users can manage interviews" ON public.interviews FOR ALL 
  USING (public.has_engagement_access(auth.uid(), engagement_id));

-- Interview Responses
CREATE POLICY "Users can view interview responses" ON public.interview_responses FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.interviews i WHERE i.id = interview_id AND public.has_engagement_access(auth.uid(), i.engagement_id)));
CREATE POLICY "Users can manage interview responses" ON public.interview_responses FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.interviews i WHERE i.id = interview_id AND public.has_engagement_access(auth.uid(), i.engagement_id)));

-- KYC Samples
CREATE POLICY "Users can view kyc samples" ON public.kyc_samples FOR SELECT 
  USING (public.has_engagement_access(auth.uid(), engagement_id));
CREATE POLICY "Users can manage kyc samples" ON public.kyc_samples FOR ALL 
  USING (public.has_engagement_access(auth.uid(), engagement_id));

-- Reporting Samples
CREATE POLICY "Users can view reporting samples" ON public.reporting_samples FOR SELECT 
  USING (public.has_engagement_access(auth.uid(), engagement_id));
CREATE POLICY "Users can manage reporting samples" ON public.reporting_samples FOR ALL 
  USING (public.has_engagement_access(auth.uid(), engagement_id));

-- TM Rules
CREATE POLICY "Users can view tm rules" ON public.tm_rules FOR SELECT 
  USING (public.has_engagement_access(auth.uid(), engagement_id));
CREATE POLICY "Users can manage tm rules" ON public.tm_rules FOR ALL 
  USING (public.has_engagement_access(auth.uid(), engagement_id));

-- Alerts Samples
CREATE POLICY "Users can view alerts samples" ON public.alerts_samples FOR SELECT 
  USING (public.has_engagement_access(auth.uid(), engagement_id));
CREATE POLICY "Users can manage alerts samples" ON public.alerts_samples FOR ALL 
  USING (public.has_engagement_access(auth.uid(), engagement_id));

-- Findings
CREATE POLICY "Users can view findings" ON public.findings FOR SELECT 
  USING (public.has_engagement_access(auth.uid(), engagement_id));
CREATE POLICY "Users can manage findings" ON public.findings FOR ALL 
  USING (public.has_engagement_access(auth.uid(), engagement_id));

-- Recommendations
CREATE POLICY "Users can view recommendations" ON public.recommendations FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.findings f WHERE f.id = finding_id AND public.has_engagement_access(auth.uid(), f.engagement_id)));
CREATE POLICY "Users can manage recommendations" ON public.recommendations FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.findings f WHERE f.id = finding_id AND public.has_engagement_access(auth.uid(), f.engagement_id)));

-- Evidence Links
CREATE POLICY "Users can view evidence links" ON public.evidence_links FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.evidence_files e WHERE e.id = evidence_id AND public.has_client_access(auth.uid(), e.client_id)));
CREATE POLICY "Users can manage evidence links" ON public.evidence_links FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.evidence_files e WHERE e.id = evidence_id AND public.has_client_access(auth.uid(), e.client_id)));

-- Audit Log: users can view their own actions, admins can view all
CREATE POLICY "Users can view own audit log" ON public.audit_log FOR SELECT 
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "System can insert audit log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger for profile creation on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_engagements_updated_at BEFORE UPDATE ON public.engagements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_workpapers_updated_at BEFORE UPDATE ON public.workpapers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_interviews_updated_at BEFORE UPDATE ON public.interviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_findings_updated_at BEFORE UPDATE ON public.findings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_recommendations_updated_at BEFORE UPDATE ON public.recommendations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_kyc_samples_updated_at BEFORE UPDATE ON public.kyc_samples FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reporting_samples_updated_at BEFORE UPDATE ON public.reporting_samples FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tm_rules_updated_at BEFORE UPDATE ON public.tm_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_alerts_samples_updated_at BEFORE UPDATE ON public.alerts_samples FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_checklist_responses_updated_at BEFORE UPDATE ON public.checklist_responses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_module_status_updated_at BEFORE UPDATE ON public.module_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();