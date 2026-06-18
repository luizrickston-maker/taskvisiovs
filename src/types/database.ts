import { Json } from "../integrations/supabase/types";

export type ProjectStatus = string;
export type ProjectTaskStatus = string;

export interface Project {
  client_name: string | null;
  company_name: string | null;
  created_at: string;
  deadline: string | null;
  estimated_time: string | null;
  id: string;
  is_corporate: boolean | null;
  priority: number;
  project: string;
  project_category_id: string | null;
  prospect_id: string | null;
  status: string;
  task: string;
  updated_at: string;
  user_id: string;
  workspace_id: string | null;
  assigned_to?: string | null;
}

export interface ProjectTask {
  actual_hours: number | null;
  completed_at: string | null;
  created_at: string;
  deadline: string | null;
  deadline_days: number | null;
  description: string | null;
  estimated_hours: number | null;
  id: string;
  priority: number;
  project_id: string | null;
  source_process_step_id: string | null;
  status: string;
  title: string;
  updated_at: string;
  user_id: string;
  video_editing_briefing_id: string | null;
  workspace_id: string | null;
  assigned_to?: string | null;
}

export interface ProjectCategory {
  color: string;
  created_at: string;
  description: string | null;
  id: string;
  name: string;
  user_id: string;
  workspace_id: string | null;
}

export interface Workspace {
  created_at: string;
  id: string;
  name: string;
  owner_user_id: string;
  plan: string;
  status: string;
  updated_at: string;
}

export interface Client {
  company_name: string | null;
  created_at: string;
  default_editing_profile: Json | null;
  email: string | null;
  id: string;
  is_active: boolean;
  name: string;
  notes: string | null;
  phone: string | null;
  updated_at: string;
  video_management_enabled: boolean | null;
  workspace_id: string;
}

export interface CorporateCost {
  amount: number;
  category_id: string | null;
  cost_type: string;
  created_at: string | null;
  end_date: string | null;
  frequency: string | null;
  id: string;
  is_active: boolean | null;
  name: string;
  notes: string | null;
  start_date: string | null;
  updated_at: string | null;
  user_id: string;
  workspace_id: string | null;
}

export interface CorporateCostCategory {
  color: string | null;
  created_at: string | null;
  icon: string | null;
  id: string;
  name: string;
  user_id: string;
  workspace_id: string | null;
}

export interface CorporateInvestment {
  amount: number;
  category: string;
  created_at: string;
  id: string;
  item_name: string;
  monthly_depreciation: number | null;
  notes: string | null;
  purchase_date: string;
  updated_at: string;
  useful_life_months: number | null;
  user_id: string;
  workspace_id: string | null;
}

export interface PaymentFeeSetting {
  created_at: string | null;
  discount_percent: number | null;
  fee_fixed: number | null;
  fee_percent: number | null;
  id: string;
  installment_ranges: Json | null;
  is_active: boolean | null;
  method: string;
  receiving_days: number | null;
  updated_at: string | null;
  user_id: string;
  workspace_id: string | null;
}

export interface ServicePlan {
  base_cost: number;
  created_at: string;
  description: string | null;
  final_price: number;
  id: string;
  is_active: boolean;
  monthly_limit: string | null;
  name: string;
  notes: string | null;
  plan_type: string;
  profit: number;
  profit_margin: number;
  tier: string;
  updated_at: string;
  user_id: string;
  workspace_id: string | null;
}

export interface ServicePlanItem {
  created_at: string;
  custom_price: number | null;
  id: string;
  plan_id: string;
  pricing_id: string;
  quantity: number;
  user_id: string;
  workspace_id: string | null;
}

export interface CorporatePricing {
  charged_price: number | null;
  cost: number;
  created_at: string;
  final_price: number;
  id: string;
  item_name: string;
  margin_percent: number;
  notes: string | null;
  profit: number;
  real_margin: number;
  tax_rate: number;
  updated_at: string;
  user_id: string;
  workspace_id: string | null;
}

export interface CorporateTeamMember {
  clt_benefits: number | null;
  contract_type: string;
  cost: number;
  created_at: string;
  hours_available: number | null;
  id: string;
  is_active: boolean;
  name: string;
  notes: string | null;
  payment_day: number;
  role: string;
  updated_at: string;
  user_id: string;
  workspace_id: string | null;
  member_user_id?: string | null;
  whatsapp?: string | null;
}

export interface Debt {
  amount: number;
  category_id: string | null;
  created_at: string;
  due_date: string;
  id: string;
  installment_current: number | null;
  installment_total: number | null;
  name: string;
  notes: string | null;
  paid: boolean;
  type: string;
  updated_at: string;
  user_category_id: string | null;
  user_id: string;
}

export interface Expense {
  amount: number;
  category_id: string | null;
  created_at: string;
  date: string;
  description: string;
  id: string;
  user_id: string;
}

export interface Income {
  amount: number;
  category_id: string | null;
  created_at: string;
  date: string;
  id: string;
  income_type: string;
  source: string;
  user_category_id: string | null;
  user_id: string;
  variable_max_amount: number | null;
  variable_min_amount: number | null;
}

export interface Prospect {
  client_name: string;
  company_name: string | null;
  contract_duration: number | null;
  created_at: string;
  estimated_value: number;
  id: string;
  notes: string | null;
  payment_installments: number | null;
  payment_methods: Json | null;
  payment_type: string | null;
  plan_id: string | null;
  project_id: string | null;
  project_type: string | null;
  prospection_date: string;
  status: string;
  total_fees: number | null;
  updated_at: string;
  user_id: string;
  workspace_id: string | null;
}

export interface ProspectDocument {
  created_at: string;
  document_type_id: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  id: string;
  mime_type: string | null;
  notes: string | null;
  prospect_id: string;
  user_id: string;
  workspace_id: string | null;
}

export interface DocumentType {
  color: string | null;
  created_at: string;
  id: string;
  name: string;
  user_id: string;
  workspace_id: string | null;
}

export interface SalesGoal {
  created_at: string;
  current_amount: number;
  end_date: string;
  goal_type: string;
  id: string;
  project_id: string | null;
  start_date: string;
  target_amount: number;
  updated_at: string;
  user_id: string;
  workspace_id: string | null;
}

export interface Script {
  content: string;
  created_at: string;
  id: string;
  platform: string;
  project_id: string | null;
  scheduled_date: string;
  status: string;
  title: string;
  updated_at: string;
  user_id: string;
  workspace_id: string | null;
}

export interface UserIncomeCategory {
  created_at: string;
  description: string | null;
  id: string;
  name: string;
  updated_at: string;
  user_id: string;
}

export interface UserDebtCategory {
  created_at: string;
  description: string | null;
  id: string;
  name: string;
  updated_at: string;
  user_id: string;
}

export interface Category {
  color: string;
  created_at: string;
  icon: string | null;
  id: string;
  is_default: boolean;
  name: string;
  type: string;
  user_id: string;
}

export interface Savings {
  amount: number;
  created_at: string;
  date: string;
  description: string;
  id: string;
  user_id: string;
}

export type Saving = Savings;
export interface PurchasePlan {
  category: string | null;
  created_at: string | null;
  deadline: string | null;
  description: string | null;
  id: string;
  image_url: string | null;
  name: string;
  priority: string | null;
  saved_amount: number | null;
  status: string | null;
  target_amount: number;
  user_id: string;
}

export interface UserPreference {
  app_name: string;
  business_app_name: string | null;
  created_at: string;
  default_available_hours: number;
  id: string;
  updated_at: string;
  user_id: string;
}

export interface ToolCategory {
  color: string;
  created_at: string;
  id: string;
  name: string;
  user_id: string;
}

export interface UserTool {
  category_id: string | null;
  created_at: string;
  id: string;
  name: string;
  url: string;
  user_id: string;
  workspace_id: string | null;
}

export interface Discount {
  created_at: string | null;
  end_date: string | null;
  id: string;
  is_active: boolean | null;
  name: string;
  start_date: string | null;
  type: string;
  updated_at: string | null;
  user_id: string;
  value: number;
}

export interface Tax {
  created_at: string | null;
  id: string;
  is_active: boolean | null;
  name: string;
  rate: number;
  updated_at: string | null;
  user_id: string;
}

export interface Goal {
  amount: number;
  created_at: string;
  deadline: string;
  id: string;
  name: string;
  type: string;
  updated_at: string;
  user_id: string;
}

export interface Task {
  actual_hours: number | null;
  completed_at: string | null;
  created_at: string;
  deadline: string | null;
  deadline_days: number | null;
  description: string | null;
  estimated_hours: number | null;
  id: string;
  priority: number;
  project_id: string | null;
  source_process_step_id: string | null;
  status: string;
  title: string;
  updated_at: string;
  user_id: string;
  video_editing_briefing_id: string | null;
  workspace_id: string | null;
  completed: boolean;
  type: string;
  scheduled_date: string | null;
}

export interface TimeBlock {
  color: string | null;
  completed: boolean;
  created_at: string;
  date: string;
  end_time: string;
  id: string;
  start_time: string;
  title: string;
  type: string;
  user_id: string;
}

export interface CustomTimeBlockType {
  color: string | null;
  created_at: string | null;
  id: string;
  name: string;
  user_id: string;
}

export interface Product {
  cost_price: number | null;
  created_at: string | null;
  description: string | null;
  id: string;
  image_url: string | null;
  is_active: boolean | null;
  name: string;
  sku: string | null;
  updated_at: string | null;
  user_id: string;
}

export interface ProductPricingDetail {
  base_price: number | null;
  created_at: string | null;
  id: string;
  max_units: number | null;
  min_units: number | null;
  pricing_model_id: string;
  product_id: string;
  unit_name: string | null;
  updated_at: string | null;
}

export interface Service {
  base_cost: number | null;
  created_at: string | null;
  description: string | null;
  expected_duration_hours: number | null;
  id: string;
  is_active: boolean | null;
  name: string;
  updated_at: string | null;
  user_id: string;
  workspace_id: string | null;
}

export interface ServicePricingDetail {
  base_price: number | null;
  created_at: string | null;
  hourly_rate: number | null;
  id: string;
  max_hours: number | null;
  min_hours: number | null;
  pricing_model_id: string;
  service_id: string;
  updated_at: string | null;
}

export type CorporateCostType = string;
export type CostFrequency = string;
export type InvestmentCategory = string;
export type PaymentMethod = string;
export type PlanTier = string;
export type PlanType = string;
export type ContractType = string;
export type PaymentType = string;
export type ProspectStatus = string;
export type SalesGoalType = string;
export type ScriptPlatform = string;
export type ScriptStatus = string;
export type PaymentMethodEntry = { method: string; value: number; fee?: number; installments?: number };
export type DebtType = string;
export type IncomeType = string;
export type PurchasePlanPriority = string;
export type PurchasePlanStatus = string;
