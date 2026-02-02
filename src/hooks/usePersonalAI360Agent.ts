import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ChatMessage, ChatError } from '@/types/ai';

// =====================================================
// Query Keys
// =====================================================

export const personalAI360Keys = {
  all: ['personal-ai-360'] as const,
  context: () => [...personalAI360Keys.all, 'context'] as const,
};

// =====================================================
// Personal Context Types
// =====================================================

export interface PersonalFinancialSummary {
  total_income_this_month: number;
  total_expenses_this_month: number;
  balance: number;
  total_savings: number;
}

export interface PersonalDebtSummary {
  total_pending: number;
  overdue_count: number;
  upcoming_items: Array<{
    id: string;
    name: string;
    amount: number;
    due_date: string;
    urgency_status: string;
  }>;
}

export interface PersonalTaskSummary {
  pending_today: number;
  overdue_count: number;
  items: Array<{
    id: string;
    title: string;
    type: string;
    scheduled_date: string | null;
    deadline_status: string;
  }>;
}

export interface PersonalScheduleSummary {
  today_blocks: number;
  upcoming_blocks: Array<{
    id: string;
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    type: string;
    completed: boolean;
  }>;
}

export interface PersonalGoalSummary {
  active_count: number;
  items: Array<{
    id: string;
    name: string;
    type: string;
    target_amount: number;
    current_amount: number;
    progress_percent: number;
    days_remaining: number;
    is_overdue: boolean;
  }>;
}

export interface PersonalPurchasePlanSummary {
  active_count: number;
  total_target: number;
  total_saved: number;
  items: Array<{
    id: string;
    name: string;
    target_amount: number;
    saved_amount: number;
    progress_percent: number;
    priority: string;
    deadline_status: string;
  }>;
}

export interface PersonalProjectSummary {
  total: number;
  by_status: Record<string, number>;
  items: Array<{
    id: string;
    name: string;
    status: string;
    priority: number;
    total_tasks: number;
    completed_tasks: number;
  }>;
}

export interface PersonalScriptSummary {
  pending_count: number;
  by_platform: Record<string, number>;
  items: Array<{
    id: string;
    title: string;
    platform: string;
    status: string;
    scheduled_date: string;
  }>;
}

export interface PersonalContextSummary {
  finances: PersonalFinancialSummary;
  debts: PersonalDebtSummary;
  tasks: PersonalTaskSummary;
  schedule: PersonalScheduleSummary;
  goals: PersonalGoalSummary;
  purchase_plans: PersonalPurchasePlanSummary;
  projects: PersonalProjectSummary;
  scripts: PersonalScriptSummary;
}

// =====================================================
// Fetch Personal Context
// =====================================================

async function fetchPersonalContext(): Promise<PersonalContextSummary | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const { data, error } = await supabase.rpc('get_personal_360_summary', {
    p_user_id: user.id,
  });

  if (error) {
    console.error('[usePersonalAI360Agent] Error fetching context:', error);
    throw new Error('Erro ao buscar contexto pessoal');
  }

  return data as unknown as PersonalContextSummary;
}

/**
 * Hook to fetch the user's personal 360° context
 */
export function usePersonalContext() {
  return useQuery({
    queryKey: personalAI360Keys.context(),
    queryFn: fetchPersonalContext,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

// =====================================================
// Chat with Personal AI Agent (Streaming)
// =====================================================

interface AskPersonalAIParams {
  messages: ChatMessage[];
  agentId?: string;
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
}

/**
 * Sends a chat request to the Personal AI 360 Agent with streaming support
 */
async function askPersonalAI360Agent({
  messages,
  agentId,
  onChunk,
  signal,
}: AskPersonalAIParams): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Usuário não autenticado');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/ai-360-personal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      messages,
      agent_id: agentId,
    }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as ChatError;
    
    if (response.status === 429) {
      throw new Error(errorData.error || 'Limite de requisições excedido. Aguarde alguns minutos.');
    }
    if (response.status === 402) {
      throw new Error(errorData.error || 'Créditos de IA esgotados.');
    }
    if (response.status === 401) {
      throw new Error(errorData.error || 'Sessão expirada. Faça login novamente.');
    }
    
    throw new Error(errorData.error || 'Erro ao processar solicitação de IA');
  }

  // Handle streaming response
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Resposta inválida do servidor');
  }

  const decoder = new TextDecoder();
  let fullContent = '';
  let textBuffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      textBuffer += decoder.decode(value, { stream: true });
      
      // Process line-by-line as data arrives
      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          
          if (content) {
            fullContent += content;
            onChunk?.(content);
          }
        } catch {
          // Incomplete JSON - put it back and wait for more data
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }

    // Final flush for remaining buffer
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split('\n')) {
        if (!raw) continue;
        if (raw.endsWith('\r')) raw = raw.slice(0, -1);
        if (raw.startsWith(':') || raw.trim() === '') continue;
        if (!raw.startsWith('data: ')) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            onChunk?.(content);
          }
        } catch { /* ignore partial leftovers */ }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullContent;
}

/**
 * Hook for sending messages to the Personal AI 360 Agent with streaming
 */
export function useAskPersonalAI360Agent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: askPersonalAI360Agent,
    onSuccess: () => {
      // Refresh context after successful chat
      queryClient.invalidateQueries({ queryKey: personalAI360Keys.context() });
    },
  });
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Formats currency values for display
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Calculates the overall financial health score (0-100)
 */
export function calculateFinancialHealth(context: PersonalContextSummary | null): number {
  if (!context) return 0;
  
  const { finances, debts, goals } = context;
  
  let score = 50; // Base score
  
  // Positive: income > expenses
  if (finances.balance > 0) {
    score += Math.min(20, (finances.balance / finances.total_income_this_month) * 20);
  } else {
    score -= Math.min(20, Math.abs(finances.balance / finances.total_income_this_month) * 20);
  }
  
  // Positive: has savings
  if (finances.total_savings > 0) {
    score += 10;
  }
  
  // Negative: overdue debts
  if (debts.overdue_count > 0) {
    score -= Math.min(20, debts.overdue_count * 5);
  }
  
  // Positive: goals on track
  const onTrackGoals = goals.items.filter(g => !g.is_overdue).length;
  if (onTrackGoals > 0) {
    score += Math.min(10, onTrackGoals * 2);
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Gets priority alerts from the personal context
 */
export function getPersonalAlerts(context: PersonalContextSummary | null): Array<{
  type: 'danger' | 'warning' | 'info';
  message: string;
}> {
  if (!context) return [];
  
  const alerts: Array<{ type: 'danger' | 'warning' | 'info'; message: string }> = [];
  
  // Overdue debts
  if (context.debts.overdue_count > 0) {
    alerts.push({
      type: 'danger',
      message: `${context.debts.overdue_count} dívida(s) vencida(s) pendente(s)`,
    });
  }
  
  // Urgent debts (due soon)
  const urgentDebts = context.debts.upcoming_items.filter(
    d => d.urgency_status === 'vence_hoje' || d.urgency_status === 'vence_amanha'
  );
  if (urgentDebts.length > 0) {
    alerts.push({
      type: 'warning',
      message: `${urgentDebts.length} conta(s) vencem hoje ou amanhã`,
    });
  }
  
  // Overdue tasks
  if (context.tasks.overdue_count > 0) {
    alerts.push({
      type: 'warning',
      message: `${context.tasks.overdue_count} tarefa(s) atrasada(s)`,
    });
  }
  
  // Negative balance
  if (context.finances.balance < 0) {
    alerts.push({
      type: 'danger',
      message: `Saldo negativo: ${formatCurrency(context.finances.balance)}`,
    });
  }
  
  // Goals at risk
  const atRiskGoals = context.goals.items.filter(g => g.is_overdue);
  if (atRiskGoals.length > 0) {
    alerts.push({
      type: 'warning',
      message: `${atRiskGoals.length} meta(s) atrasada(s)`,
    });
  }
  
  return alerts;
}
