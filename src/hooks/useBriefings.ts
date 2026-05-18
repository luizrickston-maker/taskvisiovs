import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useBriefings = (workspaceId?: string) => {
  const queryClient = useQueryClient();

  const templates = useQuery({
    queryKey: ['briefing-templates', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('briefing_templates' as any)
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId
  });

  const responses = useQuery({
    queryKey: ['briefing-responses', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('briefing_responses' as any)
        .select('id, title, status, respondent_name, created_at, projects(project), clients(name)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!workspaceId
  });

  const createTemplate = useMutation({
    mutationFn: async (template: any) => {
      const { data, error } = await supabase
        .from('briefing_templates' as any)
        .insert([template])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['briefing-templates'] });
      toast.success("Modelo de briefing criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating template:", error);
      toast.error("Erro ao criar modelo de briefing.");
    }
  });

  const createResponse = useMutation({
    mutationFn: async (response: any) => {
      const { data, error } = await supabase
        .from('briefing_responses' as any)
        .insert([response])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['briefing-responses'] });
      toast.success("Briefing enviado para preenchimento!");
    },
    onError: (error) => {
      console.error("Error creating response:", error);
      toast.error("Erro ao gerar link de briefing.");
    }
  });

  return {
    templates,
    responses,
    createTemplate,
    createResponse
  };
};
