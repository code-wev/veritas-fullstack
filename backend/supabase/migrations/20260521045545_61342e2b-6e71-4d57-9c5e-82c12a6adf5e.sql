ALTER TABLE public.training_reviews
  ADD COLUMN IF NOT EXISTS lock_state TEXT NOT NULL DEFAULT 'draft'
    CHECK (lock_state IN ('draft', 'manager_review', 'partner_review', 'finalized')),
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_unlocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_unlocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unlock_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.can_write_training_review(_user_id UUID, _review_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.training_reviews r
    WHERE r.id = _review_id
      AND has_engagement_access(_user_id, r.engagement_id)
      AND (r.lock_state <> 'finalized' OR can_unlock_audit_report(_user_id))
  )
$$;

DO $$
DECLARE pol RECORD; tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'training_reviews', 'training_programs', 'training_sessions',
    'training_audiences', 'training_issues', 'training_evidence',
    'training_control_results'
  ]::TEXT[]
  LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=tbl LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

CREATE POLICY "Users can view training reviews" ON public.training_reviews FOR SELECT
  USING (has_engagement_access(auth.uid(), engagement_id));
CREATE POLICY "Editors can update training reviews" ON public.training_reviews FOR UPDATE
  USING (can_write_training_review(auth.uid(), id))
  WITH CHECK (can_write_training_review(auth.uid(), id));
CREATE POLICY "Editors can insert training reviews" ON public.training_reviews FOR INSERT
  WITH CHECK (has_engagement_access(auth.uid(), engagement_id) AND can_edit_findings(auth.uid()));
CREATE POLICY "Partners can delete training reviews" ON public.training_reviews FOR DELETE
  USING (has_engagement_access(auth.uid(), engagement_id) AND can_unlock_audit_report(auth.uid()) AND lock_state <> 'finalized');

CREATE POLICY "Users can view training programs" ON public.training_programs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.training_reviews r WHERE r.id = training_programs.review_id AND has_engagement_access(auth.uid(), r.engagement_id)));
CREATE POLICY "Editors can write training programs" ON public.training_programs FOR ALL
  USING (can_write_training_review(auth.uid(), review_id))
  WITH CHECK (can_write_training_review(auth.uid(), review_id));

CREATE POLICY "Users can view training sessions" ON public.training_sessions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.training_reviews r WHERE r.id = training_sessions.review_id AND has_engagement_access(auth.uid(), r.engagement_id)));
CREATE POLICY "Editors can write training sessions" ON public.training_sessions FOR ALL
  USING (can_write_training_review(auth.uid(), review_id))
  WITH CHECK (can_write_training_review(auth.uid(), review_id));

CREATE POLICY "Users can view training audiences" ON public.training_audiences FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.training_reviews r WHERE r.id = training_audiences.review_id AND has_engagement_access(auth.uid(), r.engagement_id)));
CREATE POLICY "Editors can write training audiences" ON public.training_audiences FOR ALL
  USING (can_write_training_review(auth.uid(), review_id))
  WITH CHECK (can_write_training_review(auth.uid(), review_id));

CREATE POLICY "Users can view training issues" ON public.training_issues FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.training_reviews r WHERE r.id = training_issues.review_id AND has_engagement_access(auth.uid(), r.engagement_id)));
CREATE POLICY "Editors can write training issues" ON public.training_issues FOR ALL
  USING (can_write_training_review(auth.uid(), review_id))
  WITH CHECK (can_write_training_review(auth.uid(), review_id));

CREATE POLICY "Users can view training evidence" ON public.training_evidence FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.training_reviews r WHERE r.id = training_evidence.review_id AND has_engagement_access(auth.uid(), r.engagement_id)));
CREATE POLICY "Editors can write training evidence" ON public.training_evidence FOR ALL
  USING (can_write_training_review(auth.uid(), review_id))
  WITH CHECK (can_write_training_review(auth.uid(), review_id));

CREATE POLICY "Users can view training control results" ON public.training_control_results FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.training_reviews r WHERE r.id = training_control_results.review_id AND has_engagement_access(auth.uid(), r.engagement_id)));
CREATE POLICY "Editors can write training control results" ON public.training_control_results FOR ALL
  USING (can_write_training_review(auth.uid(), review_id))
  WITH CHECK (can_write_training_review(auth.uid(), review_id));