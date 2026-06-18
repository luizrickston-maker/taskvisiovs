/**
 * AI Action Handlers — All Modules
 *
 * Registers handlers for every AI-operable module:
 * - Comercial  (prospects, metas de vendas)
 * - Projetos PJ (projetos, tarefas)
 * - Briefings   (criar, enviar link)
 * - Calendário Editorial (criar, atualizar status)
 * - Agenda PJ   (criar, atualizar, apagar time_blocks)
 * - Caixa PJ    (lançamento de transação)
 * - Investimentos (criar, apagar — pré-existente migrado aqui)
 * - Tarefas/Projetos pessoais (delete — pré-existente migrado aqui)
 *
 * HOW TO ADD A NEW MODULE:
 * 1. Add handler functions below
 * 2. Call registerHandler() inside registerAllHandlers()
 * 3. Add the token description to the system prompt in the Edge Function
 */

import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/useAppStore';
import { toast } from 'sonner';
import {
  registerHandler,
  isValidUUID,
  type AutoHandler,
  type ConfirmHandler,
} from './ai-action-dispatcher';
import type { Prospect, Project, ProjectTask } from '@/types/database';
import type { EditorialCalendarItem } from '@/types/editorial';

// =====================================================
// Helpers
// =====================================================

async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');
  return user;
}

async function getWorkspaceId(): Promise<string> {
  const { data, error } = await supabase.rpc('get_my_workspace_id');
  if (error || !data) throw new Error('Workspace não encontrado');
  return data as string;
}

function today() {
  return new Date().toISOString().split('T')[0];
}

// =====================================================
// COMERCIAL — Prospects
// =====================================================

const createProspect: AutoHandler = async (params) => {
  const user = await getUser();
  const { data, error } = await supabase
    .from('prospects')
    .insert({
      user_id: user.id,
      client_name: params.client_name || params.nome || 'Novo Prospect',
      company_name: params.company_name || params.empresa || null,
      status: params.status || 'novo',
      prospection_date: params.data || today(),
      estimated_value: parseFloat(params.valor || params.estimated_value || '0') || 0,
      notes: params.notes || params.obs || null,
      project_type: params.tipo || params.project_type || null,
      payment_type: params.pagamento || params.payment_type || null,
    })
    .select()
    .single();

  if (error) throw error;
  useAppStore.getState().addProspect(data as Prospect);
  toast.success(`Prospect criado: ${data.client_name}`);
  return { label: `Prospect "${data.client_name}" criado` };
};

const updateProspectStatus: AutoHandler = async (params) => {
  if (!params.id || !isValidUUID(params.id)) throw new Error('ID inválido para prospect');
  const { data, error } = await supabase
    .from('prospects')
    .update({ status: params.status })
    .eq('id', params.id)
    .select()
    .single();

  if (error) throw error;
  useAppStore.getState().updateProspect(params.id, { status: params.status } as Partial<Prospect>);
  toast.success(`Status atualizado: ${data.client_name} → ${params.status}`);
  return { label: `Prospect "${data.client_name}" → ${params.status}` };
};

const deleteProspectHandler: ConfirmHandler = async (id) => {
  if (!isValidUUID(id)) throw new Error('ID inválido');
  const { error } = await supabase.from('prospects').delete().eq('id', id);
  if (error) throw error;
  useAppStore.getState().deleteProspect(id);
  toast.success('Prospect removido');
};

// =====================================================
// PROJETOS PJ — Projetos & Tarefas
// =====================================================

const createProject: AutoHandler = async (params) => {
  const user = await getUser();
  const workspaceId = await getWorkspaceId();
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      workspace_id: workspaceId,
      project: params.nome || params.project || 'Novo Projeto',
      task: params.descricao || params.task || '',
      status: params.status || 'todo',
      priority: parseInt(params.prioridade || params.priority || '3', 10),
      client_name: params.cliente || params.client_name || null,
      deadline: params.prazo || params.deadline || null,
      is_corporate: true,
    })
    .select()
    .single();

  if (error) throw error;
  useAppStore.getState().addProject(data as Project);
  toast.success(`Projeto criado: ${data.project}`);
  return { label: `Projeto "${data.project}" criado` };
};

const updateProjectStatus: AutoHandler = async (params) => {
  if (!params.id || !isValidUUID(params.id)) throw new Error('ID inválido para projeto');
  const updates: Record<string, unknown> = { status: params.status };
  if (params.prazo || params.deadline) updates.deadline = params.prazo || params.deadline;

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) throw error;
  useAppStore.getState().updateProject(params.id, updates as Partial<Project>);
  toast.success(`Projeto "${data.project}" atualizado`);
  return { label: `Projeto "${data.project}" → ${params.status}` };
};

const createProjectTask: AutoHandler = async (params) => {
  const user = await getUser();
  if (!params.project_id || !isValidUUID(params.project_id)) throw new Error('project_id inválido');
  const { data, error } = await supabase
    .from('project_tasks')
    .insert({
      user_id: user.id,
      project_id: params.project_id,
      title: params.titulo || params.title || 'Nova Tarefa',
      description: params.descricao || params.description || null,
      status: params.status || 'todo',
      priority: parseInt(params.prioridade || params.priority || '3', 10),
      deadline: params.prazo || params.deadline || null,
    })
    .select()
    .single();

  if (error) throw error;
  useAppStore.getState().addProjectTask(data as ProjectTask);
  toast.success(`Tarefa criada: ${data.title}`);
  return { label: `Tarefa "${data.title}" criada` };
};

const deleteProjectHandler: ConfirmHandler = async (id) => {
  if (!isValidUUID(id)) throw new Error('ID inválido');
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
  useAppStore.getState().deleteProject(id);
  toast.success('Projeto removido');
};

const deleteTaskHandler: ConfirmHandler = async (id) => {
  if (!isValidUUID(id)) throw new Error('ID inválido');
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
  useAppStore.getState().deleteTask(id);
  toast.success('Tarefa removida');
};

// =====================================================
// BRIEFINGS
// =====================================================

const createBriefing: AutoHandler = async (params) => {
  const user = await getUser();
  const wsId = await getWorkspaceId();
  const { data, error } = await supabase
    .from('briefings')
    .insert({
      workspace_id: wsId,
      created_by_user_id: user.id,
      title: params.titulo || params.title || 'Novo Briefing',
      status: 'draft',
      briefing_type: params.tipo === 'edicao' ? 'editing' : 'creative',
      client_id: isValidUUID(params.client_id || '') ? params.client_id : null,
    })
    .select()
    .single();

  if (error) throw error;
  toast.success(`Briefing criado: ${data.title}`);
  return { label: `Briefing "${data.title}" criado` };
};

const sendBriefingLink: AutoHandler = async (params) => {
  if (!params.id || !isValidUUID(params.id)) throw new Error('ID inválido para briefing');
  const { data, error } = await supabase.functions.invoke('generate-briefing-magic-link', {
    body: { briefing_id: params.id },
  });

  if (error) throw error;
  if (data?.magicLink) {
    navigator.clipboard.writeText(data.magicLink).catch(() => {});
    toast.success('Link de briefing gerado e copiado!');
  }
  return { label: `Link do briefing enviado` };
};

const deleteBriefingHandler: ConfirmHandler = async (id) => {
  if (!isValidUUID(id)) throw new Error('ID inválido');
  const { error } = await supabase.from('briefings').delete().eq('id', id);
  if (error) throw error;
  toast.success('Briefing removido');
};

// =====================================================
// AGENDA PJ — Time Blocks
// =====================================================

const VALID_APPOINTMENT_TYPES = ['reuniao', 'cliente', 'projeto', 'tarefa', 'ligacao', 'pessoal', 'outros'];
const TYPE_COLORS: Record<string, string> = {
  reuniao: '#3b82f6', cliente: '#8b5cf6', projeto: '#22c55e',
  tarefa: '#f59e0b', ligacao: '#06b6d4', pessoal: '#ec4899', outros: '#6b7280',
};

const createAgendaAppointment: AutoHandler = async (params) => {
  const user = await getUser();
  const type = VALID_APPOINTMENT_TYPES.includes(params.type || '') ? params.type : 'reuniao';
  const color = TYPE_COLORS[type] ?? '#3b82f6';

  if (!params.start_time || !params.end_time) throw new Error('start_time e end_time são obrigatórios');
  if (!params.date) throw new Error('date é obrigatório (YYYY-MM-DD)');

  const { data, error } = await supabase
    .from('time_blocks')
    .insert({
      user_id: user.id,
      title: params.title || params.titulo || 'Compromisso',
      date: params.date || today(),
      start_time: params.start_time,
      end_time: params.end_time,
      type,
      color: params.color || color,
      completed: false,
    })
    .select()
    .single();

  if (error) throw error;
  useAppStore.getState().addTimeBlock(data as any);
  toast.success(`Compromisso criado: ${data.title} (${data.start_time}–${data.end_time})`);
  return { label: `Agenda: "${data.title}" em ${data.date} ${data.start_time}–${data.end_time}` };
};

const updateAgendaAppointment: AutoHandler = async (params) => {
  if (!params.id || !isValidUUID(params.id)) throw new Error('ID inválido para compromisso');

  const updates: Record<string, unknown> = {};
  if (params.title || params.titulo) updates.title = params.title || params.titulo;
  if (params.date) updates.date = params.date;
  if (params.start_time) updates.start_time = params.start_time;
  if (params.end_time) updates.end_time = params.end_time;
  if (params.type && VALID_APPOINTMENT_TYPES.includes(params.type)) {
    updates.type = params.type;
    updates.color = TYPE_COLORS[params.type] ?? '#6b7280';
  }

  const { data, error } = await supabase
    .from('time_blocks')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) throw error;
  useAppStore.getState().updateTimeBlock(params.id, data as any);
  toast.success(`Compromisso atualizado: ${data.title}`);
  return { label: `Agenda: "${data.title}" atualizado` };
};

const deleteAgendaAppointmentHandler: ConfirmHandler = async (id) => {
  if (!isValidUUID(id)) throw new Error('ID inválido');
  const { error } = await supabase.from('time_blocks').delete().eq('id', id);
  if (error) throw error;
  useAppStore.getState().deleteTimeBlock(id);
  toast.success('Compromisso removido da agenda');
};

// =====================================================
// CALENDÁRIO EDITORIAL
// =====================================================

const createEditorialItem: AutoHandler = async (params) => {
  const user = await getUser();
  const validStatuses = ['idea', 'draft', 'review', 'approved', 'published'];
  const validPlatforms = ['instagram', 'tiktok', 'linkedin', 'blog', 'youtube'];
  const validTypes = ['post', 'reel', 'story', 'article', 'video'];

  const status = validStatuses.includes(params.status || '') ? params.status : 'idea';
  const platform = validPlatforms.includes(params.plataforma || params.platform || '') 
    ? (params.plataforma || params.platform) 
    : 'instagram';
  const content_type = validTypes.includes(params.tipo || params.content_type || '') 
    ? (params.tipo || params.content_type) 
    : 'post';

  const { data, error } = await supabase
    .from('editorial_calendar_items')
    .insert({
      user_id: user.id,
      title: params.titulo || params.title || 'Novo Conteúdo',
      description: params.descricao || params.description || null,
      status,
      platform,
      content_type,
      due_date: params.data || params.due_date || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  useAppStore.getState().addEditorialCalendarItem(data as EditorialCalendarItem);
  toast.success(`Conteúdo criado: ${data.title}`);
  return { label: `Item editorial "${data.title}" criado` };
};

const updateEditorialStatus: AutoHandler = async (params) => {
  if (!params.id || !isValidUUID(params.id)) throw new Error('ID inválido para item editorial');
  const { data, error } = await supabase
    .from('editorial_calendar_items')
    .update({ status: params.status })
    .eq('id', params.id)
    .select()
    .single();

  if (error) throw error;
  useAppStore.getState().updateEditorialCalendarItem(params.id, { status: params.status } as Partial<EditorialCalendarItem>);
  toast.success(`Conteúdo "${data.title}" → ${params.status}`);
  return { label: `Editorial "${data.title}" → ${params.status}` };
};

const deleteEditorialHandler: ConfirmHandler = async (id) => {
  if (!isValidUUID(id)) throw new Error('ID inválido');
  const { error } = await supabase.from('editorial_calendar_items').delete().eq('id', id);
  if (error) throw error;
  useAppStore.getState().deleteEditorialCalendarItem(id);
  toast.success('Item editorial removido');
};

// =====================================================
// CAIXA PJ — Transações
// =====================================================

const createCaixaTransacao: AutoHandler = async (params) => {
  const user = await getUser();
  const { data: wsId, error: wsErr } = await supabase.rpc('get_my_workspace_id');
  if (wsErr || !wsId) throw new Error('Workspace não encontrado');

  const tipo = params.tipo === 'saida' ? 'saida' : 'entrada';
  const valor = parseFloat(params.valor || params.value || '0');
  if (!valor || valor <= 0) throw new Error('Valor inválido para transação');

  const { error } = await supabase
    .from('pj_caixa_transacoes')
    .insert({
      workspace_id: wsId,
      created_by: user.id,
      tipo,
      descricao: params.descricao || params.description || 'Lançamento via IA',
      valor,
      data: params.data || today(),
      origem_destino: params.origem || params.destino || params.origem_destino || null,
      observacoes: params.obs || params.observacoes || null,
      forma_pagamento: params.forma || params.forma_pagamento || null,
    });

  if (error) throw error;
  toast.success(`Transação registrada: ${tipo === 'entrada' ? '📈' : '📉'} R$ ${valor.toFixed(2)}`);
  return { label: `Transação de ${tipo} R$ ${valor.toFixed(2)} registrada` };
};

// =====================================================
// CAIXA PJ — Contas a Pagar
// =====================================================

const FREQ_VALIDAS = ['mensal', 'trimestral', 'semestral', 'anual'];

const createContaPagar: AutoHandler = async (params) => {
  const user = await getUser();
  const wsId = await getWorkspaceId();

  const valor = parseFloat(params.valor || params.value || '0');
  if (!valor || valor <= 0) throw new Error('Valor inválido para conta a pagar');

  const vencimento = params.data_vencimento || params.vencimento || params.data || today();
  const recorrente = params.recorrente === 'true' || params.recorrente === 'sim';
  const frequencia = FREQ_VALIDAS.includes(params.frequencia || '')
    ? params.frequencia
    : (recorrente ? 'mensal' : null);

  const { data, error } = await supabase
    .from('pj_contas_pagar')
    .insert({
      workspace_id: wsId,
      created_by: user.id,
      descricao: params.descricao || params.description || 'Conta a pagar via IA',
      fornecedor: params.fornecedor || params.supplier || null,
      valor,
      data_vencimento: vencimento,
      status: 'pendente',
      forma_pagamento: params.forma || params.forma_pagamento || null,
      recorrente,
      frequencia,
      observacoes: params.obs || params.observacoes || null,
    })
    .select()
    .single();

  if (error) throw error;
  const rec = recorrente ? ` (recorrente ${frequencia})` : '';
  toast.success(`Conta a pagar criada: ${data.descricao} — vence ${data.data_vencimento}`);
  return { label: `Conta "${data.descricao}" de R$ ${valor.toFixed(2)} (vence ${data.data_vencimento})${rec}` };
};

const payContaPagar: AutoHandler = async (params) => {
  if (!params.id || !isValidUUID(params.id)) throw new Error('ID inválido para conta a pagar');

  const { data, error } = await supabase
    .from('pj_contas_pagar')
    .update({
      status: 'pago',
      data_pagamento: params.data_pagamento || params.data || today(),
      ...((params.forma || params.forma_pagamento)
        ? { forma_pagamento: params.forma || params.forma_pagamento }
        : {}),
    })
    .eq('id', params.id)
    .select()
    .single();

  if (error) throw error;
  toast.success(`Conta paga: ${data.descricao}`);
  return { label: `Conta "${data.descricao}" marcada como paga` };
};

// =====================================================
// RESERVAS (SAVINGS)
// =====================================================

const createSaving: AutoHandler = async (params) => {
  const user = await getUser();
  const amount = parseFloat(params.amount || params.valor || '0');
  if (!amount || amount <= 0) throw new Error('Valor inválido para reserva');

  const { data, error } = await supabase
    .from('savings')
    .insert({
      user_id: user.id,
      description: params.name || params.nome || params.description || params.descricao || 'Reserva via IA',
      amount,
      date: params.date || params.data || new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) throw error;
  useAppStore.getState().addSaving(data);
  toast.success(`Reserva adicionada: R$ ${amount.toFixed(2)}`);
  return { label: `Reserva de R$ ${amount.toFixed(2)} registrada` };
};

const deleteSavingHandler: ConfirmHandler = async (id) => {
  if (!isValidUUID(id)) throw new Error('ID inválido');
  const { error } = await supabase.from('savings').delete().eq('id', id);
  if (error) throw error;
  useAppStore.getState().deleteSaving(id);
  toast.success('Reserva removida');
};

// =====================================================
// INVESTIMENTOS CORPORATIVOS (migrado do handler antigo)
// =====================================================

const createInvestimento: AutoHandler = async (params) => {
  const user = await getUser();
  const amount = parseFloat(params.amount || params.valor || '0');
  if (!amount || amount <= 0) throw new Error('Valor inválido para investimento');

  const { data, error } = await supabase
    .from('corporate_investments')
    .insert({
      user_id: user.id,
      item_name: params.item_name || params.nome || 'Investimento',
      amount,
      category: (params.category || params.categoria || 'outros').toLowerCase(),
      notes: params.notes || params.obs || null,
      purchase_date: today(),
    })
    .select()
    .single();

  if (error) throw error;
  useAppStore.getState().addCorporateInvestment(data);
  toast.success(`Investimento adicionado: ${data.item_name}`);
  return { label: `Investimento "${data.item_name}" criado` };
};

const deleteInvestimentoHandler: ConfirmHandler = async (id) => {
  if (!isValidUUID(id)) throw new Error('ID inválido');
  const { error } = await supabase.from('corporate_investments').delete().eq('id', id);
  if (error) throw error;
  useAppStore.getState().deleteCorporateInvestment(id);
  toast.success('Investimento removido');
};

// =====================================================
// Registration — call once at app startup
// =====================================================

let _registered = false;

export function registerAllHandlers() {
  if (_registered) return;
  _registered = true;

  // Comercial
  registerHandler('CREATE_PROSPECT', 'auto', createProspect);
  registerHandler('UPDATE_PROSPECT_STATUS', 'auto', updateProspectStatus);
  registerHandler('DELETE_PROSPECT', 'confirm', deleteProspectHandler);

  // Projetos PJ
  registerHandler('CREATE_PROJECT', 'auto', createProject);
  registerHandler('UPDATE_PROJECT_STATUS', 'auto', updateProjectStatus);
  registerHandler('DELETE_PROJECT', 'confirm', deleteProjectHandler);
  registerHandler('CREATE_PROJECT_TASK', 'auto', createProjectTask);
  registerHandler('DELETE_TASK', 'confirm', deleteTaskHandler);

  // Briefings
  registerHandler('CREATE_BRIEFING', 'auto', createBriefing);
  registerHandler('SEND_BRIEFING_LINK', 'auto', sendBriefingLink);
  registerHandler('DELETE_BRIEFING', 'confirm', deleteBriefingHandler);

  // Agenda PJ
  registerHandler('CREATE_AGENDA_APPOINTMENT', 'auto', createAgendaAppointment);
  registerHandler('UPDATE_AGENDA_APPOINTMENT', 'auto', updateAgendaAppointment);
  registerHandler('DELETE_AGENDA_APPOINTMENT', 'confirm', deleteAgendaAppointmentHandler);

  // Calendário Editorial
  registerHandler('CREATE_EDITORIAL_ITEM', 'auto', createEditorialItem);
  registerHandler('UPDATE_EDITORIAL_STATUS', 'auto', updateEditorialStatus);
  registerHandler('DELETE_EDITORIAL_ITEM', 'confirm', deleteEditorialHandler);

  // Caixa PJ
  registerHandler('CREATE_CAIXA_TRANSACAO', 'auto', createCaixaTransacao);

  // Caixa PJ — Contas a Pagar
  registerHandler('CREATE_CONTA_PAGAR', 'auto', createContaPagar);
  registerHandler('PAY_CONTA_PAGAR', 'auto', payContaPagar);

  // Reservas (Savings)
  registerHandler('CREATE_SAVING', 'auto', createSaving);
  registerHandler('DELETE_SAVING', 'confirm', deleteSavingHandler);

  // Investimentos
  registerHandler('CREATE_INVESTMENT', 'auto', createInvestimento);
  registerHandler('DELETE_INVESTMENT', 'confirm', deleteInvestimentoHandler);

  // Legacy aliases (backward compat with REQUEST_ADD_INVESTMENT / REQUEST_ADD_SAVING tokens)
  registerHandler('REQUEST_ADD_INVESTMENT', 'auto', createInvestimento);
  registerHandler('REQUEST_ADD_SAVING', 'auto', createSaving);
  // NOTE: DELETE_SUGGESTION is intentionally NOT registered here.
  // It is handled by the inline button UI in OperationalBrainChat and AI360ChatInterface.
}
