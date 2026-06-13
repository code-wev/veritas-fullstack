-- Allow any authenticated user to create clients
CREATE POLICY "Authenticated users can create clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Create function to auto-assign creator to new client
CREATE OR REPLACE FUNCTION public.auto_assign_client_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.client_assignments (user_id, client_id, assigned_by)
  VALUES (NEW.created_by, NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$;

-- Create trigger to auto-assign on client creation
CREATE TRIGGER on_client_created
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_client_creator();

-- Also allow authenticated users to create engagements for their assigned clients
CREATE POLICY "Users can create engagements for assigned clients"
ON public.engagements
FOR INSERT
TO authenticated
WITH CHECK (has_client_access(auth.uid(), client_id));