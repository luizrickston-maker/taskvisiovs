import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useBriefings = (workspaceId?: string) => {
  const queryClient = useQueryClient();

  const briefings = useQuery({
    queryKey: ['briefings', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('briefings')
        .select(`
          *,
          clients (name),
          assigned_user:assigned_to_user_id (email)
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId
  });

  const createBriefing = useMutation({
    mutationFn: async (briefing: any) => {
      const { data, error } = await supabase
        .from('briefings')
        .insert([briefing])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['briefings'] });
      toast.success("Briefing criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating briefing:", error);
      toast.error("Erro ao criar briefing.");
    }
  });

  const deleteBriefing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('briefings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['briefings'] });
      toast.success("Briefing excluído com sucesso.");
    },
    onError: (error) => {
      console.error("Error deleting briefing:", error);
      toast.error("Erro ao excluir briefing.");
    }
  });

  const generateMagicLink = useMutation({
    mutationFn: async (briefingId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-briefing-magic-link', {
        body: { briefing_id: briefingId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['briefings'] });
      toast.success("Link de preenchimento gerado!");
      if (data.magicLink) {
        navigator.clipboard.writeText(data.magicLink);
        toast.info("Link copiado para a área de transferência.");
      }
    },
    onError: (error) => {
      console.error("Error generating magic link:", error);
      toast.error("Erro ao gerar link de preenchimento.");
    }
  });

  return {
    briefings,
    createBriefing,
    deleteBriefing,
    generateMagicLink
  };
};
