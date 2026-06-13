
-- Create governance question templates table
CREATE TABLE public.governance_question_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submodule TEXT NOT NULL,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  response_type TEXT NOT NULL DEFAULT 'yes_no',
  response_options JSONB,
  evidence_required BOOLEAN DEFAULT false,
  auto_flag_condition JSONB,
  creates_change_event TEXT,
  guidance TEXT,
  regulation_reference TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create governance interviews table
CREATE TABLE public.governance_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  interview_type TEXT NOT NULL,
  interviewee_name TEXT,
  interviewee_title TEXT,
  interview_date DATE,
  conducted_by UUID REFERENCES auth.users(id),
  transcript_file_id UUID REFERENCES public.evidence_files(id),
  interview_summary TEXT,
  overall_assessment TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  reviewer_id UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create governance responses table
CREATE TABLE public.governance_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.governance_interviews(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.governance_question_templates(id),
  submodule TEXT NOT NULL,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  response TEXT,
  response_details TEXT,
  evidence_required BOOLEAN DEFAULT false,
  evidence_provided BOOLEAN DEFAULT false,
  evidence_ids UUID[],
  auto_flag BOOLEAN DEFAULT false,
  auto_flag_reason TEXT,
  analyst_commentary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create governance changes table
CREATE TABLE public.governance_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  source_interview_id UUID REFERENCES public.governance_interviews(id),
  source_response_id UUID REFERENCES public.governance_responses(id),
  change_type TEXT NOT NULL,
  change_occurred BOOLEAN DEFAULT true,
  change_description TEXT,
  effective_date DATE,
  reportable_to_fintrac TEXT,
  reported_to_fintrac TEXT,
  reporting_date DATE,
  reporting_evidence_ids UUID[],
  escalation_gap_flag BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create governance module status table
CREATE TABLE public.governance_module_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  submodule TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  percent_complete INTEGER DEFAULT 0,
  interviews_required INTEGER DEFAULT 0,
  interviews_completed INTEGER DEFAULT 0,
  auto_flags_count INTEGER DEFAULT 0,
  auto_flags_addressed INTEGER DEFAULT 0,
  reviewer_id UUID,
  reviewed_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(engagement_id, submodule)
);

-- Create governance summary table
CREATE TABLE public.governance_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE UNIQUE,
  overall_assessment TEXT,
  summary_narrative TEXT,
  key_strengths TEXT,
  key_gaps TEXT,
  total_interviews INTEGER DEFAULT 0,
  total_changes_detected INTEGER DEFAULT 0,
  total_auto_flags INTEGER DEFAULT 0,
  final_reviewer_id UUID,
  final_reviewed_at TIMESTAMPTZ,
  sign_off_by UUID,
  sign_off_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.governance_question_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_module_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for governance_question_templates (admin manages, all view)
CREATE POLICY "All users can view question templates"
  ON public.governance_question_templates FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage question templates"
  ON public.governance_question_templates FOR ALL
  USING (public.is_admin(auth.uid()));

-- RLS Policies for governance_interviews
CREATE POLICY "Users with engagement access can view interviews"
  ON public.governance_interviews FOR SELECT
  USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users with engagement access can insert interviews"
  ON public.governance_interviews FOR INSERT
  WITH CHECK (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users with engagement access can update interviews"
  ON public.governance_interviews FOR UPDATE
  USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users with engagement access can delete interviews"
  ON public.governance_interviews FOR DELETE
  USING (public.has_engagement_access(auth.uid(), engagement_id));

-- RLS Policies for governance_responses
CREATE POLICY "Users can manage responses via interview access"
  ON public.governance_responses FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.governance_interviews i
    WHERE i.id = interview_id
    AND public.has_engagement_access(auth.uid(), i.engagement_id)
  ));

-- RLS Policies for governance_changes
CREATE POLICY "Users with engagement access can view changes"
  ON public.governance_changes FOR SELECT
  USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users with engagement access can insert changes"
  ON public.governance_changes FOR INSERT
  WITH CHECK (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users with engagement access can update changes"
  ON public.governance_changes FOR UPDATE
  USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users with engagement access can delete changes"
  ON public.governance_changes FOR DELETE
  USING (public.has_engagement_access(auth.uid(), engagement_id));

-- RLS Policies for governance_module_status
CREATE POLICY "Users with engagement access can manage module status"
  ON public.governance_module_status FOR ALL
  USING (public.has_engagement_access(auth.uid(), engagement_id));

-- RLS Policies for governance_summary
CREATE POLICY "Users with engagement access can manage summary"
  ON public.governance_summary FOR ALL
  USING (public.has_engagement_access(auth.uid(), engagement_id));

-- Create updated_at triggers
CREATE TRIGGER update_governance_interviews_updated_at
  BEFORE UPDATE ON public.governance_interviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_governance_responses_updated_at
  BEFORE UPDATE ON public.governance_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_governance_changes_updated_at
  BEFORE UPDATE ON public.governance_changes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_governance_module_status_updated_at
  BEFORE UPDATE ON public.governance_module_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_governance_summary_updated_at
  BEFORE UPDATE ON public.governance_summary
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default question templates for all 6 interview submodules

-- Board Oversight (14 questions)
INSERT INTO public.governance_question_templates (submodule, question_number, question_text, response_type, response_options, evidence_required, auto_flag_condition, creates_change_event, sort_order) VALUES
('board_oversight', 1, 'Is the Board formally responsible for AML oversight?', 'yes_no', NULL, false, NULL, NULL, 1),
('board_oversight', 2, 'Does the Board receive regular AML compliance reports?', 'yes_no', NULL, false, '{"trigger_on": "No", "flag_reason": "Weak Board Oversight"}', NULL, 2),
('board_oversight', 3, 'Frequency of AML reporting to the Board?', 'select', '["Quarterly", "Semi-Annual", "Annual", "Ad hoc"]', false, NULL, NULL, 3),
('board_oversight', 4, 'Do Board materials include STR statistics, high-risk issues, or enforcement actions?', 'yes_no_partial', NULL, false, NULL, NULL, 4),
('board_oversight', 5, 'Does the Board approve AML policies and material updates?', 'yes_no', NULL, false, '{"trigger_on": "No", "flag_reason": "Weak Board Oversight"}', NULL, 5),
('board_oversight', 6, 'Does the Board approve the appointment or removal of the Compliance Officer?', 'yes_no', NULL, false, NULL, NULL, 6),
('board_oversight', 7, 'Are AML issues discussed as a standing agenda item?', 'yes_no', NULL, false, NULL, NULL, 7),
('board_oversight', 8, 'Does the Board challenge management on AML matters?', 'yes_no_partial', NULL, false, NULL, NULL, 8),
('board_oversight', 9, 'Are AML incidents or breaches escalated to the Board?', 'yes_no', NULL, false, '{"trigger_on": "No", "flag_reason": "Weak Board Oversight"}', NULL, 9),
('board_oversight', 10, 'Are Board members trained on AML responsibilities?', 'yes_no', NULL, false, NULL, NULL, 10),
('board_oversight', 11, 'Is there documented evidence of Board oversight (minutes, presentations)?', 'yes_no', NULL, true, NULL, NULL, 11),
('board_oversight', 12, 'Has the Board composition changed during the review period?', 'yes_no', NULL, false, NULL, 'Board', 12),
('board_oversight', 13, 'If yes, did changes impact AML oversight?', 'yes_no_unknown', NULL, false, NULL, NULL, 13),
('board_oversight', 14, 'Were Board changes assessed for FINTRAC notification requirements?', 'yes_no_na', NULL, false, NULL, NULL, 14);

-- Senior Management Oversight (13 questions)
INSERT INTO public.governance_question_templates (submodule, question_number, question_text, response_type, response_options, evidence_required, auto_flag_condition, creates_change_event, sort_order) VALUES
('senior_management', 1, 'Is senior management accountable for AML effectiveness?', 'yes_no', NULL, false, NULL, NULL, 1),
('senior_management', 2, 'Are AML responsibilities defined in management job descriptions?', 'yes_no', NULL, false, NULL, NULL, 2),
('senior_management', 3, 'Does management support AML remediation efforts?', 'yes_no_partial', NULL, false, '{"trigger_on": ["No", "Partially"], "flag_reason": "Insufficient Management Support"}', NULL, 3),
('senior_management', 4, 'Are sufficient resources allocated to compliance?', 'yes_no_partial', NULL, false, '{"trigger_on": ["No", "Partially"], "flag_reason": "Insufficient Management Support"}', NULL, 4),
('senior_management', 5, 'Are AML risks considered in business decisions?', 'yes_no', NULL, false, NULL, NULL, 5),
('senior_management', 6, 'Are new products or services reviewed for AML risk?', 'yes_no', NULL, false, NULL, NULL, 6),
('senior_management', 7, 'Are AML issues escalated promptly by management?', 'yes_no', NULL, false, NULL, NULL, 7),
('senior_management', 8, 'Has senior management changed during the review period?', 'yes_no', NULL, false, NULL, 'Management', 8),
('senior_management', 9, 'Did management changes affect AML governance?', 'yes_no_unknown', NULL, false, NULL, NULL, 9),
('senior_management', 10, 'Were management changes assessed for FINTRAC reporting?', 'yes_no_na', NULL, false, NULL, NULL, 10),
('senior_management', 11, 'Does management receive AML training?', 'yes_no', NULL, false, NULL, NULL, 11),
('senior_management', 12, 'Are AML KPIs or metrics monitored by management?', 'yes_no', NULL, false, NULL, NULL, 12),
('senior_management', 13, 'Is there evidence of management review (emails, reports)?', 'yes_no', NULL, true, NULL, NULL, 13);

-- Compliance Officer Governance (15 questions)
INSERT INTO public.governance_question_templates (submodule, question_number, question_text, response_type, response_options, evidence_required, auto_flag_condition, creates_change_event, sort_order) VALUES
('compliance_officer', 1, 'Is a Compliance Officer formally appointed?', 'yes_no', NULL, false, NULL, NULL, 1),
('compliance_officer', 2, 'Does the Compliance Officer have direct access to senior management?', 'yes_no', NULL, false, '{"trigger_on": "No", "flag_reason": "CO Independence Risk"}', NULL, 2),
('compliance_officer', 3, 'Does the Compliance Officer have direct access to the Board?', 'yes_no', NULL, false, '{"trigger_on": "No", "flag_reason": "CO Independence Risk"}', NULL, 3),
('compliance_officer', 4, 'Is the Compliance Officer independent from revenue-generating functions?', 'yes_no', NULL, false, '{"trigger_on": "No", "flag_reason": "CO Independence Risk"}', NULL, 4),
('compliance_officer', 5, 'Are CO roles and responsibilities documented?', 'yes_no', NULL, false, NULL, NULL, 5),
('compliance_officer', 6, 'Does the CO have authority to escalate issues without interference?', 'yes_no', NULL, false, '{"trigger_on": "No", "flag_reason": "CO Independence Risk"}', NULL, 6),
('compliance_officer', 7, 'Has the Compliance Officer changed during the review period?', 'yes_no', NULL, false, NULL, 'Compliance Officer', 7),
('compliance_officer', 8, 'If yes, was FINTRAC notified within required timelines?', 'yes_no_unknown', NULL, false, NULL, NULL, 8),
('compliance_officer', 9, 'Does the CO oversee transaction monitoring and reporting?', 'yes_no', NULL, false, NULL, NULL, 9),
('compliance_officer', 10, 'Does the CO approve AML policies and updates?', 'yes_no', NULL, false, NULL, NULL, 10),
('compliance_officer', 11, 'Is the CO involved in risk assessments?', 'yes_no', NULL, false, NULL, NULL, 11),
('compliance_officer', 12, 'Does the CO receive adequate support and resources?', 'yes_no_partial', NULL, false, NULL, NULL, 12),
('compliance_officer', 13, 'Are CO decisions documented?', 'yes_no', NULL, false, NULL, NULL, 13),
('compliance_officer', 14, 'Has CO independence ever been challenged?', 'yes_no', NULL, false, NULL, NULL, 14),
('compliance_officer', 15, 'Is there evidence supporting CO authority (org chart, mandate)?', 'yes_no', NULL, true, NULL, NULL, 15);

-- Compliance Function and Resourcing (12 questions)
INSERT INTO public.governance_question_templates (submodule, question_number, question_text, response_type, response_options, evidence_required, auto_flag_condition, creates_change_event, sort_order) VALUES
('compliance_function', 1, 'Is the compliance function adequately staffed?', 'yes_no_partial', NULL, false, '{"trigger_on": ["No", "Partially"], "flag_reason": "Under-resourced Compliance Function"}', NULL, 1),
('compliance_function', 2, 'Are roles and responsibilities clearly defined?', 'yes_no', NULL, false, NULL, NULL, 2),
('compliance_function', 3, 'Has staffing changed during the review period?', 'yes_no', NULL, false, NULL, 'Structure', 3),
('compliance_function', 4, 'Did staffing changes impact AML coverage?', 'yes_no_unknown', NULL, false, NULL, NULL, 4),
('compliance_function', 5, 'Are compliance staff appropriately trained?', 'yes_no', NULL, false, NULL, NULL, 5),
('compliance_function', 6, 'Is training ongoing and documented?', 'yes_no', NULL, false, NULL, NULL, 6),
('compliance_function', 7, 'Are compliance staff independent from operations?', 'yes_no', NULL, false, NULL, NULL, 7),
('compliance_function', 8, 'Is workload manageable given transaction volume?', 'yes_no', NULL, false, NULL, NULL, 8),
('compliance_function', 9, 'Are third parties used for compliance support?', 'yes_no', NULL, false, NULL, NULL, 9),
('compliance_function', 10, 'Are third parties overseen by the CO?', 'yes_no_na', NULL, false, NULL, NULL, 10),
('compliance_function', 11, 'Is there a succession or backup plan?', 'yes_no', NULL, false, NULL, NULL, 11),
('compliance_function', 12, 'Is resourcing reviewed periodically?', 'yes_no', NULL, false, NULL, NULL, 12);

-- Frontline Oversight (12 questions)
INSERT INTO public.governance_question_templates (submodule, question_number, question_text, response_type, response_options, evidence_required, auto_flag_condition, creates_change_event, sort_order) VALUES
('frontline_oversight', 1, 'Are frontline staff trained on AML obligations?', 'yes_no', NULL, false, NULL, NULL, 1),
('frontline_oversight', 2, 'Do staff understand escalation procedures?', 'yes_no', NULL, false, '{"trigger_on": "No", "flag_reason": "Weak Frontline AML Awareness"}', NULL, 2),
('frontline_oversight', 3, 'Are AML responsibilities documented in job roles?', 'yes_no', NULL, false, NULL, NULL, 3),
('frontline_oversight', 4, 'Is training tailored to job function?', 'yes_no', NULL, false, NULL, NULL, 4),
('frontline_oversight', 5, 'Are staff aware of STR indicators?', 'yes_no', NULL, false, '{"trigger_on": "No", "flag_reason": "Weak Frontline AML Awareness"}', NULL, 5),
('frontline_oversight', 6, 'Are escalation decisions documented?', 'yes_no', NULL, false, NULL, NULL, 6),
('frontline_oversight', 7, 'Are refresher trainings conducted?', 'yes_no', NULL, false, NULL, NULL, 7),
('frontline_oversight', 8, 'Has frontline staffing changed during the review period?', 'yes_no', NULL, false, NULL, 'Operations', 8),
('frontline_oversight', 9, 'Did changes affect AML processes?', 'yes_no_unknown', NULL, false, NULL, NULL, 9),
('frontline_oversight', 10, 'Are quality checks performed on frontline actions?', 'yes_no', NULL, false, NULL, NULL, 10),
('frontline_oversight', 11, 'Are errors or failures tracked?', 'yes_no', NULL, false, NULL, NULL, 11),
('frontline_oversight', 12, 'Is there evidence of oversight (QA, reviews)?', 'yes_no', NULL, true, NULL, NULL, 12);

-- Change Management and Escalation (15 questions)
INSERT INTO public.governance_question_templates (submodule, question_number, question_text, response_type, response_options, evidence_required, auto_flag_condition, creates_change_event, sort_order) VALUES
('change_management', 1, 'Is there a formal change management process?', 'yes_no', NULL, false, '{"trigger_on": "No", "flag_reason": "Change Management Control Gap"}', NULL, 1),
('change_management', 2, 'Are governance changes assessed for regulatory impact?', 'yes_no', NULL, false, '{"trigger_on": "No", "flag_reason": "Change Management Control Gap"}', NULL, 2),
('change_management', 3, 'Are FINTRAC notification requirements documented?', 'yes_no', NULL, false, NULL, NULL, 3),
('change_management', 4, 'Are staff trained on identifying reportable changes?', 'yes_no', NULL, false, NULL, NULL, 4),
('change_management', 5, 'Are governance changes logged centrally?', 'yes_no', NULL, false, NULL, NULL, 5),
('change_management', 6, 'Have any governance changes occurred during the review period?', 'yes_no', NULL, false, NULL, NULL, 6),
('change_management', 7, 'Were all reportable changes notified to FINTRAC?', 'yes_no_unknown', NULL, false, '{"trigger_on": ["No", "Unknown"], "flag_reason": "Potential Unreported Change"}', NULL, 7),
('change_management', 8, 'Were notifications timely?', 'yes_no_unknown', NULL, false, '{"trigger_on": ["No", "Unknown"], "flag_reason": "Potential Unreported Change"}', NULL, 8),
('change_management', 9, 'Is evidence of notification retained?', 'yes_no', NULL, true, NULL, NULL, 9),
('change_management', 10, 'Are incidents escalated to senior management?', 'yes_no', NULL, false, NULL, NULL, 10),
('change_management', 11, 'Are breaches tracked and remediated?', 'yes_no', NULL, false, NULL, NULL, 11),
('change_management', 12, 'Are lessons learned documented?', 'yes_no', NULL, false, NULL, NULL, 12),
('change_management', 13, 'Are prior audit findings addressed?', 'yes_no', NULL, false, NULL, NULL, 13),
('change_management', 14, 'Are unresolved issues escalated?', 'yes_no', NULL, false, NULL, NULL, 14),
('change_management', 15, 'Is change management reviewed periodically?', 'yes_no', NULL, false, NULL, NULL, 15);
