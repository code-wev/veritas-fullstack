ALTER TABLE public.msb_change_detection
  ADD COLUMN IF NOT EXISTS notification_30_day_result text,
  ADD COLUMN IF NOT EXISTS notification_30_day_notes text;