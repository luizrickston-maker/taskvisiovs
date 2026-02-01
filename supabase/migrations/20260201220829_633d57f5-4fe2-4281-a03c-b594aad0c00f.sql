-- Create editorial_comments table for collaboration
CREATE TABLE public.editorial_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.editorial_calendar_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for query optimization
CREATE INDEX idx_editorial_comments_item_id ON public.editorial_comments(item_id);
CREATE INDEX idx_editorial_comments_user_id ON public.editorial_comments(user_id);

-- Enable Row Level Security
ALTER TABLE public.editorial_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can view comments on their own items
CREATE POLICY "Users can view comments on own items"
ON public.editorial_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.editorial_calendar_items
    WHERE id = item_id AND user_id = auth.uid()
  )
);

-- Users can insert comments on their own items
CREATE POLICY "Users can insert comments on own items"
ON public.editorial_comments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.editorial_calendar_items
    WHERE id = item_id AND user_id = auth.uid()
  )
);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON public.editorial_comments
FOR DELETE
USING (auth.uid() = user_id);

-- Enable Realtime for real-time collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE public.editorial_comments;