-- Findings classification taxonomy (FINTRAC harm-done framework)
--
-- Adds finding_type column to public.findings with values:
--   complete_nc       - Complete non-compliance
--   partial_important - Partial non-compliance, important weakness
--   partial_moderate  - Partial non-compliance, moderate weakness
--   partial_lesser    - Partial non-compliance, lesser weakness
--   observation       - Best-practice observation (not a deficiency)
--
-- Strategy:
--   1. Add column nullable + backfill from severity.
--   2. Install BEFORE INSERT/UPDATE trigger that auto-derives finding_type from
--      severity when the caller hasn't set finding_type. This keeps every existing
--      auto-flag module working unchanged.
--   3. Make column NOT NULL with default + CHECK constraint.

-- 1. Add column (nullable for backfill)
ALTER TABLE public.findings
  ADD COLUMN IF NOT EXISTS finding_type text;

-- 2. Backfill existing rows from severity
UPDATE public.findings
SET finding_type = CASE severity
  WHEN 'critical' THEN 'complete_nc'
  WHEN 'high'     THEN 'partial_important'
  WHEN 'medium'   THEN 'partial_moderate'
  WHEN 'low'      THEN 'partial_lesser'
  ELSE 'partial_moderate'
END
WHERE finding_type IS NULL;

-- 3. Trigger: derive finding_type from severity when not set, and keep severity
--    in sync when only finding_type is updated. Defensive — allows callers to
--    set either or both.
CREATE OR REPLACE FUNCTION public.findings_sync_classification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If observation, severity is meaningless; force to 'low' to keep the column
  -- predictable for legacy code that filters by severity.
  IF NEW.finding_type = 'observation' THEN
    IF NEW.severity IS NULL OR NEW.severity <> 'low' THEN
      NEW.severity := 'low';
    END IF;
    RETURN NEW;
  END IF;

  -- Derive finding_type from severity if not provided (auto-flag code path)
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

  -- Derive severity from finding_type if finding_type was set but severity wasn't
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

-- 4. Lock down the column shape
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

-- 5. Index for filtering on the findings register
CREATE INDEX IF NOT EXISTS findings_finding_type_idx
  ON public.findings (finding_type);

-- 6. Comments for self-documentation
COMMENT ON COLUMN public.findings.finding_type IS
  'FINTRAC harm-done classification. Drives risk/penalty narrative in the audit report. '
  'See https://www.fintrac-canafe.gc.ca/ for the underlying framework. '
  'Observations are not deficiencies and should be excluded from finding counts.';
