-- CRITICAL SECURITY FIX
--
-- The original `client-documents` storage bucket policies (migration
-- 20260415040020) check only `bucket_id = 'client-documents'`. They DO NOT
-- scope by engagement. Any authenticated user — including a freshly self-
-- signed-up account with no role — can list and download every uploaded KYC
-- document across all tenants.
--
-- This migration replaces those policies with engagement-scoped ones using
-- the same path-extraction pattern already in use for the `client-files`
-- bucket (migration 20260419055715). The storage path convention is
-- `<engagement_id>/<timestamp>_<filename>` (set by
-- ClientDocumentUpload.tsx:71), so `(storage.foldername(name))[1]` yields the
-- engagement UUID.
--
-- Access:
--   SELECT: staff with engagement access OR client_users with portal access
--   INSERT: same
--   UPDATE: staff with engagement access only (clients can't modify post-upload)
--   DELETE: staff with engagement access only

-- 1. Drop the broken policies
DROP POLICY IF EXISTS "Client users can upload to client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view client-documents" ON storage.objects;
-- Defensive: drop any other unscoped policies on this bucket from earlier work
DROP POLICY IF EXISTS "Anyone can view client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload client-documents" ON storage.objects;

-- 2. SELECT — staff with engagement access OR client_users with portal access
CREATE POLICY "Engagement members read client-documents"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'client-documents'
  AND (
    public.has_engagement_access(
      auth.uid(),
      NULLIF((storage.foldername(name))[1], '')::uuid
    )
    OR public.has_client_portal_access(
      auth.uid(),
      NULLIF((storage.foldername(name))[1], '')::uuid
    )
  )
);

-- 3. INSERT — same access matrix as SELECT
CREATE POLICY "Engagement members upload to client-documents"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'client-documents'
  AND (
    public.has_engagement_access(
      auth.uid(),
      NULLIF((storage.foldername(name))[1], '')::uuid
    )
    OR public.has_client_portal_access(
      auth.uid(),
      NULLIF((storage.foldername(name))[1], '')::uuid
    )
  )
);

-- 4. UPDATE — staff only (clients submit-once)
CREATE POLICY "Staff update client-documents"
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'client-documents'
  AND public.has_engagement_access(
    auth.uid(),
    NULLIF((storage.foldername(name))[1], '')::uuid
  )
);

-- 5. DELETE — staff only
CREATE POLICY "Staff delete client-documents"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'client-documents'
  AND public.has_engagement_access(
    auth.uid(),
    NULLIF((storage.foldername(name))[1], '')::uuid
  )
);

NOTIFY pgrst, 'reload schema';
