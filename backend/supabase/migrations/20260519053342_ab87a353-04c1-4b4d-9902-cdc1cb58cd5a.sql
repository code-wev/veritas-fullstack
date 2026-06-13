-- 1. Draft / accept lifecycle on existing audit_report_sections rows.
ALTER TABLE public.audit_report_sections
  ADD COLUMN IF NOT EXISTS is_ai_draft BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_model TEXT,
  ADD COLUMN IF NOT EXISTS ai_drafted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_drafted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_prompt_context TEXT,
  ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS draft_history JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.audit_report_sections.is_ai_draft IS
  'True when the current content was last set by an AI generation and has not yet been accepted by a human reviewer. Show the DRAFT watermark while true.';
COMMENT ON COLUMN public.audit_report_sections.accepted_at IS
  'When a human reviewer accepted the current content as the final version. Once set, the watermark goes away; regeneration requires explicit confirmation.';
COMMENT ON COLUMN public.audit_report_sections.draft_history IS
  'JSON array of prior AI drafts for this section so the reviewer can compare versions or roll back. Newest first.';

-- 2. Per-call generation log.
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

COMMENT ON TABLE public.ai_generation_log IS
  'App-wide log of every AI gateway call. Written only by edge functions (service_role). Lets the team track cost, latency, and error rate per feature.';
COMMENT ON COLUMN public.ai_generation_log.subject_type IS
  'Polymorphic type identifier for the artefact this call was scoped to (e.g. ''audit_report_sections'', ''kyc_samples''). Lets joins back to the source row.';
COMMENT ON COLUMN public.ai_generation_log.prompt_context IS
  'Compact JSON snapshot of inputs that shaped the prompt — for debugging and reproducibility. Do NOT log full client PII; aggregate counts and IDs only.';