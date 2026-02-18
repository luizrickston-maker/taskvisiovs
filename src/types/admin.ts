export interface Workspace {
  id: string;
  name: string;
  plan: string;
  status: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

export interface ClientUser {
  id: string;
  workspace_id: string;
  client_id: string;
  user_id: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyUser {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  created_at: string;
}
