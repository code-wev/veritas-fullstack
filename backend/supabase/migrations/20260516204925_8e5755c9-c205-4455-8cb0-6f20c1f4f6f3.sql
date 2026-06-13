ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS msb_activities text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS clients_msb_activities_idx
  ON public.clients USING GIN (msb_activities);

COMMENT ON COLUMN public.clients.msb_activities IS
  'FINTRAC MSB activity codes that this client performs. Drives which '
  'transaction reports apply. Empty for non-MSB clients.';

NOTIFY pgrst, 'reload schema';