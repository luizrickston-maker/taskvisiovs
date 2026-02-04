export type CategoryType = 'income' | 'expense' | 'debt';
export type IncomeType = 'fixed' | 'recurring' | 'variable';
export type DebtType = 'fixed' | 'installment' | 'variable' | 'weekly';
export type TaskType = 'inbox' | 'today';
export type TimeBlockType = 'cash' | 'client' | 'project';
export type ProjectStatus = 'todo' | 'progress' | 'blocked' | 'done';
export type ScriptPlatform = 'youtube' | 'youtube_shorts' | 'tiktok' | 'tiktok_ads' | 'instagram_reels' | 'instagram_post' | 'instagram_boost' | 'facebook_ads';
export type ScriptStatus = 'draft' | 'scheduled' | 'published';
export type GoalType = 'financial' | 'savings' | 'custom';
export type ProjectTaskStatus = 'todo' | 'in_progress' | 'done';
export type ProspectStatus = 'novo' | 'em_negociacao' | 'proposta_enviada' | 'fechado' | 'perdido';
export type SalesGoalType = 'faturamento_mensal' | 'vendas_fechadas' | 'novos_clientes';

// Área PJ Types
export type InvestmentCategory = 'equipamento' | 'software' | 'mobilia' | 'marketing' | 'outro';
export type ContractType = 'pj' | 'clt' | 'freelancer';
export type PlanTier = 'bronze' | 'silver' | 'gold';
export type PlanType = 'recorrente' | 'pontual';

// Corporate Costs Types
export type CorporateCostType = 'recorrente' | 'fixo' | 'pontual';
export type CostFrequency = 'diario' | 'semanal' | 'mensal' | 'anual';

export interface CorporateCostCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon?: string;
  created_at: string;
}

export interface CorporateCost {
  id: string;
  user_id: string;
  name: string;
  category_id?: string;
  amount: number;
  cost_type: CorporateCostType;
  frequency?: CostFrequency;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Document Types
export interface DocumentType {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ProspectDocument {
  id: string;
  user_id: string;
  prospect_id: string;
  document_type_id?: string;
  file_path: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  notes?: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  color: string;
  icon?: string;
  is_default: boolean;
  created_at: string;
}

export interface UserIncomeCategory {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface UserDebtCategory {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Income {
  id: string;
  user_id: string;
  source: string;
  amount: number;
  date: string;
  category_id?: string;
  user_category_id?: string;
  income_type: IncomeType;
  variable_min_amount?: number;
  variable_max_amount?: number;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  date: string;
  category_id?: string;
  created_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_date: string;
  paid: boolean;
  type: DebtType;
  category_id?: string;
  user_category_id?: string;
  installment_current?: number;
  installment_total?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Saving {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  date: string;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  type: GoalType;
  amount: number;
  deadline: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  completed: boolean;
  type: TaskType;
  scheduled_date?: string;
  created_at: string;
  completed_at?: string;
}

export interface TimeBlock {
  id: string;
  user_id: string;
  title: string;
  start_time: string;
  end_time: string;
  date: string;
  type: TimeBlockType | string;
  completed: boolean;
  color?: string;
  created_at: string;
}

export interface CustomTimeBlockType {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ProjectCategory {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color: string;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  task: string;
  project: string;
  project_category_id?: string;
  priority: number;
  status: ProjectStatus;
  estimated_time?: string;
  // Corporate project fields
  client_name?: string;
  company_name?: string;
  deadline?: string;
  is_corporate: boolean;
  prospect_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectTask {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description?: string;
  priority: number;
  status: ProjectTaskStatus;
  // Task management fields
  deadline?: string;
  deadline_days?: number;
  estimated_hours: number;
  actual_hours: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesGoal {
  id: string;
  user_id: string;
  goal_type: SalesGoalType;
  target_amount: number;
  current_amount: number;
  start_date: string;
  end_date: string;
  project_id?: string;
  created_at: string;
  updated_at: string;
}

export type PaymentType = 'recorrente' | 'pontual';

export interface Prospect {
  id: string;
  user_id: string;
  client_name: string;
  company_name?: string;
  prospection_date: string;
  status: ProspectStatus;
  project_id?: string;
  plan_id?: string;
  project_type?: string;
  estimated_value: number;
  notes?: string;
  payment_type?: PaymentType;
  contract_duration?: number;
  payment_installments?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payment_methods?: any; // JSONB field - can be PaymentMethodEntry[] at runtime
  total_fees?: number;
  created_at: string;
  updated_at: string;
}

export interface Script {
  id: string;
  user_id: string;
  title: string;
  content: string;
  platform: ScriptPlatform;
  scheduled_date: string;
  status: ScriptStatus;
  project_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreference {
  id: string;
  user_id: string;
  app_name: string;
  business_app_name?: string;
  created_at: string;
  updated_at: string;
}

// Área PJ Interfaces
export interface CorporatePricing {
  id: string;
  user_id: string;
  item_name: string;
  cost: number;
  tax_rate: number;
  margin_percent: number;
  final_price: number;
  profit: number;
  real_margin: number;
  charged_price?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CorporateInvestment {
  id: string;
  user_id: string;
  item_name: string;
  category: InvestmentCategory;
  amount: number;
  purchase_date: string;
  useful_life_months?: number;
  monthly_depreciation?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CorporateTeamMember {
  id: string;
  user_id: string;
  name: string;
  role: string;
  contract_type: ContractType;
  cost: number;
  payment_day: number;
  hours_available: number;
  clt_benefits: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Service Plans Interfaces
export interface ServicePlan {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  tier: PlanTier;
  plan_type: PlanType;
  base_cost: number;
  final_price: number;
  profit: number;
  profit_margin: number;
  monthly_limit?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ServicePlanItem {
  id: string;
  user_id: string;
  plan_id: string;
  pricing_id: string;
  quantity: number;
  custom_price?: number;
  created_at: string;
}

// Payment Fee Settings
export type PaymentMethod = 'credito' | 'debito' | 'pix' | 'dinheiro' | 'boleto';

export interface PaymentFeeSetting {
  id: string;
  user_id: string;
  method: PaymentMethod;
  fee_percent: number;
  fee_fixed: number;
  discount_percent: number;
  installment_ranges?: Record<string, number>; // {"1": 2.99, "2-6": 3.49}
  receiving_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethodEntry {
  method: PaymentMethod;
  value: number;
  installments?: number;
  fee?: number;
}

// Editorial Calendar Types
export type ContentStatus = 'idea' | 'draft' | 'review' | 'approved' | 'published';
export type ContentPlatform = 'instagram' | 'tiktok' | 'linkedin' | 'blog' | 'youtube';
export type ContentTypeEnum = 'post' | 'reel' | 'story' | 'article' | 'video';

export interface EditorialCalendarItem {
  id: string;
  user_id: string;
  project_id?: string;
  title: string;
  description?: string;
  due_date: string;
  status: ContentStatus;
  platform: ContentPlatform;
  content_type: ContentTypeEnum;
  assigned_to?: string;
  moodboard_refs?: unknown[];
  ai_suggestions?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EditorialComment {
  id: string;
  item_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
}

// Purchase Planning Types
export type PurchasePlanPriority = 'low' | 'medium' | 'high';
export type PurchasePlanStatus = 'planning' | 'in_progress' | 'completed';

export interface PurchasePlan {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  target_amount: number;
  saved_amount: number;
  deadline?: string;
  priority: PurchasePlanPriority;
  category?: string;
  status: PurchasePlanStatus;
  image_url?: string;
  created_at: string;
}
