-- MSB Registrations table (stores FINTRAC and Revenu Quebec registration details)
CREATE TABLE public.msb_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  registration_type TEXT NOT NULL CHECK (registration_type IN ('fintrac', 'revenu_quebec')),
  
  -- Core registration fields
  msb_name TEXT,
  registration_number TEXT,
  trade_name TEXT,
  msb_status TEXT,
  initial_registration_date DATE,
  expiry_date DATE,
  
  -- Incorporation details
  incorporation_number TEXT,
  date_of_incorporation DATE,
  jurisdiction_of_incorporation TEXT,
  
  -- Contact and location
  business_address TEXT,
  website_address TEXT,
  compliance_officer_name TEXT,
  
  -- Activities and operations
  msb_activities TEXT[],
  agency_locations TEXT,
  channel_of_delivery TEXT,
  
  -- Internal notes
  internal_notes TEXT,
  last_verified_date DATE,
  verified_by UUID,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(engagement_id, registration_type)
);

-- Enable RLS
ALTER TABLE public.msb_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users with engagement access can view registrations"
  ON public.msb_registrations FOR SELECT
  USING (public.has_engagement_access(engagement_id, auth.uid()));

CREATE POLICY "Users with engagement access can insert registrations"
  ON public.msb_registrations FOR INSERT
  WITH CHECK (public.has_engagement_access(engagement_id, auth.uid()));

CREATE POLICY "Users with engagement access can update registrations"
  ON public.msb_registrations FOR UPDATE
  USING (public.has_engagement_access(engagement_id, auth.uid()));

CREATE POLICY "Users with engagement access can delete registrations"
  ON public.msb_registrations FOR DELETE
  USING (public.has_engagement_access(engagement_id, auth.uid()));

-- Section 1: Registration Status Validation checklist
CREATE TABLE public.msb_status_validation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID NOT NULL REFERENCES public.msb_registrations(id) ON DELETE CASCADE,
  
  -- Validation questions (Yes/No/NA with evidence)
  registration_confirmed_on_website TEXT CHECK (registration_confirmed_on_website IN ('yes', 'no', 'na')),
  registration_matches_internal_docs TEXT CHECK (registration_matches_internal_docs IN ('yes', 'no', 'na')),
  registration_active_not_expired TEXT CHECK (registration_active_not_expired IN ('yes', 'no', 'na')),
  renewal_completed_on_time TEXT CHECK (renewal_completed_on_time IN ('yes', 'no', 'na')),
  
  -- Evidence links
  website_evidence_ids TEXT[],
  internal_docs_evidence_ids TEXT[],
  status_evidence_ids TEXT[],
  renewal_evidence_ids TEXT[],
  
  -- Notes
  validation_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(registration_id)
);

-- Enable RLS
ALTER TABLE public.msb_status_validation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with engagement access can manage status validation"
  ON public.msb_status_validation FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.msb_registrations r 
    WHERE r.id = registration_id 
    AND public.has_engagement_access(r.engagement_id, auth.uid())
  ));

-- Section 2: Change Detection tracking
CREATE TABLE public.msb_change_detection (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID NOT NULL REFERENCES public.msb_registrations(id) ON DELETE CASCADE,
  
  -- Change categories (Yes/No for each)
  board_of_directors_changed BOOLEAN DEFAULT false,
  senior_management_changed BOOLEAN DEFAULT false,
  compliance_officer_changed BOOLEAN DEFAULT false,
  shareholders_changed BOOLEAN DEFAULT false,
  business_activities_changed BOOLEAN DEFAULT false,
  agents_branches_changed BOOLEAN DEFAULT false,
  head_office_address_changed BOOLEAN DEFAULT false,
  banking_relationships_changed BOOLEAN DEFAULT false,
  authorized_persons_changed BOOLEAN DEFAULT false,
  
  -- Notes per category
  board_notes TEXT,
  management_notes TEXT,
  compliance_officer_notes TEXT,
  shareholders_notes TEXT,
  activities_notes TEXT,
  agents_notes TEXT,
  address_notes TEXT,
  banking_notes TEXT,
  authorized_persons_notes TEXT,
  
  -- Evidence
  evidence_ids TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(registration_id)
);

-- Enable RLS
ALTER TABLE public.msb_change_detection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with engagement access can manage change detection"
  ON public.msb_change_detection FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.msb_registrations r 
    WHERE r.id = registration_id 
    AND public.has_engagement_access(r.engagement_id, auth.uid())
  ));

-- Section 3: Notification Requirement Assessment
CREATE TABLE public.msb_notification_assessment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID NOT NULL REFERENCES public.msb_registrations(id) ON DELETE CASCADE,
  change_category TEXT NOT NULL,
  
  -- Notification requirement
  requires_notification TEXT CHECK (requires_notification IN ('yes', 'no', 'judgment')),
  judgment_explanation TEXT,
  
  -- Timeliness (Section 4 data)
  change_date DATE,
  notification_date DATE,
  notification_method TEXT,
  days_to_notify INTEGER GENERATED ALWAYS AS (
    CASE WHEN notification_date IS NOT NULL AND change_date IS NOT NULL 
    THEN notification_date - change_date 
    ELSE NULL END
  ) STORED,
  is_timely BOOLEAN GENERATED ALWAYS AS (
    CASE WHEN notification_date IS NOT NULL AND change_date IS NOT NULL 
    THEN (notification_date - change_date) <= 30 
    ELSE NULL END
  ) STORED,
  
  -- Evidence classification
  evidence_type TEXT CHECK (evidence_type IN ('documentary', 'management_representation', 'combination')),
  evidence_ids TEXT[],
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.msb_notification_assessment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with engagement access can manage notification assessments"
  ON public.msb_notification_assessment FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.msb_registrations r 
    WHERE r.id = registration_id 
    AND public.has_engagement_access(r.engagement_id, auth.uid())
  ));

-- MSB Review Checklist (general checklist items beyond the 4 sections)
CREATE TABLE public.msb_review_checklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID NOT NULL REFERENCES public.msb_registrations(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer TEXT CHECK (answer IN ('pass', 'fail', 'na')),
  commentary TEXT,
  evidence_ids TEXT[],
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.msb_review_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with engagement access can manage review checklist"
  ON public.msb_review_checklist FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.msb_registrations r 
    WHERE r.id = registration_id 
    AND public.has_engagement_access(r.engagement_id, auth.uid())
  ));

-- Update triggers
CREATE TRIGGER update_msb_registrations_updated_at
  BEFORE UPDATE ON public.msb_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_msb_status_validation_updated_at
  BEFORE UPDATE ON public.msb_status_validation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_msb_change_detection_updated_at
  BEFORE UPDATE ON public.msb_change_detection
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_msb_notification_assessment_updated_at
  BEFORE UPDATE ON public.msb_notification_assessment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_msb_review_checklist_updated_at
  BEFORE UPDATE ON public.msb_review_checklist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();