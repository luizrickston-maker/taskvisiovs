import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Briefing, BriefingStatus } from "@/types/briefing";

export const useBriefings = (workspaceId?: string) => {
  const queryClient = useQueryClient();

  const briefings = useQuery({
    queryKey: ['briefings', workspaceId],
    queryFn: async (): Promise<Briefing[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('briefings')
        .select(`
          *,
          client:clients(name, company_name)
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching briefings:", error);
        throw error;
      }
      return data as any as Briefing[];
    },
    enabled: !!workspaceId
  });

  const createBriefing = useMutation({
    mutationFn: async (briefing: Partial<Briefing>) => {
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
    onError: (error: Error) => {
      console.error("Error creating briefing:", error);
      toast.error(`Erro ao criar briefing: ${error.message}`);
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
    onError: (error: Error) => {
      console.error("Error deleting briefing:", error);
      toast.error(`Erro ao excluir briefing: ${error.message}`);
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
    onError: (error: Error) => {
      console.error("Error generating magic link:", error);
      toast.error(`Erro ao gerar link de preenchimento: ${error.message}`);
    }
  });

  return {
    briefings,
    createBriefing,
    deleteBriefing,
    generateMagicLink
  };
};
