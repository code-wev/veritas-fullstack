-- Create secure settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value text NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Note: We define NO RLS policies for public.system_settings.
-- This ensures that no clients, anonymous users, or authenticated roles can read/write to it.
-- Only SECURITY DEFINER functions (which run as the database owner) can query it.

-- Create a placeholder for the Resend API key if it does not exist.
-- The actual API key is seeded from the environment variable via backend setup scripts or manual entry.
INSERT INTO public.system_settings (key, value)
VALUES ('resend_api_key', '')
ON CONFLICT (key) DO NOTHING;

-- Create database helper function to send emails securely without exposing API key
CREATE OR REPLACE FUNCTION public.send_resend_email_secure(
  to_email text,
  subject text,
  html_content text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  req_id bigint;
  resend_api_key text;
BEGIN
  -- Fetch the API key from public.system_settings
  SELECT value INTO resend_api_key FROM public.system_settings WHERE key = 'resend_api_key';

  IF resend_api_key IS NULL OR resend_api_key = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resend API Key is not configured in system settings.');
  END IF;

  -- Perform http post request using pg_net extension
  SELECT net.http_post(
    url := 'https://api.resend.com/emails'::text,
    body := jsonb_build_object(
      'from', 'Veritas Onboarding <onboarding@resend.dev>',
      'to', ARRAY[to_email],
      'subject', subject,
      'html', html_content
    ),
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || resend_api_key
    ),
    timeout_milliseconds := 5000
  ) INTO req_id;

  RETURN jsonb_build_object('success', true, 'request_id', req_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
