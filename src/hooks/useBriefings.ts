import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleSupabaseError } from "@/lib/error-handler";
import { Briefing, BriefingStatus } from "@/types/briefing";


export const useBriefings = (workspaceId?: string) => {
  const queryClient = useQueryClient();

  const briefings = useQuery({
    queryKey: ['briefings', workspaceId],
    queryFn: async (): Promise<Briefing[]> => {
      if (!workspaceId) return [];
      const data = await handleSupabaseError<any[]>(
        supabase
          .from('briefings')
          .select(`
            *,
            client:clients(name, company_name)
          `)
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false }),
        "Erro ao carregar briefings"
      );
      
      return (data || []) as any as Briefing[];
    },

    enabled: !!workspaceId
  });

  const createBriefing = useMutation({
    mutationFn: async (briefing: Partial<Briefing> & { title: string; created_by_user_id: string; workspace_id: string }) => {
      const data = await handleSupabaseError<any>(
        supabase
          .from('briefings')
          .insert([briefing])
          .select()
          .single() as any,
        "Erro ao criar briefing"
      );
      
      if (!data) throw new Error("Falha ao criar briefing");
      return data;

    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['briefings'] });
      toast.success("Briefing criado com sucesso!");
    },
    onError: (error: Error) => {
      // O erro já é tratado pelo handleSupabaseError, mas podemos logar adicionalmente
      console.error("Mutation error:", error);
    }

  });

  const deleteBriefing = useMutation({
    mutationFn: async (id: string) => {
      const success = await handleSupabaseError<any>(
        supabase
          .from('briefings')
          .delete()
          .eq('id', id) as any,
        "Erro ao excluir briefing"
      );
      
      if (success === null) throw new Error("Falha ao excluir briefing");

    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['briefings'] });
      toast.success("Briefing excluído com sucesso.");
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
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
      toast.error(`Erro ao gerar link: ${error.message}`);
    }

  });

  return {
    briefings,
    createBriefing,
    deleteBriefing,
    generateMagicLink
  };
};
