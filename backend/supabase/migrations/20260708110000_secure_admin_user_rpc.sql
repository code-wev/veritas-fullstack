-- Create secure database RPC functions for user management (bypasses the need for frontend service role key and Edge Functions)

-- 1. Function to create a user securely from the database
CREATE OR REPLACE FUNCTION public.admin_create_user(
  _email text,
  _password text,
  _full_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
  encrypted_pw text;
  caller_role text;
BEGIN
  -- Check if caller is authenticated and is an admin
  SELECT role INTO caller_role FROM public.user_roles WHERE user_id = auth.uid();
  IF caller_role IS NULL OR caller_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can create users.';
  END IF;

  -- Validate inputs
  IF _email IS NULL OR _email = '' THEN
    RAISE EXCEPTION 'Email is required.';
  END IF;
  IF _password IS NULL OR length(_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters.';
  END IF;
  IF _full_name IS NULL OR _full_name = '' THEN
    RAISE EXCEPTION 'Full name is required.';
  END IF;

  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = LOWER(TRIM(_email))) THEN
    RAISE EXCEPTION 'A user with this email already exists.';
  END IF;

  -- Encrypt the password using extensions.crypt (bcrypt)
  encrypted_pw := extensions.crypt(_password, extensions.gen_salt('bf'));

  -- Insert into auth.users (the handle_new_user trigger will automatically insert the profile row)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    LOWER(TRIM(_email)),
    encrypted_pw,
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    json_build_object('full_name', TRIM(_full_name), 'needs_password_change', true)::jsonb,
    NOW(),
    NOW(),
    false
  )
  RETURNING id INTO new_user_id;

  -- Assign role 'client_user'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, 'client_user');

  RETURN jsonb_build_object('success', true, 'id', new_user_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- 2. Function to delete a user securely from the database
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  _user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_role text;
BEGIN
  -- Check if caller is authenticated and is an admin
  SELECT role INTO caller_role FROM public.user_roles WHERE user_id = auth.uid();
  IF caller_role IS NULL OR caller_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can delete users.';
  END IF;

  -- Delete assignments & roles first to avoid foreign key constraints
  DELETE FROM public.client_assignments WHERE user_id = _user_id;
  DELETE FROM public.engagement_assignments WHERE user_id = _user_id;
  DELETE FROM public.engagement_module_assignments WHERE user_id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id;

  -- Delete from auth.users (cascades automatically to public.profiles)
  DELETE FROM auth.users WHERE id = _user_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
