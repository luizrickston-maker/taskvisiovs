-- Add UPDATE policy for editorial_comments (missing from previous migration)
CREATE POLICY "Users can update own comments"
ON public.editorial_comments
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);