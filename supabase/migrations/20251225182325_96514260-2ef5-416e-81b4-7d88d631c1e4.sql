-- Add project_id column to sales_goals table
ALTER TABLE public.sales_goals 
ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_sales_goals_project_id ON public.sales_goals(project_id);