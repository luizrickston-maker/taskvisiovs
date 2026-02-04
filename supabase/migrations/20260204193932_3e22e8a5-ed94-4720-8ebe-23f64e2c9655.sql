-- Add deadline_days column to store the number of days selected in the date range
ALTER TABLE public.project_tasks
ADD COLUMN deadline_days integer DEFAULT NULL;