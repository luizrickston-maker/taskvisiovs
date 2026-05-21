-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

-- Function to handle briefing notifications
CREATE OR REPLACE FUNCTION public.handle_video_briefing_notification()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
    notify_title TEXT;
    notify_msg TEXT;
    notify_link TEXT;
BEGIN
    -- 1. Notify Manager when Editor completes or requests info
    IF (NEW.status = 'completed' AND OLD.status != 'completed') OR (NEW.status = 'review' AND OLD.status != 'review') THEN
        target_user_id := NEW.created_by_user_id;
        notify_link := '/pj/projetos/tarefas/' || NEW.project_task_id || '/briefing';
        
        IF NEW.status = 'completed' THEN
            notify_title := '✅ Edição Concluída';
            notify_msg := 'O briefing "' || NEW.title || '" foi marcado como concluído pelo editor.';
        ELSE
            notify_title := '❓ Dúvida no Briefing';
            notify_msg := 'O editor solicitou informações ou revisão para o briefing "' || NEW.title || '".';
        END IF;

        INSERT INTO public.notifications (workspace_id, user_id, title, message, link, type)
        VALUES (NEW.workspace_id, target_user_id, notify_title, notify_msg, notify_link, 'briefing');
    END IF;

    -- 2. Notify Editor when assigned (if internal user)
    IF (NEW.assigned_to_user_id IS NOT NULL AND (OLD.assigned_to_user_id IS NULL OR OLD.assigned_to_user_id != NEW.assigned_to_user_id)) THEN
        target_user_id := NEW.assigned_to_user_id;
        notify_link := '/pj/projetos/tarefas/' || NEW.project_task_id || '/briefing';
        notify_title := '🎬 Novo Briefing Atribuído';
        notify_msg := 'Você recebeu um novo briefing de edição: "' || NEW.title || '".';

        INSERT INTO public.notifications (workspace_id, user_id, title, message, link, type)
        VALUES (NEW.workspace_id, target_user_id, notify_title, notify_msg, notify_link, 'briefing');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for notifications
DROP TRIGGER IF EXISTS on_video_briefing_status_change ON public.video_editing_briefings;
CREATE TRIGGER on_video_briefing_status_change
AFTER UPDATE ON public.video_editing_briefings
FOR EACH ROW
EXECUTE FUNCTION public.handle_video_briefing_notification();
