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
  context_priority: string[];
  is_default: boolean;
  is_active: boolean;
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
] as const;

export type ContextPriorityKey = typeof CONTEXT_PRIORITY_OPTIONS[number]['value'];

// =====================================================
// AI Model Options
// =====================================================

export const AI_MODEL_OPTIONS = [
  { 
    value: 'google/gemini-3-flash-preview', 
    label: 'Gemini 3 Flash (Rápido)', 
    description: 'Balanceado entre velocidade e qualidade' 
  },
  { 
    value: 'google/gemini-2.5-flash', 
    label: 'Gemini 2.5 Flash', 
    description: 'Bom para tarefas multimodais e raciocínio' 
  },
  { 
    value: 'google/gemini-2.5-flash-lite', 
    label: 'Gemini 2.5 Flash Lite (Econômico)', 
    description: 'Mais rápido e econômico para tarefas simples' 
  },
  { 
    value: 'google/gemini-3-pro-preview', 
    label: 'Gemini 3 Pro (Premium)', 
    description: 'Máxima qualidade de raciocínio' 
  },
  { 
    value: 'openai/gpt-5-mini', 
    label: 'GPT-5 Mini', 
    description: 'Equilíbrio entre custo e performance' 
  },
] as const;

export type AIModelName = typeof AI_MODEL_OPTIONS[number]['value'];
