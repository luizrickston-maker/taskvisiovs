-- Remove a constraint que limita os tipos a apenas 'cash', 'client', 'project'
ALTER TABLE public.time_blocks DROP CONSTRAINT IF EXISTS time_blocks_type_check;