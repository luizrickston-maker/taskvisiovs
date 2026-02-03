-- Modify debts table: add user_category_id for custom debt categories
-- Keep existing category_id (references categories) and add user_category_id for custom categories

ALTER TABLE public.debts
ADD COLUMN user_category_id UUID REFERENCES public.user_debt_categories(id) ON DELETE SET NULL;

-- Add index for user_category_id for better query performance
CREATE INDEX idx_debts_user_category_id ON public.debts(user_category_id);

-- Enable Realtime for the new and modified tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_income_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_debt_categories;

-- Note: incomes and debts tables - check if they're already in publication
-- If they error out, it means they're already added
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.incomes;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Already exists, ignore
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.debts;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Already exists, ignore
  END;
END $$;