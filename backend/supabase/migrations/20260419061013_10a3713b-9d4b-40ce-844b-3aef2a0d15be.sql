-- Auto-create empty review records for every audit module on every
-- existing engagement and every new engagement going forward.

CREATE OR REPLACE FUNCTION public.seed_engagement_module_reviews()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.aml_program_reviews (engagement_id)        VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.kyc_reviews (engagement_id)                VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.reporting_reviews (engagement_id)          VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.tm_reviews (engagement_id)                 VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.risk_assessment_reviews (engagement_id)    VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.training_reviews (engagement_id)           VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.effectiveness_reviews (engagement_id)      VALUES (NEW.id) ON CONFLICT DO NOTHING;

  INSERT INTO public.msb_registrations (engagement_id, registration_type)
  VALUES (NEW.id, 'fintrac')
  ON CONFLICT DO NOTHING;
  INSERT INTO public.msb_registrations (engagement_id, registration_type)
  VALUES (NEW.id, 'revenu_quebec')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_engagement_module_reviews ON public.engagements;
CREATE TRIGGER trg_seed_engagement_module_reviews
AFTER INSERT ON public.engagements
FOR EACH ROW
EXECUTE FUNCTION public.seed_engagement_module_reviews();

-- Backfill existing engagements
INSERT INTO public.aml_program_reviews (engagement_id)
SELECT e.id FROM public.engagements e
LEFT JOIN public.aml_program_reviews r ON r.engagement_id = e.id
WHERE r.id IS NULL;

INSERT INTO public.kyc_reviews (engagement_id)
SELECT e.id FROM public.engagements e
LEFT JOIN public.kyc_reviews r ON r.engagement_id = e.id
WHERE r.id IS NULL;

INSERT INTO public.reporting_reviews (engagement_id)
SELECT e.id FROM public.engagements e
LEFT JOIN public.reporting_reviews r ON r.engagement_id = e.id
WHERE r.id IS NULL;

INSERT INTO public.tm_reviews (engagement_id)
SELECT e.id FROM public.engagements e
LEFT JOIN public.tm_reviews r ON r.engagement_id = e.id
WHERE r.id IS NULL;

INSERT INTO public.risk_assessment_reviews (engagement_id)
SELECT e.id FROM public.engagements e
LEFT JOIN public.risk_assessment_reviews r ON r.engagement_id = e.id
WHERE r.id IS NULL;

INSERT INTO public.training_reviews (engagement_id)
SELECT e.id FROM public.engagements e
LEFT JOIN public.training_reviews r ON r.engagement_id = e.id
WHERE r.id IS NULL;

INSERT INTO public.effectiveness_reviews (engagement_id)
SELECT e.id FROM public.engagements e
LEFT JOIN public.effectiveness_reviews r ON r.engagement_id = e.id
WHERE r.id IS NULL;

INSERT INTO public.msb_registrations (engagement_id, registration_type)
SELECT e.id, 'fintrac' FROM public.engagements e
LEFT JOIN public.msb_registrations r
       ON r.engagement_id = e.id AND r.registration_type = 'fintrac'
WHERE r.id IS NULL;

INSERT INTO public.msb_registrations (engagement_id, registration_type)
SELECT e.id, 'revenu_quebec' FROM public.engagements e
LEFT JOIN public.msb_registrations r
       ON r.engagement_id = e.id AND r.registration_type = 'revenu_quebec'
WHERE r.id IS NULL;