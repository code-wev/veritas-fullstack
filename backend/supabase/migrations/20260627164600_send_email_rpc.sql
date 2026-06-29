-- Create database helper function to send emails via pg_net (bypasses browser CORS)
CREATE OR REPLACE FUNCTION public.send_resend_email(
  to_email text,
  subject text,
  html_content text,
  resend_api_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  req_id bigint;
BEGIN
  -- Perform http post request using pg_net extension matching jsonb body type
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
