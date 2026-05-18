-- Create public.briefing_video_items table
CREATE TABLE IF NOT EXISTS public.briefing_video_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    briefing_id UUID NOT NULL REFERENCES public.briefings(id) ON DELETE CASCADE,
    item_index INTEGER NOT NULL, -- 1, 2, 3, 4
    theme TEXT, -- Tema / Ideia do Vídeo
    format TEXT, -- Reel, Talk, Outro
    recording_date DATE, -- Data Gravação
    priority TEXT, -- Normal, Urgente
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.briefing_video_items ENABLE ROW LEVEL SECURITY;

-- Policies for Select
CREATE POLICY "Workspaces can view their briefing video items" ON public.briefing_video_items
FOR SELECT USING (
    briefing_id IN (
        SELECT id FROM public.briefings 
        WHERE workspace_id = public.get_user_workspace_id()
    )
);

CREATE POLICY "Assigned user can view their briefing video items" ON public.briefing_video_items
FOR SELECT USING (
    briefing_id IN (
        SELECT id FROM public.briefings 
        WHERE assigned_to_user_id = auth.uid()
    )
);

CREATE POLICY "External filler can view their briefing video items via magic link" ON public.briefing_video_items
FOR SELECT USING (
    briefing_id IN (
        SELECT id FROM public.briefings 
        WHERE magic_link_token IS NOT NULL AND magic_link_expires_at > now()
    )
);

-- Policies for Management (Insert/Update/Delete) for Authenticated Users
CREATE POLICY "Workspaces can manage their briefing video items" ON public.briefing_video_items
FOR ALL TO authenticated USING (
    briefing_id IN (
        SELECT id FROM public.briefings 
        WHERE workspace_id = public.get_user_workspace_id()
    )
);

-- Policy for External Update
CREATE POLICY "External filler can update their briefing video items via magic link" ON public.briefing_video_items
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

-- Policy for External Insert (Filler adding new video rows)
CREATE POLICY "External filler can insert their briefing video items via magic link" ON public.briefing_video_items
FOR INSERT WITH CHECK (
    briefing_id IN (
        SELECT id FROM public.briefings 
        WHERE magic_link_token IS NOT NULL AND magic_link_expires_at > now()
    )
);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER update_briefing_video_items_updated_at
BEFORE UPDATE ON public.briefing_video_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
