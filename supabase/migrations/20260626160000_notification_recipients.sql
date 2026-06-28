-- =====================================================
-- Destinatários de notificações por tipo.
-- Cada contato (nome + WhatsApp) recebe os TIPOS escolhidos
-- (financeiro, tarefas, ...). Substitui o número único workspaces.notify_whatsapp,
-- mas mantém compatibilidade: as functions caem no número legado se não houver
-- destinatário configurado para o tipo.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notification_recipients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  label        text NOT NULL,              -- nome do contato
  whatsapp     text NOT NULL,              -- número (DDI+DDD+numero)
  types        text[] NOT NULL DEFAULT '{}', -- ex: {financeiro, tarefas}
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_recipients_ws
  ON public.notification_recipients(workspace_id);

ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members manage notification_recipients"
  ON public.notification_recipients FOR ALL TO authenticated
  USING (public.has_workspace_access(workspace_id))
  WITH CHECK (public.has_workspace_access(workspace_id));

-- Compatibilidade: semeia o número legado recebendo os 2 tipos atuais.
INSERT INTO public.notification_recipients (workspace_id, label, whatsapp, types)
SELECT id, 'Gestor', notify_whatsapp, ARRAY['financeiro','tarefas']
FROM public.workspaces
WHERE notify_whatsapp IS NOT NULL AND btrim(notify_whatsapp) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.notification_recipients r WHERE r.workspace_id = workspaces.id
  );