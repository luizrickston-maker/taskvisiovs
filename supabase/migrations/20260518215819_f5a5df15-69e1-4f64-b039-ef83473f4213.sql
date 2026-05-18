-- Add columns for multi-model routing to ai_agents table
ALTER TABLE public.ai_agents 
ADD COLUMN IF NOT EXISTS routing_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS model_name_simple TEXT DEFAULT 'google/gemini-1.5-flash',
ADD COLUMN IF NOT EXISTS model_name_standard TEXT DEFAULT 'google/gemini-1.5-flash',
ADD COLUMN IF NOT EXISTS model_name_complex TEXT DEFAULT 'google/gemini-1.5-pro';

-- Update descriptions or comments if needed
COMMENT ON COLUMN public.ai_agents.routing_enabled IS 'Whether to use automatic routing between different models based on task complexity';
COMMENT ON COLUMN public.ai_agents.model_name_simple IS 'Model used for simple, low-cost tasks';
COMMENT ON COLUMN public.ai_agents.model_name_standard IS 'Model used for standard interaction tasks';
COMMENT ON COLUMN public.ai_agents.model_name_complex IS 'Model used for complex reasoning tasks';