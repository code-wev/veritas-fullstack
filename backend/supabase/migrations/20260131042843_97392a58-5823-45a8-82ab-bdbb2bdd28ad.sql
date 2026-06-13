-- Add detailed EFT record-keeping fields to individual samples
ALTER TABLE public.kyc_individual_samples
ADD COLUMN IF NOT EXISTS eft_ordering_client_name boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS eft_ordering_client_address boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS eft_beneficiary_name boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS eft_beneficiary_address boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS eft_exchange_rate boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS eft_reference_number boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS eft_sending_fi boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS eft_receiving_fi boolean DEFAULT null;

-- Add detailed LCTR record-keeping fields to individual samples
ALTER TABLE public.kyc_individual_samples
ADD COLUMN IF NOT EXISTS lctr_client_name boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS lctr_client_address boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS lctr_client_dob boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS lctr_occupation boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS lctr_conductor_name boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS lctr_conductor_address boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS lctr_purpose boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS lctr_transaction_time boolean DEFAULT null;

-- Add detailed VC record-keeping fields to individual samples
ALTER TABLE public.kyc_individual_samples
ADD COLUMN IF NOT EXISTS vc_client_name boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS vc_client_address boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS vc_amount boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS vc_fiat_equivalent boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS vc_exchange_rate boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS vc_sending_wallet boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS vc_receiving_wallet boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS vc_reference_number boolean DEFAULT null;

-- Add detailed EFT record-keeping fields to business samples
ALTER TABLE public.kyc_business_samples
ADD COLUMN IF NOT EXISTS eft_ordering_client_name boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS eft_ordering_client_address boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS eft_beneficiary_name boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS eft_beneficiary_address boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS eft_exchange_rate boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS eft_reference_number boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS eft_sending_fi boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS eft_receiving_fi boolean DEFAULT null;

-- Add detailed LCTR record-keeping fields to business samples
ALTER TABLE public.kyc_business_samples
ADD COLUMN IF NOT EXISTS lctr_client_name boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS lctr_client_address boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS lctr_client_dob boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS lctr_occupation boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS lctr_conductor_name boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS lctr_conductor_address boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS lctr_purpose boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS lctr_transaction_time boolean DEFAULT null;

-- Add detailed VC record-keeping fields to business samples
ALTER TABLE public.kyc_business_samples
ADD COLUMN IF NOT EXISTS vc_client_name boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS vc_client_address boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS vc_amount boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS vc_fiat_equivalent boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS vc_exchange_rate boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS vc_sending_wallet boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS vc_receiving_wallet boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS vc_reference_number boolean DEFAULT null;