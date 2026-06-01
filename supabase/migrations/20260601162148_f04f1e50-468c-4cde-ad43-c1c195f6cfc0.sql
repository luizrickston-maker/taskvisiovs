-- Create table for project task attachments
CREATE TABLE IF NOT EXISTS public.project_task_attachments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_task_id UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_task_attachments TO authenticated;
GRANT ALL ON public.project_task_attachments TO service_role;

-- Enable RLS
ALTER TABLE public.project_task_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view attachments for their tasks" 
ON public.project_task_attachments 
FOR SELECT 
USING (true); -- Simplified for now, can be restricted to project members if needed

CREATE POLICY "Users can insert their own attachments" 
ON public.project_task_attachments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attachments" 
ON public.project_task_attachments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view task attachments" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'task-attachments');

CREATE POLICY "Authenticated users can upload task attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own task attachments" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'task-attachments' AND auth.uid()::text = owner::text);

CREATE POLICY "Users can delete their own task attachments" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'task-attachments' AND auth.uid()::text = owner::text);
