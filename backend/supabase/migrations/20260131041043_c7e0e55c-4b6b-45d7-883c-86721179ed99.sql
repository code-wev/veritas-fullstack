-- Add transaction-related fields to kyc_individual_samples
ALTER TABLE public.kyc_individual_samples
ADD COLUMN IF NOT EXISTS is_transaction_related boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS transaction_type text,
ADD COLUMN IF NOT EXISTS transaction_amount numeric,
ADD COLUMN IF NOT EXISTS transaction_date date,
ADD COLUMN IF NOT EXISTS transaction_currency text DEFAULT 'CAD',
ADD COLUMN IF NOT EXISTS third_party_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS third_party_documented boolean,
ADD COLUMN IF NOT EXISTS eft_record_complete boolean,
ADD COLUMN IF NOT EXISTS vc_record_complete boolean,
ADD COLUMN IF NOT EXISTS lctr_record_complete boolean;

-- Add transaction-related fields to kyc_business_samples
ALTER TABLE public.kyc_business_samples
ADD COLUMN IF NOT EXISTS is_transaction_related boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS transaction_type text,
ADD COLUMN IF NOT EXISTS transaction_amount numeric,
ADD COLUMN IF NOT EXISTS transaction_date date,
ADD COLUMN IF NOT EXISTS transaction_currency text DEFAULT 'CAD',
ADD COLUMN IF NOT EXISTS third_party_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS third_party_documented boolean,
ADD COLUMN IF NOT EXISTS eft_record_complete boolean,
ADD COLUMN IF NOT EXISTS vc_record_complete boolean,
ADD COLUMN IF NOT EXISTS lctr_record_complete boolean;