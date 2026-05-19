// =====================================================
// AI 360° Context Types
// =====================================================

// =====================================================
// AI API Keys
// =====================================================

export interface AiApiKey {
  id: string;
  user_id: string;
  provider: string;
  api_key: string;
  label: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AiApiKeyCreate {
  provider: string;
  api_key: string;
  label?: string | null;
  is_active?: boolean;
}

export interface AiApiKeyUpdate extends Partial<AiApiKeyCreate> {
  id: string;
}

// =====================================================
// AI 360° Context Summary
// =====================================================

export interface AI360ContextSummary {
  generated_at: string;
  user_id: string;
  projects: ProjectsSummary;
  tasks: TasksSummary;
  sales_pipeline: SalesPipelineSummary;
  sales_goals: SalesGoalProgress[];
  schedule: ScheduleSummary;
  editorial: EditorialSummary;
  team: TeamSummary;
}

// =====================================================
// Projects
// =====================================================

export interface ProjectsSummary {
  total: number;
  by_status: ProjectStatusCount;
  corporate_count: number;
  overdue_count: number;
  items: ProjectItem[];
}

export interface ProjectStatusCount {
  todo: number;
  progress: number;
  blocked: number;
  done: number;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: number;
  deadline: string | null;
  is_corporate: boolean;
  is_overdue: boolean;
  client_name: string | null;
  company_name: string | null;
  category_name: string | null;
  category_color: string | null;
  total_tasks: number;
  completed_tasks: number;
  total_estimated_hours: number | null;
  total_actual_hours: number | null;
  prospect_id: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// Tasks
// =====================================================

export interface TasksSummary {
  total_pending: number;
  by_status: TaskStatusCount;
  overdue_count: number;
  due_today: number;
  due_this_week: number;
  high_priority: number;
  items: TaskItem[];
}

export interface TaskStatusCount {
  todo: number;
  in_progress: number;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  deadline: string | null;
  deadline_status: string | null;
  is_overdue: boolean;
  project_id: string | null;
  project_name: string | null;
  client_name: string | null;
  company_name: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  created_at: string;
}

// =====================================================
// Sales Pipeline
// =====================================================

export interface SalesPipelineSummary {
  total_prospects: number;
  total_value: number;
  weighted_value: number;
  closed_value: number;
  by_status: SalesPipelineStatusCount;
  items: ProspectItem[];
}

export interface SalesPipelineStatusCount {
  novo: number;
  em_negociacao: number;
  proposta_enviada: number;
  fechado: number;
  perdido: number;
}

export interface ProspectItem {
  id: string;
  client_name: string;
  company_name: string | null;
  status: string;
  estimated_value: number;
  weighted_value: number;
  conversion_probability: number;
  stage_order: number;
  project_type: string | null;
  payment_type: string | null;
  contract_duration: number | null;
  plan_id: string | null;
  plan_name: string | null;
  prospection_date: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// Sales Goals
// =====================================================

export interface SalesGoalProgress {
  id: string;
  goal_type: string;
  target_amount: number;
  current_amount: number;
  progress_percent: number;
  remaining_amount: number;
  days_remaining: number;
  status: string;
  start_date: string;
  end_date: string;
  project_id: string | null;
  project_name: string | null;
}

// =====================================================
// Schedule / Appointments
// =====================================================

export interface ScheduleSummary {
  total_upcoming: number;
  today: number;
  tomorrow: number;
  this_week: number;
  items: AppointmentItem[];
}

export interface AppointmentItem {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  start_datetime: string;
  type: string;
  type_name: string | null;
  color: string | null;
  completed: boolean;
  day_status: string;
}

// =====================================================
// Editorial Calendar
// =====================================================

export interface EditorialSummary {
  total_pending: number;
  overdue_count: number;
  due_today: number;
  by_status: EditorialStatusCount;
  by_platform: EditorialPlatformCount;
  items: EditorialItem[];
}

export interface EditorialStatusCount {
  idea: number;
  draft: number;
  review: number;
  approved: number;
}

export interface EditorialPlatformCount {
  instagram: number;
  tiktok: number;
  youtube: number;
  linkedin: number;
  blog: number;
}

export interface EditorialItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  platform: string;
  content_type: string;
  due_date: string;
  deadline_status: string | null;
  is_overdue: boolean;
  assigned_to: string | null;
  assigned_name: string | null;
  project_id: string | null;
  project_name: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// Team
// =====================================================

export interface TeamSummary {
  active_members: number;
  total_hours_available: number;
  members: TeamMember[];
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  hours_available: number;
}

// =====================================================
// AI Agent Configuration
// =====================================================

export interface AIAgent {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  system_prompt: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  context_priority: string[] | null;
  is_default: boolean;
  is_active: boolean;
  api_key_id: string | null;
  routing_enabled?: boolean;
  model_name_simple?: string;
  model_name_standard?: string;
  model_name_complex?: string;
  api_key_id_simple?: string | null;
  api_key_id_standard?: string | null;
  api_key_id_complex?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIAgentCreate {
  name: string;
  description?: string | null;
  system_prompt: string;
  model_name?: string;
  temperature?: number;
  max_tokens?: number;
  context_priority?: string[];
  is_default?: boolean;
  is_active?: boolean;
  api_key_id?: string | null;
  routing_enabled?: boolean;
  model_name_simple?: string;
  model_name_standard?: string;
  model_name_complex?: string;
  api_key_id_simple?: string | null;
  api_key_id_standard?: string | null;
  api_key_id_complex?: string | null;
}

export interface AIAgentUpdate extends Partial<AIAgentCreate> {
  id: string;
}

// =====================================================
// Chat Types
// =====================================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  agent_id?: string;
}

export interface ChatError {
  error: string;
  code?: 'RATE_LIMIT' | 'INSUFFICIENT_CREDITS' | 'AI_ERROR' | 'INTERNAL_ERROR';
}

// ============= Conversations & History =============

export interface AIConversation {
  id: string;
  user_id: string;
  agent_id: string | null;
  title: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

// =====================================================
// Context Priority Options

// =====================================================

export const CONTEXT_PRIORITY_OPTIONS = [
  { value: 'tasks', label: 'Tarefas', icon: 'CheckSquare' },
  { value: 'projects', label: 'Projetos', icon: 'FolderKanban' },
  { value: 'sales_pipeline', label: 'Pipeline de Vendas', icon: 'TrendingUp' },
  { value: 'schedule', label: 'Agenda', icon: 'Calendar' },
  { value: 'editorial', label: 'Calendário Editorial', icon: 'FileText' },
  { value: 'team', label: 'Equipe', icon: 'Users' },
  { value: 'briefings', label: 'Briefings Dinâmicos', icon: 'FileQuestion' },
  { value: 'finance', label: 'Financeiro', icon: 'DollarSign' },
  { value: 'products', label: 'Produtos e Serviços', icon: 'Package' },
  { value: 'processes', label: 'Processos', icon: 'Settings' },
] as const;

export type ContextPriorityKey = typeof CONTEXT_PRIORITY_OPTIONS[number]['value'];

// =====================================================
// AI Model Options
// =====================================================

export const AI_MODEL_OPTIONS = [
  // OpenAI Models
  { 
    value: 'openai/gpt-4o', 
    label: 'GPT-4o (Omni)', 
    description: 'Mais inteligente e versátil da OpenAI',
    provider: 'openai'
  },
  { 
    value: 'openai/gpt-4o-mini', 
    label: 'GPT-4o Mini', 
    description: 'Rápido e econômico, ideal para tarefas simples',
    provider: 'openai'
  },
  { 
    value: 'openai/o1-preview', 
    label: 'o1 Preview (Raciocínio)', 
    description: 'Novo modelo focado em raciocínio complexo',
    provider: 'openai'
  },
  { 
    value: 'google/gemini-3-flash-preview', 
    label: 'Gemini 3 Flash', 
    description: 'Nova geração ultra-rápida do Google (Preview)',
    provider: 'google'
  },
  { 
    value: 'google/gemini-3.1-pro-preview', 
    label: 'Gemini 3.1 Pro', 
    description: 'Máximo raciocínio e contexto do Google',
    provider: 'google'
  },
  { 
    value: 'openai/gpt-5', 
    label: 'GPT-5 (Omni)', 
    description: 'A nova fronteira de inteligência da OpenAI',
    provider: 'openai'
  },
  { 
    value: 'openai/gpt-5-mini', 
    label: 'GPT-5 Mini', 
    description: 'Extremamente rápido e inteligente para tarefas diárias',
    provider: 'openai'
  },

  // Anthropic Models
  { 
    value: 'anthropic/claude-3-5-sonnet', 
    label: 'Claude 3.5 Sonnet', 
    description: 'Excelente para escrita e codificação',
    provider: 'anthropic'
  },
  { 
    value: 'anthropic/claude-3-haiku', 
    label: 'Claude 3 Haiku', 
    description: 'Ultra rápido e eficiente para respostas curtas',
    provider: 'anthropic'
  },
  { 
    value: 'anthropic/claude-3-opus', 
    label: 'Claude 3 Opus', 
    description: 'Poder máximo para análises profundas',
    provider: 'anthropic'
  },

  // Google Models
  { 
    value: 'google/gemini-1.5-pro', 
    label: 'Gemini 1.5 Pro', 
    description: 'Modelo mais avançado do Google',
    provider: 'google'
  },
  { 
    value: 'google/gemini-1.5-flash', 
    label: 'Gemini 1.5 Flash', 
    description: 'Velocidade e eficiência excepcionais',
    provider: 'google'
  },
  { 
    value: 'google/gemini-pro-vision', 
    label: 'Gemini Vision', 
    description: 'Especialista em análise de imagens e vídeos',
    provider: 'google'
  },

  // OpenRouter (Universal)
  { 
    value: 'openrouter/auto', 
    label: 'OpenRouter Auto', 
    description: 'Roteamento automático pelo melhor custo-benefício',
    provider: 'openrouter'
  },
  { 
    value: 'meta-llama/llama-3.1-405b', 
    label: 'Llama 3.1 405B', 
    description: 'O maior modelo open-source do mundo',
    provider: 'openrouter'
  },
  { 
    value: 'mistralai/pixtral-12b', 
    label: 'Pixtral 12B', 
    description: 'Modelo multimodal de alta performance',
    provider: 'openrouter'
  },
] as const;

export type AIModelName = typeof AI_MODEL_OPTIONS[number]['value'];
