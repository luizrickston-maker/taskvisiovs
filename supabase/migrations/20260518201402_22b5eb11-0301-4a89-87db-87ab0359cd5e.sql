-- Add unique constraint to briefing_responses if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'briefing_responses_briefing_id_block_name_key' 
        AND table_name = 'briefing_responses'
    ) THEN
        ALTER TABLE public.briefing_responses 
        ADD CONSTRAINT briefing_responses_briefing_id_block_name_key 
        UNIQUE (briefing_id, block_name);
    END IF;
END $$;