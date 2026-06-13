-- Add msb_activities to clients
--
-- FINTRAC distinguishes MSB activities (FX, money transfer, money orders,
-- virtual currency, cheque cashing, armoured car, ABM acquirer, crowdfunding,
-- PSP). The activity mix drives which reports the client is obliged to file
-- (LCTR / EFTR / LVCTR / STR / LPEPR).
--
-- This column captures it at client setup time. The MSB Registration module
-- already has its own msb_activities on msb_registrations for per-engagement
-- review — when that's filled out, it should pre-populate from this client-
-- level value.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS msb_activities text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS clients_msb_activities_idx
  ON public.clients USING GIN (msb_activities);

COMMENT ON COLUMN public.clients.msb_activities IS
  'FINTRAC MSB activity codes that this client performs. Drives which '
  'transaction reports apply. Empty for non-MSB clients.';

NOTIFY pgrst, 'reload schema';
