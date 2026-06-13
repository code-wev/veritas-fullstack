
-- Create client invitations table
CREATE TABLE public.client_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending',
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(engagement_id, email)
);

ALTER TABLE public.client_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage invitations"
  ON public.client_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'partner', 'lead_consultant', 'manager')
    )
  );

CREATE POLICY "Users can view own invitations"
  ON public.client_invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_client_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'client_user')
$$;

CREATE OR REPLACE FUNCTION public.has_client_portal_access(_user_id uuid, _engagement_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_invitations
    WHERE engagement_id = _engagement_id
      AND email = (SELECT email FROM auth.users WHERE id = _user_id)
      AND status = 'accepted'
  )
$$;

-- Client users can view findings for their engagements
CREATE POLICY "Client users can view findings"
  ON public.findings FOR SELECT
  USING (
    public.is_client_user(auth.uid())
    AND public.has_client_portal_access(auth.uid(), engagement_id)
  );

-- Client users can update findings (management responses)
CREATE POLICY "Client users can respond to findings"
  ON public.findings FOR UPDATE
  USING (
    public.is_client_user(auth.uid())
    AND public.has_client_portal_access(auth.uid(), engagement_id)
  );
