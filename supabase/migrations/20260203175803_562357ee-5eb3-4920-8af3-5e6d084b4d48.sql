-- Modify incomes table: add new columns for advanced income types
-- Keep existing category_id (references categories) and add user_category_id for custom categories

-- Add user_category_id for custom user income categories
ALTER TABLE public.incomes
ADD COLUMN user_category_id UUID REFERENCES public.user_income_categories(id) ON DELETE SET NULL;

-- Add income_type column with constraint
ALTER TABLE public.incomes
ADD COLUMN income_type TEXT NOT NULL DEFAULT 'fixed';

-- Add check constraint for income_type values
ALTER TABLE public.incomes
ADD CONSTRAINT incomes_income_type_check 
CHECK (income_type IN ('fixed', 'recurring', 'variable'));

-- Add variable amount range columns
ALTER TABLE public.incomes
ADD COLUMN variable_min_amount NUMERIC;

ALTER TABLE public.incomes
ADD COLUMN variable_max_amount NUMERIC;

-- Add index for user_category_id for better query performance
CREATE INDEX idx_incomes_user_category_id ON public.incomes(user_category_id);