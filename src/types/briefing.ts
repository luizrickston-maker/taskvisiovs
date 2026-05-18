import { Json } from "@/integrations/supabase/types";

export type BriefingStatus = 'draft' | 'pending_fill' | 'in_review' | 'approved' | 'archived';

export interface Briefing {
  id: string;
  workspace_id: string;
  client_id: string | null;
  assigned_to_user_id: string | null;
  external_filler_email: string | null;
  title: string;
  status: BriefingStatus;
  template_id: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  // Join fields
  client?: {
    name: string;
    company_name: string | null;
  };
  assigned_to?: {
    full_name: string | null;
    email: string | null;
  };
}

// Bloque 1: Detalhes do Cliente e Projeto
export interface BriefingResponseBlock1 {
  client_name: string;
  project_objective: string;
  target_audience: string;
  brand_voice: string;
  main_competitors: string;
}

// Bloque 2: Estrutura e Formato
export interface BriefingResponseBlock2 {
  video_duration: string;
  aspect_ratio: '16:9' | '9:16' | '1:1';
  resolution: '1080p' | '4k';
  file_format: string;
  deliverables_count: number;
}

// Bloque 4: Referências e Identidade Visual
export interface BriefingResponseBlock4 {
  reference_links: string[];
  color_palette: string[];
  font_preferences: string;
  assets_provided: boolean;
  brand_assets_link: string;
}

// Bloque 5: Distribuição e Canais
export interface BriefingResponseBlock5 {
  platforms: string[]; // youtube, instagram, tiktok, etc.
  posting_schedule: string;
  paid_media_usage: boolean;
  cta_text: string;
}

// Bloque 6: Prazos e Orçamento
export interface BriefingResponseBlock6 {
  deadline_first_cut: string;
  final_deadline: string;
  budget_range: string;
  additional_notes: string;
}

export type BriefingResponseData = 
  | BriefingResponseBlock1 
  | BriefingResponseBlock2 
  | BriefingResponseBlock4 
  | BriefingResponseBlock5 
  | BriefingResponseBlock6;

export interface BriefingResponse {
  id: string;
  briefing_id: string;
  block_number: number | null;
  block_name: string;
  response_data: Json;
  created_at: string;
  updated_at: string;
}

// Bloque 3: Itens de Vídeo (Temas/Roteiros)
export interface BriefingVideoItem {
  id: string;
  briefing_id: string;
  theme: string;
  details: string | null;
  recording_date: string | null;
  format: string | null;
  priority: string | null;
  item_index: number;
  status: 'pending' | 'recorded' | 'delivered';
  created_at: string;
  updated_at: string;
}

export interface BriefingWithDetails extends Briefing {
  responses: BriefingResponse[];
  video_items: BriefingVideoItem[];
}

export interface BriefingMagicLink {
  id: string;
  briefing_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}
