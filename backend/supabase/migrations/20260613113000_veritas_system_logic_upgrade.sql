-- =========================================================================
-- Migration: Upgrade Veritas AML compliance logic (MSB & Governance)
-- =========================================================================

-- 1. Upgrade msb_registrations table with lock-state and tracking columns
ALTER TABLE public.msb_registrations
  ADD COLUMN IF NOT EXISTS lock_state TEXT NOT NULL DEFAULT 'draft' CHECK (lock_state IN ('draft', 'manager_review', 'partner_review', 'finalized')),
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_unlocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_unlocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unlock_count INTEGER NOT NULL DEFAULT 0;

-- 2. Upgrade governance_summary table with lock-state and tracking columns
ALTER TABLE public.governance_summary
  ADD COLUMN IF NOT EXISTS lock_state TEXT NOT NULL DEFAULT 'draft' CHECK (lock_state IN ('draft', 'manager_review', 'partner_review', 'finalized')),
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_unlocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_unlocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unlock_count INTEGER NOT NULL DEFAULT 0;

-- 3. Create review lock state change handling function
CREATE OR REPLACE FUNCTION public.handle_review_lock_state_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Transition to finalized
  IF NEW.lock_state = 'finalized' AND (OLD.lock_state IS NULL OR OLD.lock_state <> 'finalized') THEN
    NEW.finalized_at := now();
    NEW.finalized_by := auth.uid();
  END IF;

  -- Transition from finalized to draft/review (unlocking)
  IF OLD.lock_state = 'finalized' AND NEW.lock_state <> 'finalized' THEN
    NEW.last_unlocked_at := now();
    NEW.last_unlocked_by := auth.uid();
    NEW.unlock_count := OLD.unlock_count + 1;
    -- Clear finalization details
    NEW.finalized_at := NULL;
    NEW.finalized_by := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Apply trigger to all review tables
DROP TRIGGER IF EXISTS trg_lock_state_change ON public.reporting_reviews;
CREATE TRIGGER trg_lock_state_change BEFORE UPDATE ON public.reporting_reviews FOR EACH ROW EXECUTE FUNCTION public.handle_review_lock_state_change();

DROP TRIGGER IF EXISTS trg_lock_state_change ON public.kyc_reviews;
CREATE TRIGGER trg_lock_state_change BEFORE UPDATE ON public.kyc_reviews FOR EACH ROW EXECUTE FUNCTION public.handle_review_lock_state_change();

DROP TRIGGER IF EXISTS trg_lock_state_change ON public.tm_reviews;
CREATE TRIGGER trg_lock_state_change BEFORE UPDATE ON public.tm_reviews FOR EACH ROW EXECUTE FUNCTION public.handle_review_lock_state_change();

DROP TRIGGER IF EXISTS trg_lock_state_change ON public.aml_program_reviews;
CREATE TRIGGER trg_lock_state_change BEFORE UPDATE ON public.aml_program_reviews FOR EACH ROW EXECUTE FUNCTION public.handle_review_lock_state_change();

DROP TRIGGER IF EXISTS trg_lock_state_change ON public.training_reviews;
CREATE TRIGGER trg_lock_state_change BEFORE UPDATE ON public.training_reviews FOR EACH ROW EXECUTE FUNCTION public.handle_review_lock_state_change();

DROP TRIGGER IF EXISTS trg_lock_state_change ON public.risk_assessment_reviews;
CREATE TRIGGER trg_lock_state_change BEFORE UPDATE ON public.risk_assessment_reviews FOR EACH ROW EXECUTE FUNCTION public.handle_review_lock_state_change();

DROP TRIGGER IF EXISTS trg_lock_state_change ON public.effectiveness_reviews;
CREATE TRIGGER trg_lock_state_change BEFORE UPDATE ON public.effectiveness_reviews FOR EACH ROW EXECUTE FUNCTION public.handle_review_lock_state_change();

DROP TRIGGER IF EXISTS trg_lock_state_change ON public.msb_registrations;
CREATE TRIGGER trg_lock_state_change BEFORE UPDATE ON public.msb_registrations FOR EACH ROW EXECUTE FUNCTION public.handle_review_lock_state_change();

DROP TRIGGER IF EXISTS trg_lock_state_change ON public.governance_summary;
CREATE TRIGGER trg_lock_state_change BEFORE UPDATE ON public.governance_summary FOR EACH ROW EXECUTE FUNCTION public.handle_review_lock_state_change();

DROP TRIGGER IF EXISTS trg_lock_state_change ON public.audit_reports;
CREATE TRIGGER trg_lock_state_change BEFORE UPDATE ON public.audit_reports FOR EACH ROW EXECUTE FUNCTION public.handle_review_lock_state_change();

-- 5. Create write guards for MSB and Governance
CREATE OR REPLACE FUNCTION public.can_write_msb_registration(_user_id UUID, _registration_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.msb_registrations r
    WHERE r.id = _registration_id
      AND has_engagement_access(_user_id, r.engagement_id)
      AND has_module_access(_user_id, r.engagement_id, 'msb_registration')
      AND (r.lock_state <> 'finalized' OR can_unlock_audit_report(_user_id))
  )
$$;

CREATE OR REPLACE FUNCTION public.can_write_governance_review(_user_id UUID, _engagement_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.governance_summary s
    WHERE s.engagement_id = _engagement_id
      AND has_engagement_access(_user_id, _engagement_id)
      AND has_module_access(_user_id, _engagement_id, 'governance')
      AND (s.lock_state <> 'finalized' OR can_unlock_audit_report(_user_id))
  )
  OR (
    NOT EXISTS (SELECT 1 FROM public.governance_summary s WHERE s.engagement_id = _engagement_id)
    AND has_engagement_access(_user_id, _engagement_id)
    AND has_module_access(_user_id, _engagement_id, 'governance')
  )
$$;

-- 6. Rebuild RLS Policies for MSB Tables
DO $$
DECLARE pol RECORD; tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'msb_registrations', 'msb_status_validation', 'msb_change_detection',
    'msb_notification_assessment', 'msb_review_checklist', 'msb_validation_evidence',
    'msb_registry_screenshots'
  ]::TEXT[]
  LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=tbl LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

CREATE POLICY "Users view msb_registrations" ON public.msb_registrations FOR SELECT
  USING (has_engagement_access(auth.uid(), engagement_id) AND has_module_access(auth.uid(), engagement_id, 'msb_registration'));
CREATE POLICY "Users insert msb_registrations" ON public.msb_registrations FOR INSERT
  WITH CHECK (has_engagement_access(auth.uid(), engagement_id) AND has_module_access(auth.uid(), engagement_id, 'msb_registration'));
CREATE POLICY "Users update msb_registrations" ON public.msb_registrations FOR UPDATE
  USING (can_write_msb_registration(auth.uid(), id))
  WITH CHECK (can_write_msb_registration(auth.uid(), id));
CREATE POLICY "Users delete msb_registrations" ON public.msb_registrations FOR DELETE
  USING (can_write_msb_registration(auth.uid(), id));

CREATE POLICY "Users view msb_status_validation" ON public.msb_status_validation FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.msb_registrations r WHERE r.id = registration_id AND has_engagement_access(auth.uid(), r.engagement_id) AND has_module_access(auth.uid(), r.engagement_id, 'msb_registration')));
CREATE POLICY "Users write msb_status_validation" ON public.msb_status_validation FOR ALL
  USING (EXISTS (SELECT 1 FROM public.msb_registrations r WHERE r.id = registration_id AND can_write_msb_registration(auth.uid(), r.id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.msb_registrations r WHERE r.id = registration_id AND can_write_msb_registration(auth.uid(), r.id)));

CREATE POLICY "Users view msb_change_detection" ON public.msb_change_detection FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.msb_registrations r WHERE r.id = registration_id AND has_engagement_access(auth.uid(), r.engagement_id) AND has_module_access(auth.uid(), r.engagement_id, 'msb_registration')));
CREATE POLICY "Users write msb_change_detection" ON public.msb_change_detection FOR ALL
  USING (EXISTS (SELECT 1 FROM public.msb_registrations r WHERE r.id = registration_id AND can_write_msb_registration(auth.uid(), r.id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.msb_registrations r WHERE r.id = registration_id AND can_write_msb_registration(auth.uid(), r.id)));

CREATE POLICY "Users view msb_notification_assessment" ON public.msb_notification_assessment FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.msb_registrations r WHERE r.id = registration_id AND has_engagement_access(auth.uid(), r.engagement_id) AND has_module_access(auth.uid(), r.engagement_id, 'msb_registration')));
CREATE POLICY "Users write msb_notification_assessment" ON public.msb_notification_assessment FOR ALL
  USING (EXISTS (SELECT 1 FROM public.msb_registrations r WHERE r.id = registration_id AND can_write_msb_registration(auth.uid(), r.id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.msb_registrations r WHERE r.id = registration_id AND can_write_msb_registration(auth.uid(), r.id)));

CREATE POLICY "Users view msb_review_checklist" ON public.msb_review_checklist FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.msb_registrations r WHERE r.id = registration_id AND has_engagement_access(auth.uid(), r.engagement_id) AND has_module_access(auth.uid(), r.engagement_id, 'msb_registration')));
CREATE POLICY "Users write msb_review_checklist" ON public.msb_review_checklist FOR ALL
  USING (EXISTS (SELECT 1 FROM public.msb_registrations r WHERE r.id = registration_id AND can_write_msb_registration(auth.uid(), r.id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.msb_registrations r WHERE r.id = registration_id AND can_write_msb_registration(auth.uid(), r.id)));

CREATE POLICY "Users view msb_validation_evidence" ON public.msb_validation_evidence FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.msb_registrations r WHERE r.id = registration_id AND has_engagement_access(auth.uid(), r.engagement_id) AND has_module_access(auth.uid(), r.engagement_id, 'msb_registration')));
CREATE POLICY "Users write msb_validation_evidence" ON public.msb_validation_evidence FOR ALL
  USING (can_write_msb_registration(auth.uid(), registration_id))
  WITH CHECK (can_write_msb_registration(auth.uid(), registration_id));

CREATE POLICY "Users view msb_registry_screenshots" ON public.msb_registry_screenshots FOR SELECT
  USING (has_engagement_access(auth.uid(), engagement_id) AND has_module_access(auth.uid(), engagement_id, 'msb_registration'));
CREATE POLICY "Users write msb_registry_screenshots" ON public.msb_registry_screenshots FOR ALL
  USING (can_write_msb_registration(auth.uid(), registration_id))
  WITH CHECK (can_write_msb_registration(auth.uid(), registration_id));


-- 7. Rebuild RLS Policies for Governance Tables
DO $$
DECLARE pol RECORD; tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'governance_interviews', 'governance_responses', 'governance_changes',
    'governance_module_status', 'governance_summary', 'governance_interviewees',
    'governance_interview_evidence'
  ]::TEXT[]
  LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=tbl LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

CREATE POLICY "Users view governance_summary" ON public.governance_summary FOR SELECT
  USING (has_engagement_access(auth.uid(), engagement_id) AND has_module_access(auth.uid(), engagement_id, 'governance'));
CREATE POLICY "Users write governance_summary" ON public.governance_summary FOR ALL
  USING (can_write_governance_review(auth.uid(), engagement_id))
  WITH CHECK (can_write_governance_review(auth.uid(), engagement_id));

CREATE POLICY "Users view governance_interviews" ON public.governance_interviews FOR SELECT
  USING (has_engagement_access(auth.uid(), engagement_id) AND has_module_access(auth.uid(), engagement_id, 'governance'));
CREATE POLICY "Users write governance_interviews" ON public.governance_interviews FOR ALL
  USING (can_write_governance_review(auth.uid(), engagement_id))
  WITH CHECK (can_write_governance_review(auth.uid(), engagement_id));

CREATE POLICY "Users manage governance_responses" ON public.governance_responses FOR ALL
  USING (EXISTS (SELECT 1 FROM public.governance_interviews i WHERE i.id = interview_id AND can_write_governance_review(auth.uid(), i.engagement_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.governance_interviews i WHERE i.id = interview_id AND can_write_governance_review(auth.uid(), i.engagement_id)));

CREATE POLICY "Users view governance_changes" ON public.governance_changes FOR SELECT
  USING (has_engagement_access(auth.uid(), engagement_id) AND has_module_access(auth.uid(), engagement_id, 'governance'));
CREATE POLICY "Users write governance_changes" ON public.governance_changes FOR ALL
  USING (can_write_governance_review(auth.uid(), engagement_id))
  WITH CHECK (can_write_governance_review(auth.uid(), engagement_id));

CREATE POLICY "Users view governance_module_status" ON public.governance_module_status FOR SELECT
  USING (has_engagement_access(auth.uid(), engagement_id) AND has_module_access(auth.uid(), engagement_id, 'governance'));
CREATE POLICY "Users write governance_module_status" ON public.governance_module_status FOR ALL
  USING (can_write_governance_review(auth.uid(), engagement_id))
  WITH CHECK (can_write_governance_review(auth.uid(), engagement_id));

CREATE POLICY "Users view governance_interviewees" ON public.governance_interviewees FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.governance_interviews i WHERE i.id = interview_id AND has_engagement_access(auth.uid(), i.engagement_id) AND has_module_access(auth.uid(), i.engagement_id, 'governance')));
CREATE POLICY "Users write governance_interviewees" ON public.governance_interviewees FOR ALL
  USING (EXISTS (SELECT 1 FROM public.governance_interviews i WHERE i.id = interview_id AND can_write_governance_review(auth.uid(), i.engagement_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.governance_interviews i WHERE i.id = interview_id AND can_write_governance_review(auth.uid(), i.engagement_id)));

CREATE POLICY "Users view governance_interview_evidence" ON public.governance_interview_evidence FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.governance_interviews i WHERE i.id = interview_id AND has_engagement_access(auth.uid(), i.engagement_id) AND has_module_access(auth.uid(), i.engagement_id, 'governance')));
CREATE POLICY "Users write governance_interview_evidence" ON public.governance_interview_evidence FOR ALL
  USING (EXISTS (SELECT 1 FROM public.governance_interviews i WHERE i.id = interview_id AND can_write_governance_review(auth.uid(), i.engagement_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.governance_interviews i WHERE i.id = interview_id AND can_write_governance_review(auth.uid(), i.engagement_id)));
