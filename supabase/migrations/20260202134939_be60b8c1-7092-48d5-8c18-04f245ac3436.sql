-- Create table for storing AI API keys
CREATE TABLE public.ai_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  label TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_api_keys ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_api_keys
CREATE POLICY "Users can view own api_keys"
ON public.ai_api_keys
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api_keys"
ON public.ai_api_keys
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api_keys"
ON public.ai_api_keys
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own api_keys"
ON public.ai_api_keys
FOR DELETE
USING (auth.uid() = user_id);

-- Add api_key_id column to ai_agents table
ALTER TABLE public.ai_agents
ADD COLUMN api_key_id UUID REFERENCES public.ai_api_keys(id) ON DELETE SET NULL;

-- Create trigger for updated_at on ai_api_keys
CREATE TRIGGER update_ai_api_keys_updated_at
BEFORE UPDATE ON public.ai_api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();