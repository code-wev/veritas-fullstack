ALTER TABLE public.effectiveness_reviews
  ADD COLUMN IF NOT EXISTS lock_state TEXT NOT NULL DEFAULT 'draft'
    CHECK (lock_state IN ('draft','manager_review','partner_review','finalized')),
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_unlocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_unlocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unlock_count INTEGER NOT NULL DEFAULT 0;