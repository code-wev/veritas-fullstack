-- Drop the permissive policy
DROP POLICY IF EXISTS "Authenticated users can create clients" ON public.clients;

-- Create helper function to check if user can create clients
CREATE OR REPLACE FUNCTION public.can_create_clients(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND role IN ('admin', 'partner', 'lead_consultant')
  )
$$;

-- Create new restricted policy for client creation
CREATE POLICY "Admins, partners, and lead consultants can create clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (can_create_clients(auth.uid()) AND auth.uid() = created_by);