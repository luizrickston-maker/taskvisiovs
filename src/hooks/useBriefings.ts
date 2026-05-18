import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export type BriefingStatus = 'draft' | 'pending' | 'review' | 'approved' | 'archived';

export interface BriefingTemplate {
  id: string;
  workspace_id: string;
  created_by: string;
  title: string;
  description: string | null;
  content_structure: any[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BriefingResponse {
  id: string;
  template_id: string | null;
  workspace_id: string;
  project_id: string | null;
  client_id: string | null;
  title: string;
  respondent_name: string | null;
  respondent_email: string | null;
  answers: Record<string, any>;
  status: BriefingStatus;
  review_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useBriefings = (workspaceId?: string) => {
  const queryClient = useQueryClient();

  const templates = useQuery({
    queryKey: ['briefing-templates', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('briefing_templates')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as BriefingTemplate[];
    },
    enabled: !!workspaceId
  });

  const responses = useQuery({
    queryKey: ['briefing-responses', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('briefing_responses')
        .select(`
          *,
          projects (project),
          clients (name)
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as (BriefingResponse & { projects: { project: string } | null, clients: { name: string } | null })[];
    },
    enabled: !!workspaceId
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Partial<BriefingTemplate>) => {
      const { data, error } = await supabase
        .from('briefing_templates')
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
    mutationFn: async (response: Partial<BriefingResponse>) => {
      const { data, error } = await supabase
        .from('briefing_responses')
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
