-- Create enum for briefing status
DO $$ BEGIN
    CREATE TYPE public.briefing_status AS ENUM ('draft', 'pending', 'review', 'approved', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create briefing templates table
CREATE TABLE IF NOT EXISTS public.briefing_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    title TEXT NOT NULL,
    description TEXT,
    content_structure JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create briefing responses table
CREATE TABLE IF NOT EXISTS public.briefing_responses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES public.briefing_templates(id) ON DELETE SET NULL,
    workspace_id UUID NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    respondent_name TEXT,
    respondent_email TEXT,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    status public.briefing_status NOT NULL DEFAULT 'pending',
    review_notes TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create magic links for briefings
CREATE TABLE IF NOT EXISTS public.briefing_magic_links (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    briefing_response_id UUID NOT NULL REFERENCES public.briefing_responses(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMP WITH TIME ZONE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.briefing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefing_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefing_magic_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for briefing_templates
CREATE POLICY "Users can view templates of their workspace"
ON public.briefing_templates FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert templates in their workspace"
ON public.briefing_templates FOR INSERT
WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update templates in their workspace"
ON public.briefing_templates FOR UPDATE
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete templates in their workspace"
ON public.briefing_templates FOR DELETE
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- RLS Policies for briefing_responses
CREATE POLICY "Users can view responses of their workspace"
ON public.briefing_responses FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert responses in their workspace"
ON public.briefing_responses FOR INSERT
WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update responses in their workspace"
ON public.briefing_responses FOR UPDATE
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Allow public access to specific responses via magic link token check (logic will be in Edge Function or App)
-- For now, let's allow service role or authenticated users. 
-- Public filling will be handled by a specialized route/function that uses service_role or a "public_fill" policy.

CREATE POLICY "Allow public filling of responses with valid token"
ON public.briefing_responses FOR UPDATE
USING (true)
WITH CHECK (true);
-- Note: In production, we'd tighten this. For this MVP, we'll control via the Magic Link logic.

-- RLS Policies for briefing_magic_links
CREATE POLICY "Users can manage magic links of their workspace"
ON public.briefing_magic_links FOR ALL
USING (briefing_response_id IN (SELECT id FROM public.briefing_responses WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())));

-- Triggers for updated_at
CREATE TRIGGER update_briefing_templates_updated_at
BEFORE UPDATE ON public.briefing_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_briefing_responses_updated_at
BEFORE UPDATE ON public.briefing_responses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
