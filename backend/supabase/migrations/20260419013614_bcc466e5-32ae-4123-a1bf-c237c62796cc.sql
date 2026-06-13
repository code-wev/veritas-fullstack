-- Table for screenshot metadata
CREATE TABLE IF NOT EXISTS public.msb_registry_screenshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID NOT NULL REFERENCES public.msb_registrations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  search_date DATE,
  reviewer_note TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.msb_registry_screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Engagement users can view registry screenshots"
ON public.msb_registry_screenshots FOR SELECT
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Engagement users can insert registry screenshots"
ON public.msb_registry_screenshots FOR INSERT
WITH CHECK (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Engagement users can update registry screenshots"
ON public.msb_registry_screenshots FOR UPDATE
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Engagement users can delete registry screenshots"
ON public.msb_registry_screenshots FOR DELETE
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE TRIGGER update_msb_registry_screenshots_updated_at
BEFORE UPDATE ON public.msb_registry_screenshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('msb-registry-screenshots', 'msb-registry-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: scope by engagement_id (folder structure: {engagement_id}/{registration_id}/{filename})
CREATE POLICY "Engagement users can read registry screenshot files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'msb-registry-screenshots'
  AND public.has_engagement_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Engagement users can upload registry screenshot files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'msb-registry-screenshots'
  AND public.has_engagement_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Engagement users can delete registry screenshot files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'msb-registry-screenshots'
  AND public.has_engagement_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);