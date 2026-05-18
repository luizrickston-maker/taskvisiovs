ALTER TABLE public.ai_agents 
ADD COLUMN api_key_id_simple UUID REFERENCES public.ai_api_keys(id),
ADD COLUMN api_key_id_standard UUID REFERENCES public.ai_api_keys(id),
ADD COLUMN api_key_id_complex UUID REFERENCES public.ai_api_keys(id);

COMMENT ON COLUMN public.ai_agents.api_key_id_simple IS 'API Key specific for simple tasks in rotative intelligence';
COMMENT ON COLUMN public.ai_agents.api_key_id_standard IS 'API Key specific for standard tasks in rotative intelligence';
COMMENT ON COLUMN public.ai_agents.api_key_id_complex IS 'API Key specific for complex tasks in rotative intelligence';