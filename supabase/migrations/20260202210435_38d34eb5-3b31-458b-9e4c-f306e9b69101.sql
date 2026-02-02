-- Add business_app_name column to user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN business_app_name TEXT DEFAULT 'Minha Empresa';

-- Add a comment to document the columns
COMMENT ON COLUMN public.user_preferences.app_name IS 'Display name for personal context';
COMMENT ON COLUMN public.user_preferences.business_app_name IS 'Display name for business context';