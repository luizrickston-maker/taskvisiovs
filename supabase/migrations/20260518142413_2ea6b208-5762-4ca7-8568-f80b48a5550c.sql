-- Note: We are recreating briefing_responses to match the new architecture. 
-- The previous version from the first step was a simple MVP; this one is optimized for the block-based structure.

-- Drop the old table if it exists from the first step to avoid conflicts with the new schema
DROP TABLE IF EXISTS public.briefing_responses CASCADE;

CREATE TABLE public.briefing_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    briefing_id UUID NOT NULL REFERENCES public.briefings(id) ON DELETE CASCADE,
    block_name TEXT NOT NULL, -- Ex: 'identificacao', 'objetivo_mes', 'planejamento_videos', etc.
    response_data JSONB NOT NULL, -- Dados do bloco em formato JSON
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.briefing_responses ENABLE ROW LEVEL SECURITY;

-- Policies for Select
CREATE POLICY "Workspaces can view their briefing responses" ON public.briefing_responses
FOR SELECT USING (
    briefing_id IN (
        SELECT id FROM public.briefings 
        WHERE workspace_id = public.get_user_workspace_id()
    )
);

CREATE POLICY "Assigned user can view their briefing responses" ON public.briefing_responses
FOR SELECT USING (
    briefing_id IN (
        SELECT id FROM public.briefings 
        WHERE assigned_to_user_id = auth.uid()
    )
);

CREATE POLICY "External filler can view their briefing responses via magic link" ON public.briefing_responses
FOR SELECT USING (
    briefing_id IN (
        SELECT id FROM public.briefings 
        WHERE magic_link_token IS NOT NULL AND magic_link_expires_at > now()
    )
);

-- Policies for Management (Insert/Update/Delete) for Authenticated Users
CREATE POLICY "Workspaces can manage their briefing responses" ON public.briefing_responses
FOR ALL TO authenticated USING (
    briefing_id IN (
        SELECT id FROM public.briefings 
        WHERE workspace_id = public.get_user_workspace_id()
    )
);

-- Policy for External Update (Filling the briefing)
CREATE POLICY "External filler can update their briefing responses via magic link" ON public.briefing_responses
FOR UPDATE USING (
    briefing_id IN (
        SELECT id FROM public.briefings 
        WHERE magic_link_token IS NOT NULL AND magic_link_expires_at > now()
    )
) WITH CHECK (
    briefing_id IN (
        SELECT id FROM public.briefings 
        WHERE magic_link_token IS NOT NULL AND magic_link_expires_at > now()
    )
);

-- Policy for External Insert (In case the filler needs to create a block response)
CREATE POLICY "External filler can insert their briefing responses via magic link" ON public.briefing_responses
FOR INSERT WITH CHECK (
    briefing_id IN (
        SELECT id FROM public.briefings 
        WHERE magic_link_token IS NOT NULL AND magic_link_expires_at > now()
    )
);

-- Trigger for updated_at
CREATE TRIGGER update_briefing_responses_updated_at
BEFORE UPDATE ON public.briefing_responses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
