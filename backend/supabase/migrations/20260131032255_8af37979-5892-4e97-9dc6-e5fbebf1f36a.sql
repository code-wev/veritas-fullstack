
-- Create training review enum types
CREATE TYPE public.training_issue_severity AS ENUM ('high', 'medium', 'low');
CREATE TYPE public.training_issue_status AS ENUM ('open', 'in_progress', 'closed');
CREATE TYPE public.training_delivery_format AS ENUM ('internal', 'external', 'both');

-- Main training review record (one per audit cycle)
CREATE TABLE public.training_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  program_review_id UUID REFERENCES public.aml_program_reviews(id) ON DELETE CASCADE,
  review_period_start DATE,
  review_period_end DATE,
  reviewer_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed')),
  notes TEXT,
  current_step INTEGER DEFAULT 1,
  -- Section 1: Policy Existence fields
  has_documented_policy BOOLEAN,
  policy_approved BOOLEAN,
  policy_aligned_with_pcmltfa BOOLEAN,
  defines_mandatory_requirements BOOLEAN,
  defines_who_must_be_trained BOOLEAN,
  defines_training_frequency BOOLEAN,
  assigns_ownership BOOLEAN,
  addresses_onboarding_vs_refresher BOOLEAN,
  requires_updates_on_change BOOLEAN,
  policy_accessible BOOLEAN,
  -- Section 2: Design fields
  training_tailored_by_role BOOLEAN,
  enhanced_training_for_high_risk BOOLEAN,
  aligned_with_risk_assessment BOOLEAN,
  covers_reporting_obligations BOOLEAN,
  covers_client_identification BOOLEAN,
  addresses_sanctions_peps BOOLEAN,
  includes_sector_specific_risks BOOLEAN,
  reflects_products_offered BOOLEAN,
  incorporates_fintrac_guidance BOOLEAN,
  updated_for_new_products BOOLEAN,
  includes_escalation_procedures BOOLEAN,
  content_reviewed_periodically BOOLEAN,
  -- Section 3: Delivery fields
  training_delivered_in_period BOOLEAN,
  delivered_to_all_required_staff BOOLEAN,
  onboarding_training_delivered BOOLEAN,
  refresher_trainings_delivered BOOLEAN,
  delivered_before_duties BOOLEAN,
  delivery_tracked BOOLEAN,
  attendance_records_maintained BOOLEAN,
  missed_trainings_remediated BOOLEAN,
  delivery_format training_delivery_format,
  third_party_trainers_qualified BOOLEAN,
  suitable_format BOOLEAN,
  training_mandatory BOOLEAN,
  agents_trained BOOLEAN,
  delivered_in_understood_language BOOLEAN,
  completed_within_timelines BOOLEAN,
  -- Section 4: Effectiveness fields
  knowledge_assessments_used BOOLEAN,
  assessment_results_retained BOOLEAN,
  required_to_pass BOOLEAN,
  retraining_applied BOOLEAN,
  errors_linked_to_training_gaps BOOLEAN,
  str_quality_informs_updates BOOLEAN,
  feedback_collected BOOLEAN,
  materials_refreshed_on_incidents BOOLEAN,
  training_improved_awareness BOOLEAN,
  management_reviews_effectiveness BOOLEAN,
  -- Section 5: Records fields
  records_retained_per_requirements BOOLEAN,
  records_centralized BOOLEAN,
  records_show_who_when_what BOOLEAN,
  records_protected BOOLEAN,
  records_available_for_fintrac BOOLEAN,
  records_retained_required_periods BOOLEAN,
  exceptions_documented BOOLEAN,
  evidence_linked_to_program_review BOOLEAN,
  -- Summary fields
  overall_assessment TEXT,
  summary_narrative TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(engagement_id)
);

-- Training programs (one per framework)
CREATE TABLE public.training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.training_reviews(id) ON DELETE CASCADE,
  program_name TEXT NOT NULL,
  program_description TEXT,
  owner TEXT,
  last_updated DATE,
  evidence_file_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Training sessions (repeatable: sessions delivered)
CREATE TABLE public.training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.training_reviews(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  session_date DATE,
  delivery_format training_delivery_format,
  trainer_name TEXT,
  trainer_type TEXT CHECK (trainer_type IN ('internal', 'external')),
  attendee_count INTEGER,
  topics_covered TEXT[],
  assessment_conducted BOOLEAN DEFAULT false,
  pass_rate NUMERIC(5,2),
  notes TEXT,
  evidence_file_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Training audiences (repeatable: staff groups)
CREATE TABLE public.training_audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.training_reviews(id) ON DELETE CASCADE,
  audience_name TEXT NOT NULL,
  audience_type TEXT CHECK (audience_type IN ('board', 'senior_management', 'compliance', 'frontline', 'agents', 'other')),
  required_frequency TEXT,
  last_training_date DATE,
  training_completed BOOLEAN DEFAULT false,
  enhanced_training_required BOOLEAN DEFAULT false,
  notes TEXT,
  evidence_file_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Training issues (auto or manual findings)
CREATE TABLE public.training_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.training_reviews(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  issue_title TEXT NOT NULL,
  issue_description TEXT,
  category TEXT CHECK (category IN ('governance', 'design', 'delivery', 'effectiveness', 'records')),
  severity training_issue_severity NOT NULL DEFAULT 'medium',
  status training_issue_status NOT NULL DEFAULT 'open',
  recommendation TEXT,
  management_response TEXT,
  target_completion_date DATE,
  is_auto_generated BOOLEAN DEFAULT false,
  source_section INTEGER,
  source_question TEXT,
  evidence_file_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Training evidence (uploads and references)
CREATE TABLE public.training_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.training_reviews(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN (
    'training_policy', 'training_materials', 'attendance_records', 
    'assessment_results', 'trainer_credentials', 'training_schedule',
    'remediation_evidence', 'approval_evidence', 'other'
  )),
  description TEXT,
  file_id UUID REFERENCES public.evidence_files(id),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_evidence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for training_reviews
CREATE POLICY "Users with engagement access can manage training reviews"
  ON public.training_reviews FOR ALL
  USING (has_engagement_access(auth.uid(), engagement_id));

-- RLS Policies for training_programs
CREATE POLICY "Users with engagement access can manage training programs"
  ON public.training_programs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM training_reviews r
    WHERE r.id = training_programs.review_id
    AND has_engagement_access(auth.uid(), r.engagement_id)
  ));

-- RLS Policies for training_sessions
CREATE POLICY "Users with engagement access can manage training sessions"
  ON public.training_sessions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM training_reviews r
    WHERE r.id = training_sessions.review_id
    AND has_engagement_access(auth.uid(), r.engagement_id)
  ));

-- RLS Policies for training_audiences
CREATE POLICY "Users with engagement access can manage training audiences"
  ON public.training_audiences FOR ALL
  USING (EXISTS (
    SELECT 1 FROM training_reviews r
    WHERE r.id = training_audiences.review_id
    AND has_engagement_access(auth.uid(), r.engagement_id)
  ));

-- RLS Policies for training_issues
CREATE POLICY "Users with engagement access can manage training issues"
  ON public.training_issues FOR ALL
  USING (has_engagement_access(auth.uid(), engagement_id));

-- RLS Policies for training_evidence
CREATE POLICY "Users with engagement access can manage training evidence"
  ON public.training_evidence FOR ALL
  USING (EXISTS (
    SELECT 1 FROM training_reviews r
    WHERE r.id = training_evidence.review_id
    AND has_engagement_access(auth.uid(), r.engagement_id)
  ));

-- Add updated_at triggers
CREATE TRIGGER update_training_reviews_updated_at
  BEFORE UPDATE ON public.training_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_programs_updated_at
  BEFORE UPDATE ON public.training_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_sessions_updated_at
  BEFORE UPDATE ON public.training_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_audiences_updated_at
  BEFORE UPDATE ON public.training_audiences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_issues_updated_at
  BEFORE UPDATE ON public.training_issues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
