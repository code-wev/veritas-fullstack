ALTER TABLE public.msb_change_detection
  ADD COLUMN IF NOT EXISTS board_30day_result text,
  ADD COLUMN IF NOT EXISTS management_30day_result text,
  ADD COLUMN IF NOT EXISTS compliance_officer_30day_result text,
  ADD COLUMN IF NOT EXISTS shareholders_30day_result text,
  ADD COLUMN IF NOT EXISTS activities_30day_result text,
  ADD COLUMN IF NOT EXISTS agents_30day_result text,
  ADD COLUMN IF NOT EXISTS address_30day_result text,
  ADD COLUMN IF NOT EXISTS banking_30day_result text,
  ADD COLUMN IF NOT EXISTS authorized_persons_30day_result text;