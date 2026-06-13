
-- 1) Trigger: when a kyc_individual_samples or kyc_business_samples row is inserted/updated
-- with non-empty deficiencies, ensure a corresponding auto-generated kyc_issues row exists.
CREATE OR REPLACE FUNCTION public.sync_kyc_sample_deficiency_to_issue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sample_col TEXT;
  v_existing_id UUID;
  v_title TEXT;
  v_subject TEXT;
BEGIN
  IF TG_TABLE_NAME = 'kyc_individual_samples' THEN
    v_sample_col := 'individual_sample_id';
    v_subject := COALESCE(NEW.customer_name, NEW.customer_id, 'Individual sample');
  ELSE
    v_sample_col := 'business_sample_id';
    v_subject := COALESCE(NEW.business_name, NEW.customer_id, 'Business sample');
  END IF;

  v_title := 'Deficiency identified – ' || v_subject;

  -- Try to find existing auto-generated issue for this sample
  IF TG_TABLE_NAME = 'kyc_individual_samples' THEN
    SELECT id INTO v_existing_id
      FROM public.kyc_issues
     WHERE individual_sample_id = NEW.id
       AND is_auto_generated = true
     LIMIT 1;
  ELSE
    SELECT id INTO v_existing_id
      FROM public.kyc_issues
     WHERE business_sample_id = NEW.id
       AND is_auto_generated = true
     LIMIT 1;
  END IF;

  IF NEW.deficiencies IS NOT NULL AND length(trim(NEW.deficiencies)) > 0 THEN
    IF v_existing_id IS NULL THEN
      IF TG_TABLE_NAME = 'kyc_individual_samples' THEN
        INSERT INTO public.kyc_issues (
          review_id, individual_sample_id, issue_category, issue_title,
          issue_description, severity, status, is_auto_generated, auto_flag_reason
        ) VALUES (
          NEW.review_id, NEW.id, 'mandatory', v_title,
          NEW.deficiencies, 'medium', 'open', true,
          'Auto-generated from sample deficiencies field'
        );
      ELSE
        INSERT INTO public.kyc_issues (
          review_id, business_sample_id, issue_category, issue_title,
          issue_description, severity, status, is_auto_generated, auto_flag_reason
        ) VALUES (
          NEW.review_id, NEW.id, 'mandatory', v_title,
          NEW.deficiencies, 'medium', 'open', true,
          'Auto-generated from sample deficiencies field'
        );
      END IF;
    ELSE
      UPDATE public.kyc_issues
         SET issue_description = NEW.deficiencies,
             issue_title = v_title,
             updated_at = now()
       WHERE id = v_existing_id;
    END IF;
  ELSE
    -- Deficiency cleared: remove auto-generated issue (manual ones remain)
    IF v_existing_id IS NOT NULL THEN
      DELETE FROM public.kyc_issues WHERE id = v_existing_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_kyc_indiv_deficiency ON public.kyc_individual_samples;
CREATE TRIGGER trg_sync_kyc_indiv_deficiency
AFTER INSERT OR UPDATE OF deficiencies ON public.kyc_individual_samples
FOR EACH ROW EXECUTE FUNCTION public.sync_kyc_sample_deficiency_to_issue();

DROP TRIGGER IF EXISTS trg_sync_kyc_biz_deficiency ON public.kyc_business_samples;
CREATE TRIGGER trg_sync_kyc_biz_deficiency
AFTER INSERT OR UPDATE OF deficiencies ON public.kyc_business_samples
FOR EACH ROW EXECUTE FUNCTION public.sync_kyc_sample_deficiency_to_issue();

-- 2) Trigger: mirror kyc_issues into the global findings register
CREATE OR REPLACE FUNCTION public.sync_kyc_issue_to_finding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_engagement_id UUID;
  v_existing_id UUID;
  v_severity TEXT;
  v_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.findings
     WHERE source_kyc_individual_id = OLD.individual_sample_id
        OR source_kyc_business_id = OLD.business_sample_id
        OR (description = OLD.issue_description AND module = 'kyc' AND title = OLD.issue_title);
    RETURN OLD;
  END IF;

  -- Resolve engagement id from the kyc review
  SELECT engagement_id INTO v_engagement_id
    FROM public.kyc_reviews WHERE id = NEW.review_id;

  IF v_engagement_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_severity := NEW.severity::text;
  v_status := CASE NEW.status::text
                WHEN 'closed' THEN 'final'
                WHEN 'in_progress' THEN 'reviewed'
                ELSE 'draft'
              END;

  -- Find existing mirrored finding
  SELECT id INTO v_existing_id
    FROM public.findings
   WHERE engagement_id = v_engagement_id
     AND module = 'kyc'
     AND (
       (NEW.individual_sample_id IS NOT NULL AND source_kyc_individual_id = NEW.individual_sample_id)
       OR (NEW.business_sample_id IS NOT NULL AND source_kyc_business_id = NEW.business_sample_id)
       OR (NEW.individual_sample_id IS NULL AND NEW.business_sample_id IS NULL AND title = NEW.issue_title)
     )
   LIMIT 1;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.findings (
      engagement_id, module, submodule, title, observation, description,
      severity, status, recommendation, management_response,
      source_kyc_individual_id, source_kyc_business_id, date_identified
    ) VALUES (
      v_engagement_id, 'kyc',
      CASE
        WHEN NEW.individual_sample_id IS NOT NULL THEN 'individual_kyc'
        WHEN NEW.business_sample_id IS NOT NULL THEN 'business_kyc'
        ELSE 'kyc_general'
      END,
      NEW.issue_title, NEW.issue_description, NEW.issue_description,
      v_severity, v_status, NEW.recommendation, NEW.management_response,
      NEW.individual_sample_id, NEW.business_sample_id, CURRENT_DATE
    );
  ELSE
    UPDATE public.findings
       SET title = NEW.issue_title,
           observation = NEW.issue_description,
           description = NEW.issue_description,
           severity = v_severity,
           status = v_status,
           recommendation = NEW.recommendation,
           management_response = NEW.management_response,
           updated_at = now()
     WHERE id = v_existing_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_kyc_issue_to_finding ON public.kyc_issues;
CREATE TRIGGER trg_sync_kyc_issue_to_finding
AFTER INSERT OR UPDATE OR DELETE ON public.kyc_issues
FOR EACH ROW EXECUTE FUNCTION public.sync_kyc_issue_to_finding();
