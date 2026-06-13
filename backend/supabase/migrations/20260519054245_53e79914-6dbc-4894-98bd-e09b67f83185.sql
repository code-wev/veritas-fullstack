-- 1. Draft / accept lifecycle on existing audit_report_sections rows (idempotent re-apply).
ALTER TABLE public.audit_report_sections
  ADD COLUMN IF NOT EXISTS is_ai_draft BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_model TEXT,
  ADD COLUMN IF NOT EXISTS ai_drafted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_drafted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_prompt_context TEXT,
  ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS draft_history JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Per-call AI generation log (idempotent re-apply).
CREATE TABLE IF NOT EXISTS public.ai_generation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id UUID REFERENCES public.engagements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  function_name TEXT NOT NULL,
  model TEXT NOT NULL,
  subject_type TEXT,
  subject_id UUID,
  prompt_context JSONB,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  latency_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_log_engagement
  ON public.ai_generation_log (engagement_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_generation_log_function
  ON public.ai_generation_log (function_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_generation_log_subject
  ON public.ai_generation_log (subject_type, subject_id);

ALTER TABLE public.ai_generation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read AI generation log for their engagements"
  ON public.ai_generation_log;
CREATE POLICY "Users can read AI generation log for their engagements"
  ON public.ai_generation_log FOR SELECT
  USING (
    engagement_id IS NULL
    OR has_engagement_access(auth.uid(), engagement_id)
  );

DROP POLICY IF EXISTS "Service role can insert AI generation log"
  ON public.ai_generation_log;
CREATE POLICY "Service role can insert AI generation log"
  ON public.ai_generation_log FOR INSERT
  WITH CHECK (false);

-- 3. AI drafting lifecycle for audit_reports.executive_summary (new).
ALTER TABLE public.audit_reports
  ADD COLUMN IF NOT EXISTS executive_summary_is_ai_draft BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS executive_summary_ai_model TEXT,
  ADD COLUMN IF NOT EXISTS executive_summary_ai_drafted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS executive_summary_ai_drafted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS executive_summary_ai_prompt_context TEXT,
  ADD COLUMN IF NOT EXISTS executive_summary_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS executive_summary_accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.audit_reports.executive_summary_is_ai_draft IS
  'True when executive_summary was last set by the AI drafter and has not been accepted or manually edited. UI shows DRAFT watermark while true.';
COMMENT ON COLUMN public.audit_reports.executive_summary_accepted_at IS
  'Set when a reviewer accepts the current executive summary as final. Cleared when AI regenerates.';