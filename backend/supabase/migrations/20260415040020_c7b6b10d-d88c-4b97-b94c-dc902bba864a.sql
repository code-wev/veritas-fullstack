
-- Create storage bucket for client document uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('client-documents', 'client-documents', false);

-- Create table to track client document uploads
CREATE TABLE public.client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'uploaded',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- Client users can upload and view their own documents for engagements they have portal access to
CREATE POLICY "Client users can upload documents"
  ON public.client_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND is_client_user(auth.uid())
    AND has_client_portal_access(auth.uid(), engagement_id)
  );

CREATE POLICY "Client users can view own documents"
  ON public.client_documents FOR SELECT
  TO authenticated
  USING (
    is_client_user(auth.uid())
    AND has_client_portal_access(auth.uid(), engagement_id)
  );

-- Staff with engagement access can view and manage client documents
CREATE POLICY "Staff can manage client documents"
  ON public.client_documents FOR ALL
  TO authenticated
  USING (has_engagement_access(auth.uid(), engagement_id));

-- Storage policies for the bucket
CREATE POLICY "Client users can upload to client-documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'client-documents');

CREATE POLICY "Users can view client-documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'client-documents');
