
-- Fix RLS policies for msb_registrations - arguments were in wrong order
DROP POLICY IF EXISTS "Users with engagement access can view registrations" ON public.msb_registrations;
DROP POLICY IF EXISTS "Users with engagement access can insert registrations" ON public.msb_registrations;
DROP POLICY IF EXISTS "Users with engagement access can update registrations" ON public.msb_registrations;
DROP POLICY IF EXISTS "Users with engagement access can delete registrations" ON public.msb_registrations;

CREATE POLICY "Users with engagement access can view registrations"
  ON public.msb_registrations FOR SELECT
  USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users with engagement access can insert registrations"
  ON public.msb_registrations FOR INSERT
  WITH CHECK (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users with engagement access can update registrations"
  ON public.msb_registrations FOR UPDATE
  USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users with engagement access can delete registrations"
  ON public.msb_registrations FOR DELETE
  USING (public.has_engagement_access(auth.uid(), engagement_id));

-- Fix RLS policies for msb_status_validation
DROP POLICY IF EXISTS "Users with engagement access can manage status validation" ON public.msb_status_validation;

CREATE POLICY "Users with engagement access can manage status validation"
  ON public.msb_status_validation FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.msb_registrations r 
    WHERE r.id = registration_id 
    AND public.has_engagement_access(auth.uid(), r.engagement_id)
  ));

-- Fix RLS policies for msb_change_detection
DROP POLICY IF EXISTS "Users with engagement access can manage change detection" ON public.msb_change_detection;

CREATE POLICY "Users with engagement access can manage change detection"
  ON public.msb_change_detection FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.msb_registrations r 
    WHERE r.id = registration_id 
    AND public.has_engagement_access(auth.uid(), r.engagement_id)
  ));

-- Fix RLS policies for msb_notification_assessment
DROP POLICY IF EXISTS "Users with engagement access can manage notification assessments" ON public.msb_notification_assessment;

CREATE POLICY "Users with engagement access can manage notification assessment"
  ON public.msb_notification_assessment FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.msb_registrations r 
    WHERE r.id = registration_id 
    AND public.has_engagement_access(auth.uid(), r.engagement_id)
  ));

-- Fix RLS policies for msb_review_checklist
DROP POLICY IF EXISTS "Users with engagement access can manage review checklist" ON public.msb_review_checklist;

CREATE POLICY "Users with engagement access can manage review checklist"
  ON public.msb_review_checklist FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.msb_registrations r 
    WHERE r.id = registration_id 
    AND public.has_engagement_access(auth.uid(), r.engagement_id)
  ));
