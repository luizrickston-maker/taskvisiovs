import { Json } from "@/integrations/supabase/types";

export type ProjectStatus = 'todo' | 'progress' | 'blocked' | 'done';
export type ProjectTaskStatus = 'todo' | 'progress' | 'blocked' | 'done';

export interface Project {
  id: string;
  user_id: string;
  workspace_id: string | null;
  project: string;
  task: string;
  status: string;
  priority: number;
  deadline: string | null;
  estimated_time: string | null;
  project_category_id: string | null;
  is_corporate: boolean | null;
  client_name: string | null;
  company_name: string | null;
  prospect_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectTask {
  id: string;
  user_id: string;
  workspace_id: string | null;
  project_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  deadline: string | null;
  deadline_days: number | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  video_editing_briefing_id: string | null;
  source_process_step_id: string | null;
}

export interface ProjectCategory {
  id: string;
  user_id: string;
  workspace_id: string | null;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

// Re-adding other common types that might have been there
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
}

export interface Client {
  id: string;
  workspace_id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  video_management_enabled: boolean | null;
  default_editing_profile: any;
  created_at: string;
  updated_at: string;
}
