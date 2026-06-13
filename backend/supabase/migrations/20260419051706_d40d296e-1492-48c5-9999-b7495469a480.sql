ALTER TABLE public.effectiveness_reviews
ADD COLUMN IF NOT EXISTS prev_completion_date date;