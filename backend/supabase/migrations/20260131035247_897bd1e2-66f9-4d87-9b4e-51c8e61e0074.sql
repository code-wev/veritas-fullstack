-- Add array columns for multiple sample sources
ALTER TABLE public.kyc_reviews 
ADD COLUMN individual_sample_sources text[] DEFAULT '{}',
ADD COLUMN business_sample_sources text[] DEFAULT '{}';