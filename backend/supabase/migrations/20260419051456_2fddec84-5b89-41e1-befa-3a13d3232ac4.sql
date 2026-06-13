-- Effectiveness Review module: 24-month timeline test
CREATE TABLE public.effectiveness_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',

  -- Entity context
  is_first_review boolean,
  msb_registration_date date,
  operations_commenced_date date,

  -- Previous review start date inputs
  prev_start_basis text, -- 'engagement_letter' | 'first_correspondence' | 'msb_registration' | 'operations_commenced'
  prev_engagement_letter_date date,
  prev_first_correspondence_date date,
  prev_start_date date, -- computed/selected effective start date

  -- Current review start date inputs
  curr_engagement_letter_date date,
  curr_first_correspondence_date date,
  curr_start_basis text, -- 'engagement_letter' | 'first_correspondence'
  curr_start_date date,

  -- Result
  elapsed_months numeric,
  test_result text, -- 'pass' | 'partial' | 'fail' | 'na'
  points_achieved integer,
  max_points integer NOT NULL DEFAULT 2,
  deficiency_flag boolean DEFAULT false,

  -- Documentation
  evidence_reviewed text,
  document_reference text,
  comments text,
  observation_best_practice text,
  summary_for_report text,

  reviewed_by uuid,
  reviewed_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engagement_id)
);

ALTER TABLE public.effectiveness_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view effectiveness reviews for assigned engagements"
ON public.effectiveness_reviews FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.engagements e
    JOIN public.client_assignments ca ON ca.client_id = e.client_id
    WHERE e.id = effectiveness_reviews.engagement_id AND ca.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'partner')
  OR public.has_role(auth.uid(), 'lead_consultant')
);

CREATE POLICY "Users can insert effectiveness reviews for assigned engagements"
ON public.effectiveness_reviews FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.engagements e
    JOIN public.client_assignments ca ON ca.client_id = e.client_id
    WHERE e.id = effectiveness_reviews.engagement_id AND ca.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'partner')
  OR public.has_role(auth.uid(), 'lead_consultant')
);

CREATE POLICY "Users can update effectiveness reviews for assigned engagements"
ON public.effectiveness_reviews FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.engagements e
    JOIN public.client_assignments ca ON ca.client_id = e.client_id
    WHERE e.id = effectiveness_reviews.engagement_id AND ca.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'partner')
  OR public.has_role(auth.uid(), 'lead_consultant')
);

CREATE POLICY "Admins can delete effectiveness reviews"
ON public.effectiveness_reviews FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_effectiveness_reviews_updated_at
BEFORE UPDATE ON public.effectiveness_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
