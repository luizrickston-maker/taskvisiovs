export type CategoryType = 'income' | 'expense' | 'debt';
export type DebtType = 'fixed' | 'installment' | 'variable';
export type TaskType = 'inbox' | 'today';
export type TimeBlockType = 'cash' | 'client' | 'project';
export type ProjectStatus = 'todo' | 'progress' | 'blocked' | 'done';
export type ScriptPlatform = 'youtube' | 'youtube_shorts' | 'tiktok' | 'tiktok_ads' | 'instagram_reels' | 'instagram_post' | 'instagram_boost' | 'facebook_ads';
export type ScriptStatus = 'draft' | 'scheduled' | 'published';
export type GoalType = 'financial' | 'savings' | 'custom';

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

export interface Income {
  id: string;
  user_id: string;
  source: string;
  amount: number;
  date: string;
  category_id?: string;
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
  type: TimeBlockType;
  completed: boolean;
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
  created_at: string;
  updated_at: string;
}
