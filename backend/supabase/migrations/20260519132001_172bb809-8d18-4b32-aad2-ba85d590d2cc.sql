-- ============================================================
-- Migration 1: Fold lead_consultant role into manager
-- ============================================================

UPDATE public.user_roles
   SET role = 'manager'
 WHERE role = 'lead_consultant';

CREATE OR REPLACE FUNCTION public.can_edit_audit_report(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('manager', 'partner', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_findings(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('manager', 'partner', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY
    CASE role
      WHEN 'partner' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'manager' THEN 3
      WHEN 'analyst' THEN 4
      WHEN 'client_user' THEN 5
      ELSE 99
    END
  LIMIT 1
$$;

COMMENT ON FUNCTION public.can_edit_audit_report(UUID) IS
  'True if the user can edit audit report sections (manager, partner, admin). Finalization is a separate capability gated by Partner+ — see RBAC Phase 1 migration when added.';

-- ============================================================
-- Migration 2: RBAC Phase 1 — audit report lock-state lifecycle + Partner-only finalization
-- ============================================================

ALTER TABLE public.audit_reports
  ADD COLUMN IF NOT EXISTS lock_state TEXT NOT NULL DEFAULT 'draft'
    CHECK (lock_state IN ('draft', 'manager_review', 'partner_review', 'finalized')),
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_unlocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_unlocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unlock_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.audit_reports.lock_state IS
  'Workflow position: draft (Analyst-editable) → manager_review (Manager-only) → partner_review (Partner-only) → finalized (read-only until unlocked). Modules currently use only draft and finalized; intermediate states are reserved for future per-module locking.';
COMMENT ON COLUMN public.audit_reports.finalized_at IS
  'Set by Partner finalize action. Cleared on unlock.';
COMMENT ON COLUMN public.audit_reports.unlock_count IS
  'How many times this report has been unlocked after finalization. Auditable signal of late changes.';

CREATE OR REPLACE FUNCTION public.can_finalize_audit_report(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('partner', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_unlock_audit_report(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('partner', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_audit_report(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('manager', 'partner', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_write_audit_report(_user_id UUID, _report_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.audit_reports r
    WHERE r.id = _report_id
      AND has_engagement_access(_user_id, r.engagement_id)
      AND (
        r.lock_state <> 'finalized'
        OR can_unlock_audit_report(_user_id)
      )
  )
$$;

COMMENT ON FUNCTION public.can_write_audit_report(UUID, UUID) IS
  'True if user has engagement access AND either (a) the report is not finalized, or (b) the user has unlock capability (partner/admin). The unlock branch lets Partners flip lock_state back to draft on a finalized report.';

DROP POLICY IF EXISTS "Users can view audit reports for their engagements" ON public.audit_reports;
CREATE POLICY "Users can view audit reports for their engagements"
  ON public.audit_reports FOR SELECT
  USING (has_engagement_access(auth.uid(), engagement_id));

DROP POLICY IF EXISTS "Editors can update audit reports" ON public.audit_reports;
CREATE POLICY "Editors can update audit reports"
  ON public.audit_reports FOR UPDATE
  USING (can_write_audit_report(auth.uid(), id))
  WITH CHECK (can_write_audit_report(auth.uid(), id));

DROP POLICY IF EXISTS "Editors can insert audit reports" ON public.audit_reports;
CREATE POLICY "Editors can insert audit reports"
  ON public.audit_reports FOR INSERT
  WITH CHECK (
    has_engagement_access(auth.uid(), engagement_id)
    AND can_edit_audit_report(auth.uid())
  );

DROP POLICY IF EXISTS "Editors can delete audit reports" ON public.audit_reports;
CREATE POLICY "Editors can delete audit reports"
  ON public.audit_reports FOR DELETE
  USING (
    has_engagement_access(auth.uid(), engagement_id)
    AND can_finalize_audit_report(auth.uid())
    AND lock_state <> 'finalized'
  );
