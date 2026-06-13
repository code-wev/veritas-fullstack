
-- Information requests raised by audit staff
CREATE TABLE public.information_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  due_date DATE,
  module TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.information_requests ENABLE ROW LEVEL SECURITY;

-- Staff can manage requests
CREATE POLICY "Staff can manage information requests"
  ON public.information_requests FOR ALL
  TO authenticated
  USING (has_engagement_access(auth.uid(), engagement_id));

-- Client users can view requests for their engagements
CREATE POLICY "Client users can view information requests"
  ON public.information_requests FOR SELECT
  TO authenticated
  USING (
    is_client_user(auth.uid())
    AND has_client_portal_access(auth.uid(), engagement_id)
  );

-- Responses from clients (or staff notes)
CREATE TABLE public.information_request_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.information_requests(id) ON DELETE CASCADE,
  responded_by UUID NOT NULL REFERENCES auth.users(id),
  response_text TEXT NOT NULL,
  is_client_response BOOLEAN NOT NULL DEFAULT false,
  evidence_file_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.information_request_responses ENABLE ROW LEVEL SECURITY;

-- Staff can manage all responses
CREATE POLICY "Staff can manage request responses"
  ON public.information_request_responses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.information_requests ir
      WHERE ir.id = information_request_responses.request_id
        AND has_engagement_access(auth.uid(), ir.engagement_id)
    )
  );

-- Client users can view responses on their requests
CREATE POLICY "Client users can view request responses"
  ON public.information_request_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.information_requests ir
      WHERE ir.id = information_request_responses.request_id
        AND is_client_user(auth.uid())
        AND has_client_portal_access(auth.uid(), ir.engagement_id)
    )
  );

-- Client users can add responses
CREATE POLICY "Client users can add responses"
  ON public.information_request_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    responded_by = auth.uid()
    AND is_client_response = true
    AND EXISTS (
      SELECT 1 FROM public.information_requests ir
      WHERE ir.id = information_request_responses.request_id
        AND is_client_user(auth.uid())
        AND has_client_portal_access(auth.uid(), ir.engagement_id)
    )
  );
