-- Create ai_conversations table
CREATE TABLE public.ai_conversations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL,
    title TEXT,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ai_messages table
CREATE TABLE public.ai_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_conversations
CREATE POLICY "Users can view their own conversations" 
ON public.ai_conversations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations" 
ON public.ai_conversations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" 
ON public.ai_conversations FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" 
ON public.ai_conversations FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for ai_messages
CREATE POLICY "Users can view messages from their conversations" 
ON public.ai_messages FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.ai_conversations 
    WHERE public.ai_conversations.id = conversation_id 
    AND public.ai_conversations.user_id = auth.uid()
));

CREATE POLICY "Users can create messages in their conversations" 
ON public.ai_messages FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_conversations 
    WHERE public.ai_conversations.id = conversation_id 
    AND public.ai_conversations.user_id = auth.uid()
));

CREATE POLICY "Users can delete messages in their conversations" 
ON public.ai_messages FOR DELETE 
USING (EXISTS (
    SELECT 1 FROM public.ai_conversations 
    WHERE public.ai_conversations.id = conversation_id 
    AND public.ai_conversations.user_id = auth.uid()
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ai_conversations_updated_at
BEFORE UPDATE ON public.ai_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
