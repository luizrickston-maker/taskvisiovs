/**
 * Webhook Service
 *
 * Estrutura de eventos e payload — pronta para ativação futura.
 * Para ativar o disparo real:
 *   1. Configure os endpoints em `webhook_configs` no Supabase
 *   2. Remova o guard `WEBHOOK_ENABLED` e descomente a chamada à Edge Function
 *
 * Eventos suportados:
 *   - task.completed   → colaborador concluiu uma tarefa
 *   - task.assigned    → gestor atribuiu tarefa a um colaborador
 *   - project.assigned → gestor atribuiu projeto a um colaborador
 */

// ─── Feature flag ─────────────────────────────────────────────────────────────
// Mude para true quando quiser ativar o disparo real de webhooks
const WEBHOOK_ENABLED = false;

// ─── Tipos de evento ──────────────────────────────────────────────────────────
export type WebhookEventType =
  | 'task.completed'
  | 'task.assigned'
  | 'project.assigned';

// ─── Payloads tipados por evento ──────────────────────────────────────────────

export interface WebhookCollaborator {
  id: string;           // auth.users UUID
  name: string;
  email?: string;
}

export interface WebhookTask {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: number | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  deadline?: string | null;
  project_id: string;
  project_name?: string;
  client_name?: string;
}

export interface WebhookProject {
  id: string;
  name: string;
  client_name?: string | null;
  status: string;
}

export interface TaskCompletedPayload {
  event: 'task.completed';
  occurred_at: string;       // ISO 8601
  collaborator: WebhookCollaborator;
  task: WebhookTask;
}

export interface TaskAssignedPayload {
  event: 'task.assigned';
  occurred_at: string;
  assigned_by: WebhookCollaborator;  // gestor que atribuiu
  collaborator: WebhookCollaborator; // colaborador que recebeu
  task: WebhookTask;
}

export interface ProjectAssignedPayload {
  event: 'project.assigned';
  occurred_at: string;
  assigned_by: WebhookCollaborator;
  collaborator: WebhookCollaborator;
  project: WebhookProject;
}

export type WebhookPayload =
  | TaskCompletedPayload
  | TaskAssignedPayload
  | ProjectAssignedPayload;

// ─── Serviço principal ────────────────────────────────────────────────────────

/**
 * Dispara um evento de webhook para todos os endpoints configurados
 * no workspace (`webhook_configs`).
 *
 * @param workspaceId  - ID do workspace dono da configuração
 * @param payload      - Payload tipado do evento
 */
export async function triggerWebhook(
  workspaceId: string,
  payload: WebhookPayload,
): Promise<void> {
  if (!WEBHOOK_ENABLED) {
    // Log local para depuração enquanto a feature está desabilitada
    console.debug('[webhook:disabled]', payload.event, payload);
    return;
  }

  try {
    // Quando ativado, substitua pelo import do supabase client real:
    // const { supabase } = await import('@/integrations/supabase/client');
    // await supabase.functions.invoke('dispatch-webhook', {
    //   body: { workspace_id: workspaceId, payload },
    // });
    console.info('[webhook:sent]', payload.event, workspaceId);
  } catch (err) {
    // Falha silenciosa — webhook nunca pode derrubar o fluxo principal
    console.error('[webhook:error]', err);
  }
}