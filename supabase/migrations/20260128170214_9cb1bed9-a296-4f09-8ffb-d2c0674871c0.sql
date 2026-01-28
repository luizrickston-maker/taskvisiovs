-- Add corporate project fields to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS deadline DATE,
ADD COLUMN IF NOT EXISTS is_corporate BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL;

-- Add task management fields to project_tasks table
ALTER TABLE public.project_tasks
ADD COLUMN IF NOT EXISTS deadline DATE,
ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Create index for faster corporate project queries
CREATE INDEX IF NOT EXISTS idx_projects_is_corporate ON public.projects(is_corporate) WHERE is_corporate = true;

-- Create index for prospect linkage
CREATE INDEX IF NOT EXISTS idx_projects_prospect_id ON public.projects(prospect_id) WHERE prospect_id IS NOT NULL;