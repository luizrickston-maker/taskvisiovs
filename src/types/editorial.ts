// Editorial Calendar Types
// Based on editorial_calendar_items and editorial_comments tables

export type ContentStatus = 'idea' | 'draft' | 'review' | 'approved' | 'published';
export type ContentPlatform = 'instagram' | 'tiktok' | 'linkedin' | 'blog' | 'youtube';
export type ContentTypeEnum = 'post' | 'reel' | 'story' | 'article' | 'video';

export interface EditorialCalendarItem {
  id: string;
  user_id: string;
  project_id: string | null;
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

// Platform labels and colors for UI
export const contentPlatformConfig: Record<ContentPlatform, { label: string; color: string }> = {
  instagram: { label: 'Instagram', color: 'bg-pink-500' },
  tiktok: { label: 'TikTok', color: 'bg-slate-800' },
  linkedin: { label: 'LinkedIn', color: 'bg-blue-600' },
  blog: { label: 'Blog', color: 'bg-green-600' },
  youtube: { label: 'YouTube', color: 'bg-red-500' },
};

// Content type labels for UI
export const contentTypeLabels: Record<ContentTypeEnum, string> = {
  post: 'Post',
  reel: 'Reel',
  story: 'Story',
  article: 'Artigo',
  video: 'Vídeo',
};

// Status colors for UI
export const contentStatusColors: Record<ContentStatus, string> = {
  idea: 'bg-gray-500',
  draft: 'bg-yellow-500',
  review: 'bg-blue-500',
  approved: 'bg-green-500',
  published: 'bg-purple-500',
};
