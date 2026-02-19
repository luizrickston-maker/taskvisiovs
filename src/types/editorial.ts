// Editorial Calendar Types
// Based on editorial_calendar_items and editorial_comments tables

export type ContentStatus = 'idea' | 'draft' | 'review' | 'approved' | 'published';
export type ContentPlatform = 'instagram' | 'tiktok' | 'linkedin' | 'blog' | 'youtube';
export type ContentTypeEnum = 'post' | 'reel' | 'story' | 'article' | 'video';

export interface EditorialCalendarItem {
  id: string;
  user_id: string;
  project_id: string | null;
  client_id: string | null;
  title: string;
  description: string | null;
  due_date: string; // ISO string timestamp
  status: ContentStatus;
  platform: ContentPlatform;
  content_type: ContentTypeEnum;
  assigned_to: string | null; // ID do membro da equipe (corporate_team)
  moodboard_refs: unknown[] | null; // JSONB - URLs ou referências de inspiração
  ai_suggestions: Record<string, unknown> | null; // JSONB - sugestões geradas por IA
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

// Helper type for creating new items (without id, timestamps)
export type NewEditorialCalendarItem = Omit<EditorialCalendarItem, 'id' | 'created_at' | 'updated_at'>;
export type NewEditorialComment = Omit<EditorialComment, 'id' | 'created_at'>;

// Input type for form (user_id, moodboard_refs, ai_suggestions handled by hook)
export type EditorialCalendarItemInput = Omit<NewEditorialCalendarItem, 'user_id' | 'moodboard_refs' | 'ai_suggestions'> & {
  moodboard_refs?: unknown[] | null;
  ai_suggestions?: Record<string, unknown> | null;
};

// Helper type for updating items
export type EditorialCalendarItemUpdate = Partial<Omit<EditorialCalendarItem, 'id' | 'user_id' | 'created_at'>>;
export type EditorialCommentUpdate = Partial<Omit<EditorialComment, 'id' | 'item_id' | 'user_id' | 'created_at'>>;

// Status labels for UI
export const contentStatusLabels: Record<ContentStatus, string> = {
  idea: 'Ideia',
  draft: 'Rascunho',
  review: 'Revisão',
  approved: 'Aprovado',
  published: 'Publicado',
};

// Platform labels and colors for UI - using semantic tokens
export const contentPlatformConfig: Record<ContentPlatform, { label: string; color: string }> = {
  instagram: { label: 'Instagram', color: 'bg-platform-instagram' },
  tiktok: { label: 'TikTok', color: 'bg-platform-tiktok' },
  linkedin: { label: 'LinkedIn', color: 'bg-platform-linkedin' },
  blog: { label: 'Blog', color: 'bg-platform-blog' },
  youtube: { label: 'YouTube', color: 'bg-platform-youtube' },
};

// Content type labels for UI
export const contentTypeLabels: Record<ContentTypeEnum, string> = {
  post: 'Post',
  reel: 'Reel',
  story: 'Story',
  article: 'Artigo',
  video: 'Vídeo',
};

// Status colors for UI - using semantic tokens
export const contentStatusColors: Record<ContentStatus, string> = {
  idea: 'bg-status-draft',
  draft: 'bg-status-scheduled',
  review: 'bg-status-review',
  approved: 'bg-status-approved',
  published: 'bg-status-published',
};
