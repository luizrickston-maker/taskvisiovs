-- Add unique constraint to briefing_responses to allow upsert by briefing_id and block_name
ALTER TABLE public.briefing_responses 
ADD CONSTRAINT briefing_responses_briefing_id_block_name_key 
UNIQUE (briefing_id, block_name);