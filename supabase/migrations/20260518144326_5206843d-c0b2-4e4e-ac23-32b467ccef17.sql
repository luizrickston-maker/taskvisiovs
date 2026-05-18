-- Create briefing notifications table
CREATE TABLE IF NOT EXISTS public.briefing_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Targeted user
    briefing_id UUID NOT NULL REFERENCES public.briefings(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'assignment', 'status_change', 'review_required'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.briefing_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications" ON public.briefing_notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.briefing_notifications
FOR UPDATE USING (user_id = auth.uid());

-- Function to handle briefing notifications automatically
CREATE OR REPLACE FUNCTION public.handle_briefing_notification()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
    notif_title TEXT;
    notif_message TEXT;
    notif_type TEXT;
BEGIN
    -- Determine target user and message based on status change
    IF NEW.status = 'pending_fill' AND (OLD.status IS NULL OR OLD.status != 'pending_fill') THEN
        target_user_id := NEW.assigned_to_user_id;
        notif_title := 'Novo Briefing Atribuído';
        notif_message := 'Você tem um novo briefing para preencher: ' || NEW.title;
        notif_type := 'assignment';
    ELSIF NEW.status = 'in_review' AND OLD.status != 'in_review' THEN
        target_user_id := NEW.created_by_user_id;
        notif_title := 'Briefing Enviado para Revisão';
        notif_message := 'O briefing "' || NEW.title || '" foi preenchido e aguarda sua revisão.';
        notif_type := 'review_required';
    ELSIF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        target_user_id := NEW.assigned_to_user_id;
        notif_title := 'Briefing Aprovado';
        notif_message := 'Excelente! O briefing "' || NEW.title || '" foi aprovado pelo gestor.';
        notif_type := 'status_change';
    ELSIF NEW.status = 'pending_fill' AND OLD.status = 'in_review' THEN
        target_user_id := NEW.assigned_to_user_id;
        notif_title := 'Ajustes Solicitados no Briefing';
        notif_message := 'O gestor solicitou alguns ajustes no briefing "' || NEW.title || '". Verifique as observações.';
        notif_type := 'status_change';
    END IF;

    -- Insert notification if target user is set (internal collaborator)
    IF target_user_id IS NOT NULL THEN
        INSERT INTO public.briefing_notifications (workspace_id, user_id, briefing_id, title, message, type)
        VALUES (NEW.workspace_id, target_user_id, NEW.id, notif_title, notif_message, notif_type);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for notifications
DROP TRIGGER IF EXISTS briefing_notification_trigger ON public.briefings;
CREATE TRIGGER briefing_notification_trigger
AFTER UPDATE ON public.briefings
FOR EACH ROW EXECUTE FUNCTION public.handle_briefing_notification();
