-- Fix security warnings

-- 1. Fix update_updated_at_column function search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. Fix permissive audit_log INSERT policy - restrict to actual authenticated user
DROP POLICY IF EXISTS "System can insert audit log" ON public.audit_log;
CREATE POLICY "Users can insert own audit log entries" ON public.audit_log FOR INSERT 
  TO authenticated 
  WITH CHECK (user_id = auth.uid());