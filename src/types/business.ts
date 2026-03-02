export interface BusinessProcess {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  category: string | null;
  related_product_id: string | null;
  related_service_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProcessStep {
  id: string;
  process_id: string;
  title: string;
  description: string | null;
  order_index: number;
  position_x: number;
  position_y: number;
  node_type: string | null;
  icon: string | null;
  color_scheme: string | null;
  estimated_time: string | null;
  responsible_role: string | null;
  support_links: { label: string; url: string; icon?: string }[] | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProcessConnection {
  id: string;
  process_id: string;
  source_step_id: string;
  target_step_id: string;
  label: string | null;
  connection_type: string | null;
  animated: boolean | null;
  created_at: string | null;
}

export interface ProcessInstance {
  id: string;
  process_id: string;
  workspace_id: string;
  assigned_to_user_id: string;
  status: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProcessInstanceStep {
  id: string;
  process_instance_id: string;
  process_step_id: string;
  status: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}
