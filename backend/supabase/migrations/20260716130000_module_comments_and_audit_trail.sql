-- 1. Create module comments table
CREATE TABLE IF NOT EXISTS public.module_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.module_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.module_comments ENABLE ROW LEVEL SECURITY;

-- Policies for module_comments
CREATE POLICY "Users can view comments on engagements they have access to"
  ON public.module_comments FOR SELECT
  TO authenticated
  USING (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can insert comments on engagements they have access to"
  ON public.module_comments FOR INSERT
  TO authenticated
  WITH CHECK (has_engagement_access(auth.uid(), engagement_id) AND auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.module_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.module_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- 2. Create module review history table (Audit Trail)
CREATE TABLE IF NOT EXISTS public.module_review_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  user_role TEXT,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  action_type TEXT NOT NULL, -- submit, approve, reject, unlock
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.module_review_history ENABLE ROW LEVEL SECURITY;

-- Policies for module_review_history
CREATE POLICY "Users can view review history on engagements they have access to"
  ON public.module_review_history FOR SELECT
  TO authenticated
  USING (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "System / Users can insert review history"
  ON public.module_review_history FOR INSERT
  TO authenticated
  WITH CHECK (has_engagement_access(auth.uid(), engagement_id));
