-- =====================================================================
-- TRANSACTION MONITORING MODULE — 6 Working Papers
-- Sub-modules: sanctions_screening, alert_review, edd, risk_recalc,
--              fintrac_remediation, prior_review_remediation
-- =====================================================================

-- 1. Parent review record (one per engagement)
CREATE TABLE public.tm_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id UUID NOT NULL UNIQUE REFERENCES public.engagements(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress', -- in_progress | reviewed | approved
  current_submodule TEXT DEFAULT 'sanctions_screening',
  overall_assessment TEXT,
  summary_for_report TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Per-submodule status / scoring (one row per submodule per review)
CREATE TABLE public.tm_submodule_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.tm_reviews(id) ON DELETE CASCADE,
  submodule TEXT NOT NULL, -- sanctions_screening | alert_review | edd | risk_recalc | fintrac_remediation | prior_review_remediation
  status TEXT NOT NULL DEFAULT 'not_started', -- not_started | in_progress | reviewed | approved
  test_result TEXT, -- pass | partial | fail | na
  points_achieved NUMERIC,
  max_points NUMERIC DEFAULT 2,
  deficiency_flag BOOLEAN DEFAULT false,
  summary_narrative TEXT,
  observation_best_practice TEXT,
  evidence_reviewed TEXT,
  document_reference TEXT,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (review_id, submodule)
);

-- 3. Generic checklist responses for walkthrough/framework sections
CREATE TABLE public.tm_checklist_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.tm_reviews(id) ON DELETE CASCADE,
  submodule TEXT NOT NULL,
  section_code TEXT NOT NULL,         -- e.g. 'screening_framework', 'name_set', 'timeliness'
  section_name TEXT NOT NULL,
  item_code TEXT NOT NULL,            -- stable identifier for each checkbox
  item_text TEXT NOT NULL,
  is_checked BOOLEAN DEFAULT false,
  is_watch_out BOOLEAN DEFAULT false, -- true for "ANALYST WATCH-OUT" items
  notes TEXT,
  evidence_file_ids UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (review_id, submodule, item_code)
);

-- 4. Sanctions/PEP/HIO/Adverse media — Test name samples (10+)
CREATE TABLE public.tm_screening_samples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.tm_reviews(id) ON DELETE CASCADE,
  sample_number INT NOT NULL,
  test_name TEXT NOT NULL,
  list_source TEXT,                    -- canada_sanctions | ofac | un | uk_hmt | pep | hio | adverse_media | other
  list_status TEXT,                    -- active | recently_added | recently_removed | pep | hio | close_associate
  date_added_to_list DATE,
  date_removed_from_list DATE,
  expected_result TEXT,                -- should_flag | should_not_flag
  system_flagged BOOLEAN,              -- yes / no
  match_type TEXT,                     -- exact | partial | fuzzy | none
  test_result TEXT,                    -- pass | fail | na
  fuzzy_threshold_used TEXT,
  notes TEXT,
  evidence_file_ids UUID[],
  test_date DATE,
  tested_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tm_screening_samples_review ON public.tm_screening_samples(review_id);

-- 5. Alert review samples
CREATE TABLE public.tm_alert_samples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.tm_reviews(id) ON DELETE CASCADE,
  alert_id TEXT,
  alert_type TEXT,                     -- transaction_monitoring | sanctions | pep | adverse_media | other
  alert_date DATE,
  reviewed_date DATE,
  sla_days INT,
  within_sla BOOLEAN,
  customer_profile_reviewed BOOLEAN DEFAULT false,
  transaction_history_reviewed BOOLEAN DEFAULT false,
  supporting_docs_considered BOOLEAN DEFAULT false,
  disposition TEXT,                    -- suspicious | not_suspicious | escalated | str_filed
  rationale TEXT,
  rationale_quality TEXT,              -- adequate | generic | missing
  test_result TEXT,                    -- pass | partial | fail | na
  notes TEXT,
  evidence_file_ids UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tm_alert_samples_review ON public.tm_alert_samples(review_id);

-- 6. EDD (high-risk customer) samples
CREATE TABLE public.tm_edd_samples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.tm_reviews(id) ON DELETE CASCADE,
  customer_id TEXT,
  customer_name TEXT,
  high_risk_reason TEXT,
  source_of_funds_obtained BOOLEAN DEFAULT false,
  source_of_wealth_obtained BOOLEAN DEFAULT false,
  source_of_wealth_required BOOLEAN DEFAULT false,
  transaction_review_conducted BOOLEAN DEFAULT false,
  senior_mgmt_approval BOOLEAN DEFAULT false,
  supporting_docs_retained BOOLEAN DEFAULT false,
  evidence_aligns_policy BOOLEAN DEFAULT false,
  adverse_media_conducted BOOLEAN DEFAULT false,
  enhanced_monitoring BOOLEAN DEFAULT false,
  policy_compliance_result TEXT,       -- pass | partial | fail
  best_practice_result TEXT,           -- pass | partial | fail | na
  notes TEXT,
  evidence_file_ids UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tm_edd_samples_review ON public.tm_edd_samples(review_id);

-- 7. Risk rating recalculation samples
CREATE TABLE public.tm_risk_recalc_samples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.tm_reviews(id) ON DELETE CASCADE,
  customer_id TEXT,
  customer_name TEXT,
  trigger_type TEXT,                   -- str_filed | high_volume | adverse_media | pep_match | other
  trigger_description TEXT,
  system_risk_rating TEXT,
  manual_risk_rating TEXT,
  ratings_match BOOLEAN,
  test_result TEXT,                    -- pass | fail | na
  notes TEXT,
  evidence_file_ids UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tm_risk_recalc_samples_review ON public.tm_risk_recalc_samples(review_id);

-- 8. Remediation tracking (used for both FINTRAC examination findings + prior AML review findings)
CREATE TABLE public.tm_remediation_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.tm_reviews(id) ON DELETE CASCADE,
  source TEXT NOT NULL,                -- fintrac_exam | prior_aml_review
  source_reference TEXT,               -- finding ID, exam letter ref, etc.
  finding_description TEXT NOT NULL,
  recommendation TEXT,
  remediation_plan TEXT,
  target_date DATE,
  actual_completion_date DATE,
  implementation_status TEXT,          -- not_started | in_progress | completed | overdue
  evidence_available BOOLEAN DEFAULT false,
  timeline_met BOOLEAN,
  effectiveness_status TEXT,           -- fully_resolved | partially_resolved | unresolved | recurring
  residual_risk_notes TEXT,
  test_result TEXT,                    -- pass | partial | fail | na
  notes TEXT,
  evidence_file_ids UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tm_remediation_review ON public.tm_remediation_items(review_id, source);

-- 9. Auto-generated findings table (mirrors pattern in other modules)
CREATE TABLE public.tm_findings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES public.tm_reviews(id) ON DELETE CASCADE,
  submodule TEXT NOT NULL,
  source_id UUID,                      -- id of the screening sample / alert / edd / etc.
  source_table TEXT,
  finding_title TEXT NOT NULL,
  finding_description TEXT,
  recommendation TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  is_auto_generated BOOLEAN DEFAULT true,
  management_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tm_findings_engagement ON public.tm_findings(engagement_id);

-- =====================================================================
-- ENABLE RLS
-- =====================================================================
ALTER TABLE public.tm_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_submodule_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_checklist_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_screening_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_alert_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_edd_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_risk_recalc_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_remediation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_findings ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- RLS POLICIES (engagement-scoped, mirrors existing modules)
-- =====================================================================
CREATE POLICY "TM reviews engagement access" ON public.tm_reviews
  FOR ALL TO authenticated
  USING (public.has_engagement_access(auth.uid(), engagement_id))
  WITH CHECK (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "TM submodule status engagement access" ON public.tm_submodule_status
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tm_reviews r WHERE r.id = review_id AND public.has_engagement_access(auth.uid(), r.engagement_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tm_reviews r WHERE r.id = review_id AND public.has_engagement_access(auth.uid(), r.engagement_id)));

CREATE POLICY "TM checklist engagement access" ON public.tm_checklist_responses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tm_reviews r WHERE r.id = review_id AND public.has_engagement_access(auth.uid(), r.engagement_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tm_reviews r WHERE r.id = review_id AND public.has_engagement_access(auth.uid(), r.engagement_id)));

CREATE POLICY "TM screening samples engagement access" ON public.tm_screening_samples
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tm_reviews r WHERE r.id = review_id AND public.has_engagement_access(auth.uid(), r.engagement_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tm_reviews r WHERE r.id = review_id AND public.has_engagement_access(auth.uid(), r.engagement_id)));

CREATE POLICY "TM alert samples engagement access" ON public.tm_alert_samples
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tm_reviews r WHERE r.id = review_id AND public.has_engagement_access(auth.uid(), r.engagement_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tm_reviews r WHERE r.id = review_id AND public.has_engagement_access(auth.uid(), r.engagement_id)));

CREATE POLICY "TM edd samples engagement access" ON public.tm_edd_samples
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tm_reviews r WHERE r.id = review_id AND public.has_engagement_access(auth.uid(), r.engagement_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tm_reviews r WHERE r.id = review_id AND public.has_engagement_access(auth.uid(), r.engagement_id)));

CREATE POLICY "TM risk recalc engagement access" ON public.tm_risk_recalc_samples
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tm_reviews r WHERE r.id = review_id AND public.has_engagement_access(auth.uid(), r.engagement_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tm_reviews r WHERE r.id = review_id AND public.has_engagement_access(auth.uid(), r.engagement_id)));

CREATE POLICY "TM remediation engagement access" ON public.tm_remediation_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tm_reviews r WHERE r.id = review_id AND public.has_engagement_access(auth.uid(), r.engagement_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tm_reviews r WHERE r.id = review_id AND public.has_engagement_access(auth.uid(), r.engagement_id)));

CREATE POLICY "TM findings engagement access" ON public.tm_findings
  FOR ALL TO authenticated
  USING (public.has_engagement_access(auth.uid(), engagement_id))
  WITH CHECK (public.has_engagement_access(auth.uid(), engagement_id));

-- =====================================================================
-- Updated-at triggers
-- =====================================================================
CREATE TRIGGER tm_reviews_updated_at BEFORE UPDATE ON public.tm_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tm_submodule_status_updated_at BEFORE UPDATE ON public.tm_submodule_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tm_checklist_updated_at BEFORE UPDATE ON public.tm_checklist_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tm_screening_samples_updated_at BEFORE UPDATE ON public.tm_screening_samples
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tm_alert_samples_updated_at BEFORE UPDATE ON public.tm_alert_samples
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tm_edd_samples_updated_at BEFORE UPDATE ON public.tm_edd_samples
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tm_risk_recalc_updated_at BEFORE UPDATE ON public.tm_risk_recalc_samples
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tm_remediation_updated_at BEFORE UPDATE ON public.tm_remediation_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tm_findings_updated_at BEFORE UPDATE ON public.tm_findings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- Mirror tm_findings into central public.findings register
-- =====================================================================
CREATE OR REPLACE FUNCTION public.sync_tm_finding_to_findings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
  v_module TEXT := 'transaction_monitoring';
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.findings
     WHERE engagement_id = OLD.engagement_id
       AND module = v_module
       AND title = OLD.finding_title
       AND submodule = OLD.submodule;
    RETURN OLD;
  END IF;

  SELECT id INTO v_existing_id
    FROM public.findings
   WHERE engagement_id = NEW.engagement_id
     AND module = v_module
     AND submodule = NEW.submodule
     AND title = NEW.finding_title
   LIMIT 1;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.findings (
      engagement_id, module, submodule, title, observation, description,
      severity, status, recommendation, management_response, date_identified
    ) VALUES (
      NEW.engagement_id, v_module, NEW.submodule, NEW.finding_title,
      NEW.finding_description, NEW.finding_description,
      NEW.severity,
      CASE NEW.status WHEN 'closed' THEN 'final' WHEN 'in_progress' THEN 'reviewed' ELSE 'draft' END,
      NEW.recommendation, NEW.management_response, CURRENT_DATE
    );
  ELSE
    UPDATE public.findings
       SET observation = NEW.finding_description,
           description = NEW.finding_description,
           severity = NEW.severity,
           status = CASE NEW.status WHEN 'closed' THEN 'final' WHEN 'in_progress' THEN 'reviewed' ELSE 'draft' END,
           recommendation = NEW.recommendation,
           management_response = NEW.management_response,
           updated_at = now()
     WHERE id = v_existing_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_tm_findings_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.tm_findings
FOR EACH ROW EXECUTE FUNCTION public.sync_tm_finding_to_findings();