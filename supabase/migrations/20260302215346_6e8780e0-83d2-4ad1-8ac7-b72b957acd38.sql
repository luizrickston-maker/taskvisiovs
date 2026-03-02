-- Add source_process_step_id to project_tasks for traceability
ALTER TABLE public.project_tasks
ADD COLUMN source_process_step_id uuid REFERENCES public.process_steps(id) ON DELETE SET NULL DEFAULT NULL;