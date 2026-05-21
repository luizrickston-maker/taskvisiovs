export interface ClientVideoSettings {
  id?: string;
  client_id: string;
  workspace_id: string;
  video_management_enabled: boolean;
  default_music_style: string | null;
  default_typography: string | null;
  default_color_style: string | null;
  default_format: string | null;
  default_cta: string | null;
  default_drive_folder_link: string | null;
  default_file_naming: string | null;
  created_at?: string;
  updated_at?: string;
}

export type VideoBriefingStatus = 'draft' | 'pending' | 'in_progress' | 'review' | 'completed';

export interface VideoEditingBriefing {
  id: string;
  workspace_id: string;
  client_id: string;
  project_task_id?: string | null;
  title: string;
  delivery_deadline?: string | null;
  objective?: string | null;
  target_duration?: string | null;
  files_sent?: string | null;
  preferred_take?: string | null;
  ignore_takes?: string | null;
  b_roll_included?: boolean;
  b_roll_usage?: string | null;
  music_override?: string | null;
  typography_override?: string | null;
  color_style_override?: string | null;
  format_override?: string | null;
  cta_final?: string | null;
  delivery_drive_folder?: string | null;
  final_file_naming?: string | null;
  status: VideoBriefingStatus;
  magic_link_token?: string | null;
  magic_link_expires_at?: string | null;
  created_by_user_id: string;
  created_at?: string;
  updated_at?: string;
  use_client_profile?: boolean;
  notify_on_completion?: boolean;
  assigned_to_user_id?: string | null;
  opening_hook?: string | null;
  custom_caption?: string | null;
  specific_music?: string | null;
  music_reference_video?: string | null;
  observations?: string | null;
  external_filler_email?: string | null;
}
