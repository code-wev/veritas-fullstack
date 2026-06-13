
-- Foundation: engagement_module_assignments + has_module_access
CREATE TABLE IF NOT EXISTS public.engagement_module_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  module TEXT NOT NULL,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, user_id, module)
);

ALTER TABLE public.engagement_module_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage module assignments" ON public.engagement_module_assignments;
CREATE POLICY "Admins manage module assignments" ON public.engagement_module_assignments
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users view their module assignments" ON public.engagement_module_assignments;
CREATE POLICY "Users view their module assignments" ON public.engagement_module_assignments
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.has_module_access(_user_id UUID, _engagement_id UUID, _module TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.is_admin(_user_id)
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('manager','partner'))
    OR NOT EXISTS (SELECT 1 FROM public.engagement_module_assignments WHERE engagement_id = _engagement_id AND user_id = _user_id)
    OR EXISTS (SELECT 1 FROM public.engagement_module_assignments
               WHERE engagement_id = _engagement_id AND user_id = _user_id AND module = _module)
$$;

-- ============ WRITE GUARDS (module-gated) ============
CREATE OR REPLACE FUNCTION public.can_write_reporting_review(_user_id UUID, _review_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.reporting_reviews r
    WHERE r.id = _review_id
      AND has_engagement_access(_user_id, r.engagement_id)
      AND has_module_access(_user_id, r.engagement_id, 'reporting')
      AND (r.lock_state <> 'finalized' OR can_unlock_audit_report(_user_id)))
$$;

CREATE OR REPLACE FUNCTION public.can_write_kyc_review(_user_id UUID, _review_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.kyc_reviews r
    WHERE r.id = _review_id
      AND has_engagement_access(_user_id, r.engagement_id)
      AND has_module_access(_user_id, r.engagement_id, 'kyc')
      AND (r.lock_state <> 'finalized' OR can_unlock_audit_report(_user_id)))
$$;

CREATE OR REPLACE FUNCTION public.can_write_tm_review(_user_id UUID, _review_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.tm_reviews r
    WHERE r.id = _review_id
      AND has_engagement_access(_user_id, r.engagement_id)
      AND has_module_access(_user_id, r.engagement_id, 'monitoring')
      AND (r.lock_state <> 'finalized' OR can_unlock_audit_report(_user_id)))
$$;

CREATE OR REPLACE FUNCTION public.can_write_aml_program_review(_user_id UUID, _program_review_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.aml_program_reviews r
    WHERE r.id = _program_review_id
      AND has_engagement_access(_user_id, r.engagement_id)
      AND has_module_access(_user_id, r.engagement_id, 'aml_program')
      AND (r.lock_state <> 'finalized' OR can_unlock_audit_report(_user_id)))
$$;

CREATE OR REPLACE FUNCTION public.can_write_training_review(_user_id UUID, _review_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.training_reviews r
    WHERE r.id = _review_id
      AND has_engagement_access(_user_id, r.engagement_id)
      AND has_module_access(_user_id, r.engagement_id, 'training')
      AND (r.lock_state <> 'finalized' OR can_unlock_audit_report(_user_id)))
$$;

CREATE OR REPLACE FUNCTION public.can_write_risk_assessment_review(_user_id UUID, _review_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.risk_assessment_reviews r
    WHERE r.id = _review_id
      AND has_engagement_access(_user_id, r.engagement_id)
      AND has_module_access(_user_id, r.engagement_id, 'risk_assessment')
      AND (r.lock_state <> 'finalized' OR can_unlock_audit_report(_user_id)))
$$;

CREATE OR REPLACE FUNCTION public.can_write_effectiveness_review(_user_id UUID, _review_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.effectiveness_reviews r
    WHERE r.id = _review_id
      AND has_engagement_access(_user_id, r.engagement_id)
      AND has_module_access(_user_id, r.engagement_id, 'effectiveness')
      AND (r.lock_state <> 'finalized' OR can_unlock_audit_report(_user_id)))
$$;

-- ============ READ GUARDS ============
CREATE OR REPLACE FUNCTION public.can_read_reporting_review(_user_id UUID, _review_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.reporting_reviews r
    WHERE r.id = _review_id
      AND has_engagement_access(_user_id, r.engagement_id)
      AND has_module_access(_user_id, r.engagement_id, 'reporting'))
$$;

CREATE OR REPLACE FUNCTION public.can_read_kyc_review(_user_id UUID, _review_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.kyc_reviews r
    WHERE r.id = _review_id
      AND has_engagement_access(_user_id, r.engagement_id)
      AND has_module_access(_user_id, r.engagement_id, 'kyc'))
$$;

CREATE OR REPLACE FUNCTION public.can_read_tm_review(_user_id UUID, _review_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.tm_reviews r
    WHERE r.id = _review_id
      AND has_engagement_access(_user_id, r.engagement_id)
      AND has_module_access(_user_id, r.engagement_id, 'monitoring'))
$$;

CREATE OR REPLACE FUNCTION public.can_read_aml_program_review(_user_id UUID, _program_review_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.aml_program_reviews r
    WHERE r.id = _program_review_id
      AND has_engagement_access(_user_id, r.engagement_id)
      AND has_module_access(_user_id, r.engagement_id, 'aml_program'))
$$;

CREATE OR REPLACE FUNCTION public.can_read_training_review(_user_id UUID, _review_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.training_reviews r
    WHERE r.id = _review_id
      AND has_engagement_access(_user_id, r.engagement_id)
      AND has_module_access(_user_id, r.engagement_id, 'training'))
$$;

CREATE OR REPLACE FUNCTION public.can_read_risk_assessment_review(_user_id UUID, _review_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.risk_assessment_reviews r
    WHERE r.id = _review_id
      AND has_engagement_access(_user_id, r.engagement_id)
      AND has_module_access(_user_id, r.engagement_id, 'risk_assessment'))
$$;

CREATE OR REPLACE FUNCTION public.can_read_effectiveness_review(_user_id UUID, _review_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.effectiveness_reviews r
    WHERE r.id = _review_id
      AND has_engagement_access(_user_id, r.engagement_id)
      AND has_module_access(_user_id, r.engagement_id, 'effectiveness'))
$$;

-- ============ SELECT POLICIES ============
DROP POLICY IF EXISTS "Users can view reporting reviews" ON public.reporting_reviews;
CREATE POLICY "Users can view reporting reviews" ON public.reporting_reviews
  FOR SELECT USING (can_read_reporting_review(auth.uid(), id));

DROP POLICY IF EXISTS "Users can view reporting samples" ON public.reporting_samples;
CREATE POLICY "Users can view reporting samples" ON public.reporting_samples
  FOR SELECT USING (has_engagement_access(auth.uid(), engagement_id)
    AND has_module_access(auth.uid(), engagement_id, 'reporting'));

DROP POLICY IF EXISTS "Users can view reporting findings" ON public.reporting_findings;
CREATE POLICY "Users can view reporting findings" ON public.reporting_findings
  FOR SELECT USING (has_engagement_access(auth.uid(), engagement_id)
    AND has_module_access(auth.uid(), engagement_id, 'reporting'));

DROP POLICY IF EXISTS "Users can view reporting governance" ON public.reporting_governance;
CREATE POLICY "Users can view reporting governance" ON public.reporting_governance
  FOR SELECT USING (can_read_reporting_review(auth.uid(), review_id));

DROP POLICY IF EXISTS "Users can view reporting source population" ON public.reporting_source_population;
CREATE POLICY "Users can view reporting source population" ON public.reporting_source_population
  FOR SELECT USING (has_engagement_access(auth.uid(), engagement_id)
    AND has_module_access(auth.uid(), engagement_id, 'reporting'));

DROP POLICY IF EXISTS "Users can view reporting source population rows" ON public.reporting_source_population_rows;
CREATE POLICY "Users can view reporting source population rows" ON public.reporting_source_population_rows
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.reporting_source_population p
    WHERE p.id = reporting_source_population_rows.population_id
      AND has_engagement_access(auth.uid(), p.engagement_id)
      AND has_module_access(auth.uid(), p.engagement_id, 'reporting')));

DROP POLICY IF EXISTS "Users can view kyc reviews" ON public.kyc_reviews;
CREATE POLICY "Users can view kyc reviews" ON public.kyc_reviews
  FOR SELECT USING (can_read_kyc_review(auth.uid(), id));

DROP POLICY IF EXISTS "Users can view kyc individual samples" ON public.kyc_individual_samples;
CREATE POLICY "Users can view kyc individual samples" ON public.kyc_individual_samples
  FOR SELECT USING (can_read_kyc_review(auth.uid(), review_id));

DROP POLICY IF EXISTS "Users can view kyc business samples" ON public.kyc_business_samples;
CREATE POLICY "Users can view kyc business samples" ON public.kyc_business_samples
  FOR SELECT USING (can_read_kyc_review(auth.uid(), review_id));

DROP POLICY IF EXISTS "Users can view kyc beneficial owners" ON public.kyc_beneficial_owners;
CREATE POLICY "Users can view kyc beneficial owners" ON public.kyc_beneficial_owners
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.kyc_business_samples bs
    WHERE bs.id = kyc_beneficial_owners.business_sample_id
      AND can_read_kyc_review(auth.uid(), bs.review_id)));

DROP POLICY IF EXISTS "Users can view kyc transaction samples" ON public.kyc_transaction_samples;
CREATE POLICY "Users can view kyc transaction samples" ON public.kyc_transaction_samples
  FOR SELECT USING (can_read_kyc_review(auth.uid(), review_id));

DROP POLICY IF EXISTS "Users can view kyc issues" ON public.kyc_issues;
CREATE POLICY "Users can view kyc issues" ON public.kyc_issues
  FOR SELECT USING (can_read_kyc_review(auth.uid(), review_id));

DROP POLICY IF EXISTS "Users can view kyc sample evidence" ON public.kyc_sample_evidence;
CREATE POLICY "Users can view kyc sample evidence" ON public.kyc_sample_evidence
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.kyc_individual_samples s
      WHERE s.id = kyc_sample_evidence.individual_sample_id
        AND can_read_kyc_review(auth.uid(), s.review_id))
    OR EXISTS (SELECT 1 FROM public.kyc_business_samples s
      WHERE s.id = kyc_sample_evidence.business_sample_id
        AND can_read_kyc_review(auth.uid(), s.review_id)));

DROP POLICY IF EXISTS "Users can view tm reviews" ON public.tm_reviews;
CREATE POLICY "Users can view tm reviews" ON public.tm_reviews
  FOR SELECT USING (can_read_tm_review(auth.uid(), id));

DROP POLICY IF EXISTS "Users can view tm submodule status" ON public.tm_submodule_status;
CREATE POLICY "Users can view tm submodule status" ON public.tm_submodule_status
  FOR SELECT USING (can_read_tm_review(auth.uid(), review_id));

DROP POLICY IF EXISTS "Users can view tm checklist responses" ON public.tm_checklist_responses;
CREATE POLICY "Users can view tm checklist responses" ON public.tm_checklist_responses
  FOR SELECT USING (can_read_tm_review(auth.uid(), review_id));

DROP POLICY IF EXISTS "Users can view tm screening samples" ON public.tm_screening_samples;
CREATE POLICY "Users can view tm screening samples" ON public.tm_screening_samples
  FOR SELECT USING (can_read_tm_review(auth.uid(), review_id));

DROP POLICY IF EXISTS "Users can view tm alert samples" ON public.tm_alert_samples;
CREATE POLICY "Users can view tm alert samples" ON public.tm_alert_samples
  FOR SELECT USING (can_read_tm_review(auth.uid(), review_id));

DROP POLICY IF EXISTS "Users can view tm edd samples" ON public.tm_edd_samples;
CREATE POLICY "Users can view tm edd samples" ON public.tm_edd_samples
  FOR SELECT USING (can_read_tm_review(auth.uid(), review_id));

DROP POLICY IF EXISTS "Users can view tm risk recalc samples" ON public.tm_risk_recalc_samples;
CREATE POLICY "Users can view tm risk recalc samples" ON public.tm_risk_recalc_samples
  FOR SELECT USING (can_read_tm_review(auth.uid(), review_id));

DROP POLICY IF EXISTS "Users can view tm remediation items" ON public.tm_remediation_items;
CREATE POLICY "Users can view tm remediation items" ON public.tm_remediation_items
  FOR SELECT USING (can_read_tm_review(auth.uid(), review_id));

DROP POLICY IF EXISTS "Users can view tm findings" ON public.tm_findings;
CREATE POLICY "Users can view tm findings" ON public.tm_findings
  FOR SELECT USING (can_read_tm_review(auth.uid(), review_id));

DROP POLICY IF EXISTS "Users can view aml program reviews" ON public.aml_program_reviews;
CREATE POLICY "Users can view aml program reviews" ON public.aml_program_reviews
  FOR SELECT USING (can_read_aml_program_review(auth.uid(), id));

DROP POLICY IF EXISTS "Users can view aml pp reviews" ON public.aml_pp_reviews;
CREATE POLICY "Users can view aml pp reviews" ON public.aml_pp_reviews
  FOR SELECT USING (can_read_aml_program_review(auth.uid(), program_review_id));

DROP POLICY IF EXISTS "Users can view aml pp control results" ON public.aml_pp_control_results;
CREATE POLICY "Users can view aml pp control results" ON public.aml_pp_control_results
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.aml_pp_reviews ppr
    WHERE ppr.id = aml_pp_control_results.pp_review_id
      AND can_read_aml_program_review(auth.uid(), ppr.program_review_id)));

DROP POLICY IF EXISTS "Users can view aml pp documents" ON public.aml_pp_documents;
CREATE POLICY "Users can view aml pp documents" ON public.aml_pp_documents
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.aml_pp_reviews ppr
    WHERE ppr.id = aml_pp_documents.pp_review_id
      AND can_read_aml_program_review(auth.uid(), ppr.program_review_id)));

DROP POLICY IF EXISTS "Users can view aml program findings" ON public.aml_program_findings;
CREATE POLICY "Users can view aml program findings" ON public.aml_program_findings
  FOR SELECT USING (has_engagement_access(auth.uid(), engagement_id)
    AND has_module_access(auth.uid(), engagement_id, 'aml_program'));

DROP POLICY IF EXISTS "Editors can write aml program findings" ON public.aml_program_findings;
CREATE POLICY "Editors can write aml program findings"
  ON public.aml_program_findings FOR ALL
  USING (
    CASE
      WHEN pp_review_id IS NULL THEN (
        has_engagement_access(auth.uid(), engagement_id)
        AND has_module_access(auth.uid(), engagement_id, 'aml_program'))
      ELSE EXISTS (
        SELECT 1 FROM public.aml_pp_reviews ppr
        WHERE ppr.id = aml_program_findings.pp_review_id
          AND can_write_aml_program_review(auth.uid(), ppr.program_review_id))
    END)
  WITH CHECK (
    CASE
      WHEN pp_review_id IS NULL THEN (
        has_engagement_access(auth.uid(), engagement_id)
        AND has_module_access(auth.uid(), engagement_id, 'aml_program'))
      ELSE EXISTS (
        SELECT 1 FROM public.aml_pp_reviews ppr
        WHERE ppr.id = aml_program_findings.pp_review_id
          AND can_write_aml_program_review(auth.uid(), ppr.program_review_id))
    END);

DROP POLICY IF EXISTS "Users can view training reviews" ON public.training_reviews;
CREATE POLICY "Users can view training reviews" ON public.training_reviews
  FOR SELECT USING (can_read_training_review(auth.uid(), id));

DROP POLICY IF EXISTS "Users can view training programs" ON public.training_programs;
CREATE POLICY "Users can view training programs" ON public.training_programs
  FOR SELECT USING (can_read_training_review(auth.uid(), review_id));

DROP POLICY IF EXISTS "Users can view training sessions" ON public.training_sessions;
CREATE POLICY "Users can view training sessions" ON public.training_sessions
  FOR SELECT USING (can_read_training_review(auth.uid(), review_id));

DROP POLICY IF EXISTS "Users can view training audiences" ON public.training_audiences;
CREATE POLICY "Users can view training audiences" ON public.training_audiences
  FOR SELECT USING (can_read_training_review(auth.uid(), review_id));

DROP POLICY IF EXISTS "Users can view training issues" ON public.training_issues;
CREATE POLICY "Users can view training issues" ON public.training_issues
  FOR SELECT USING (can_read_training_review(auth.uid(), review_id));

DROP POLICY IF EXISTS "Users can view training evidence" ON public.training_evidence;
CREATE POLICY "Users can view training evidence" ON public.training_evidence
  FOR SELECT USING (can_read_training_review(auth.uid(), review_id));

DROP POLICY IF EXISTS "Users can view training control results" ON public.training_control_results;
CREATE POLICY "Users can view training control results" ON public.training_control_results
  FOR SELECT USING (can_read_training_review(auth.uid(), review_id));

DROP POLICY IF EXISTS "Users can view risk assessment reviews" ON public.risk_assessment_reviews;
CREATE POLICY "Users can view risk assessment reviews" ON public.risk_assessment_reviews
  FOR SELECT USING (can_read_risk_assessment_review(auth.uid(), id));

DROP POLICY IF EXISTS "Users can view risk assessment control results" ON public.risk_assessment_control_results;
CREATE POLICY "Users can view risk assessment control results" ON public.risk_assessment_control_results
  FOR SELECT USING (can_read_risk_assessment_review(auth.uid(), review_id));

DROP POLICY IF EXISTS "Users can view risk assessment documents" ON public.risk_assessment_documents;
CREATE POLICY "Users can view risk assessment documents" ON public.risk_assessment_documents
  FOR SELECT USING (can_read_risk_assessment_review(auth.uid(), review_id));

DROP POLICY IF EXISTS "Users can view effectiveness reviews" ON public.effectiveness_reviews;
CREATE POLICY "Users can view effectiveness reviews" ON public.effectiveness_reviews
  FOR SELECT USING (can_read_effectiveness_review(auth.uid(), id));
