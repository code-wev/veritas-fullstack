DO $$
DECLARE tbl TEXT;
  tables TEXT[] := ARRAY[
    'reporting_reviews','kyc_reviews','tm_reviews','sanctions_reviews',
    'aml_program_reviews','training_reviews','risk_assessment_reviews'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format($f$
        ALTER TABLE public.%I
          ADD COLUMN IF NOT EXISTS lock_state TEXT NOT NULL DEFAULT 'draft'
            CHECK (lock_state IN ('draft', 'manager_review', 'partner_review', 'finalized')),
          ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS finalized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS last_unlocked_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS last_unlocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS unlock_count INTEGER NOT NULL DEFAULT 0
      $f$, tbl);
    END IF;
  END LOOP;
END $$;