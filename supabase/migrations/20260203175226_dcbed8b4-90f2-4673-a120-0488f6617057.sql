-- Create table for custom income categories
CREATE TABLE public.user_income_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_income_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own income categories"
ON public.user_income_categories
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own income categories"
ON public.user_income_categories
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own income categories"
ON public.user_income_categories
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own income categories"
ON public.user_income_categories
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_income_categories_updated_at
BEFORE UPDATE ON public.user_income_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();