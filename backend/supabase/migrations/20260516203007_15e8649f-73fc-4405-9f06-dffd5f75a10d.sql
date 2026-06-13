ALTER TABLE public.findings
  ADD COLUMN IF NOT EXISTS finding_type text,
  ADD COLUMN IF NOT EXISTS severity_changed_by uuid,
  ADD COLUMN IF NOT EXISTS severity_changed_at timestamptz;

UPDATE public.findings
SET finding_type = CASE severity
  WHEN 'critical' THEN 'complete_nc'
  WHEN 'high'     THEN 'partial_important'
  WHEN 'medium'   THEN 'partial_moderate'
  WHEN 'low'      THEN 'partial_lesser'
  ELSE 'partial_moderate'
END
WHERE finding_type IS NULL;

CREATE OR REPLACE FUNCTION public.findings_sync_classification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.finding_type = 'observation' THEN
    IF NEW.severity IS NULL OR NEW.severity <> 'low' THEN
      NEW.severity := 'low';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.finding_type IS NULL THEN
    NEW.finding_type := CASE NEW.severity
      WHEN 'critical' THEN 'complete_nc'
      WHEN 'high'     THEN 'partial_important'
      WHEN 'medium'   THEN 'partial_moderate'
      WHEN 'low'      THEN 'partial_lesser'
      ELSE 'partial_moderate'
    END;
    RETURN NEW;
  END IF;

  IF NEW.severity IS NULL THEN
    NEW.severity := CASE NEW.finding_type
      WHEN 'complete_nc'       THEN 'critical'
      WHEN 'partial_important' THEN 'high'
      WHEN 'partial_moderate'  THEN 'medium'
      WHEN 'partial_lesser'    THEN 'low'
      ELSE 'medium'
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS findings_sync_classification_trg ON public.findings;
CREATE TRIGGER findings_sync_classification_trg
  BEFORE INSERT OR UPDATE OF severity, finding_type ON public.findings
  FOR EACH ROW
  EXECUTE FUNCTION public.findings_sync_classification();

ALTER TABLE public.findings
  ALTER COLUMN finding_type SET DEFAULT 'partial_moderate',
  ALTER COLUMN finding_type SET NOT NULL;

ALTER TABLE public.findings
  DROP CONSTRAINT IF EXISTS findings_finding_type_check;

ALTER TABLE public.findings
  ADD CONSTRAINT findings_finding_type_check
  CHECK (finding_type IN (
    'complete_nc',
    'partial_important',
    'partial_moderate',
    'partial_lesser',
    'observation'
  ));

CREATE INDEX IF NOT EXISTS findings_finding_type_idx
  ON public.findings (finding_type);

NOTIFY pgrst, 'reload schema';