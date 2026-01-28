-- Add hours_available and clt_benefits fields to corporate_team
ALTER TABLE public.corporate_team 
ADD COLUMN IF NOT EXISTS hours_available integer DEFAULT 160,
ADD COLUMN IF NOT EXISTS clt_benefits numeric DEFAULT 0;

-- Add plan_id to prospects for tracking which plan was sold
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.service_plans(id) ON DELETE SET NULL;

-- Add depreciation fields to investments
ALTER TABLE public.corporate_investments 
ADD COLUMN IF NOT EXISTS useful_life_months integer,
ADD COLUMN IF NOT EXISTS monthly_depreciation numeric GENERATED ALWAYS AS (
  CASE WHEN useful_life_months > 0 THEN amount / useful_life_months ELSE 0 END
) STORED;