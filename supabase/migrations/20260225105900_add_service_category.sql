-- Add category column to cosmetic_services
ALTER TABLE public.cosmetic_services 
ADD COLUMN category text DEFAULT 'beauty';

-- Add a comment to the column
COMMENT ON COLUMN public.cosmetic_services.category IS 'Category of the service (e.g., beauty, body)';
