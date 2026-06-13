
-- Backfill: give info@candg.ca (and any future client-assigned users) engagement access
INSERT INTO public.engagement_assignments (user_id, engagement_id, assigned_by)
SELECT ca.user_id, e.id, ca.assigned_by
FROM public.client_assignments ca
JOIN public.engagements e ON e.client_id = ca.client_id
ON CONFLICT DO NOTHING;

-- Create trigger function to auto-assign engagement access when a client assignment is created
CREATE OR REPLACE FUNCTION public.auto_assign_engagement_on_client_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.engagement_assignments (user_id, engagement_id, assigned_by)
  SELECT NEW.user_id, e.id, NEW.assigned_by
  FROM public.engagements e
  WHERE e.client_id = NEW.client_id
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_engagements_on_client
AFTER INSERT ON public.client_assignments
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_engagement_on_client_assignment();

-- Also auto-assign all client-assigned users when a new engagement is created
CREATE OR REPLACE FUNCTION public.auto_assign_client_users_to_engagement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.engagement_assignments (user_id, engagement_id, assigned_by)
  SELECT ca.user_id, NEW.id, ca.assigned_by
  FROM public.client_assignments ca
  WHERE ca.client_id = NEW.client_id
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_users_on_engagement
AFTER INSERT ON public.engagements
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_client_users_to_engagement();
