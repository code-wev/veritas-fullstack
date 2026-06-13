DROP POLICY IF EXISTS "Client users can upload to client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Engagement members read client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Engagement members upload to client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff update client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff delete client-documents" ON storage.objects;

CREATE POLICY "Engagement members read client-documents"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'client-documents'
  AND (
    public.has_engagement_access(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid)
    OR public.has_client_portal_access(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid)
  )
);

CREATE POLICY "Engagement members upload to client-documents"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'client-documents'
  AND (
    public.has_engagement_access(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid)
    OR public.has_client_portal_access(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid)
  )
);

CREATE POLICY "Staff update client-documents"
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'client-documents'
  AND public.has_engagement_access(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid)
);

CREATE POLICY "Staff delete client-documents"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'client-documents'
  AND public.has_engagement_access(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid)
);

NOTIFY pgrst, 'reload schema';