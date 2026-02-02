// =====================================================
// Shared Types for Edge Functions
// Eliminates 'any' usage across AI Edge Functions
// =====================================================

// =====================================================
// Common Types
// =====================================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface RequestBody {
  messages: ChatMessage[];
  agent_id?: string;
}

// =====================================================
// Agent Configuration
// =====================================================

export interface AIAgent {
  id: string;
  name: string;
  system_prompt: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  context_priority: string[];
  api_key_id: string | null;
}

export interface AiApiKey {
  id: string;
  provider: string;
  api_key: string;
  is_active: boolean;
}

export interface AgentKeyInfo {
  key: string;
  provider: string;
}

export interface AgentWithKey {
  agent: AIAgent | null;
  customKeyInfo: AgentKeyInfo | null;
}

// =====================================================
// Project Types
// =====================================================

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

export interface ProjectsSummary {
  total: number;
  by_status: ProjectStatusCount;
  corporate_count: number;
  overdue_count: number;
  items: ProjectItem[];
}

// =====================================================
// Task Types
// =====================================================

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

export interface TasksSummary {
  total_pending: number;
  by_status: TaskStatusCount;
  overdue_count: number;
  due_today: number;
  due_this_week: number;
  high_priority: number;
  items: TaskItem[];
}

// =====================================================
// Sales Pipeline Types
// =====================================================

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

export interface SalesPipelineSummary {
  total_prospects: number;
  total_value: number;
  weighted_value: number;
  closed_value: number;
  by_status: SalesPipelineStatusCount;
  items: ProspectItem[];
}

// =====================================================
// Sales Goals Types
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
// Schedule Types
// =====================================================

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

export interface ScheduleSummary {
  total_upcoming: number;
  today: number;
  tomorrow: number;
  this_week: number;
  items: AppointmentItem[];
}

// =====================================================
// Editorial Types
// =====================================================

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

export interface EditorialSummary {
  total_pending: number;
  overdue_count: number;
  due_today: number;
  by_status: EditorialStatusCount;
  by_platform: EditorialPlatformCount;
  items: EditorialItem[];
}

// =====================================================
// Team Types
// =====================================================

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  hours_available: number;
}

export interface TeamSummary {
  active_members: number;
  total_hours_available: number;
  members: TeamMember[];
}

// =====================================================
// AI 360° Business Context
// =====================================================

export interface AI360Context {
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
// Personal Context Types
// =====================================================

export interface FinancesSummary {
  income_this_month: number;
  expenses_this_month: number;
  balance_this_month: number;
  pending_debts: number;
  overdue_debts_count: number;
  total_savings: number;
}

export interface DebtItem {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  type: string;
  urgency_status: string;
  category_name: string | null;
  installment_info: string | null;
}

export interface DebtsSummary {
  total_pending: number;
  total_amount: number;
  overdue_count: number;
  critical_count: number;
  items: DebtItem[];
}

export interface PersonalTaskItem {
  id: string;
  title: string;
  type: string;
  scheduled_date: string | null;
  deadline_status: string | null;
  is_overdue: boolean;
  created_at: string;
}

export interface PersonalTasksSummary {
  total_pending: number;
  inbox_count: number;
  today_count: number;
  overdue_count: number;
  by_status: {
    inbox: number;
    overdue: number;
    today: number;
    tomorrow: number;
    this_week: number;
  };
  items: PersonalTaskItem[];
}

export interface PersonalTimeBlockItem {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  type: string;
  type_name: string | null;
  color: string | null;
  completed: boolean;
  day_status: string;
  start_datetime: string;
}

export interface PersonalScheduleSummary {
  total_upcoming: number;
  today: number;
  tomorrow: number;
  this_week: number;
  items: PersonalTimeBlockItem[];
}

export interface PersonalGoalItem {
  id: string;
  name: string;
  type: string;
  target_amount: number;
  current_amount: number;
  progress_percent: number;
  deadline: string | null;
  days_remaining: number | null;
  is_overdue: boolean;
  status: string;
}

export interface PersonalGoalsSummary {
  total_active: number;
  overdue_count: number;
  urgent_count: number;
  items: PersonalGoalItem[];
}

export interface PersonalProjectItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: number;
  category_name: string | null;
  category_color: string | null;
  total_tasks: number;
  completed_tasks: number;
  total_estimated_hours: number | null;
  total_actual_hours: number | null;
  estimated_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonalProjectsSummary {
  total: number;
  by_status: ProjectStatusCount;
  items: PersonalProjectItem[];
}

export interface ScriptItem {
  id: string;
  title: string;
  platform: string;
  status: string;
  scheduled_date: string;
  deadline_status: string | null;
  is_overdue: boolean;
  project_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScriptsSummary {
  total_pending: number;
  overdue_count: number;
  today_count: number;
  by_status: {
    draft: number;
    scheduled: number;
  };
  by_platform: Record<string, number>;
  items: ScriptItem[];
}

export interface PurchasePlanItem {
  id: string;
  name: string;
  description: string | null;
  target_amount: number;
  saved_amount: number;
  remaining_amount: number;
  progress_percent: number;
  deadline: string | null;
  deadline_status: string | null;
  priority: string;
  category: string | null;
  status: string;
  days_to_deadline: number | null;
}

export interface PurchasePlansSummary {
  total_active: number;
  total_target: number;
  total_saved: number;
  total_remaining: number;
  by_priority: {
    high: number;
    medium: number;
    low: number;
  };
  items: PurchasePlanItem[];
}

// =====================================================
// AI 360° Personal Context
// =====================================================

export interface PersonalContext {
  generated_at: string;
  user_id: string;
  finances: FinancesSummary;
  debts: DebtsSummary;
  tasks: PersonalTasksSummary;
  schedule: PersonalScheduleSummary;
  goals: PersonalGoalsSummary;
  projects: PersonalProjectsSummary;
  scripts: ScriptsSummary;
  purchase_plans: PurchasePlansSummary;
}

// =====================================================
// Supabase Client Type (minimal typing for Edge Functions)
// =====================================================

export interface SupabaseClient {
  from: (table: string) => {
    select: (columns?: string) => {
      eq: (column: string, value: string | boolean) => {
        eq: (column: string, value: string | boolean) => {
          single: () => Promise<{ data: unknown; error: Error | null }>;
          maybeSingle: () => Promise<{ data: unknown; error: Error | null }>;
        };
        single: () => Promise<{ data: unknown; error: Error | null }>;
        maybeSingle: () => Promise<{ data: unknown; error: Error | null }>;
      };
    };
  };
  rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>;
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null }; error: Error | null }>;
  };
}
