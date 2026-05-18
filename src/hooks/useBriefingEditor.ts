import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Briefing, 
  BriefingResponse, 
  BriefingVideoItem, 
  BriefingWithDetails,
  BriefingStatus 
} from "@/types/briefing";

export const useBriefing = (briefingId?: string) => {
  return useQuery({
    queryKey: ['briefing', briefingId],
    queryFn: async (): Promise<BriefingWithDetails | null> => {
      if (!briefingId) return null;
      
      const { data, error } = await supabase
        .from('briefings')
        .select(`
          *,
          responses:briefing_responses(*),
          video_items:briefing_video_items(*)
        `)
        .eq('id', briefingId)
        .single();
      
      if (error) {
        console.error("Error fetching briefing:", error);
        throw error;
      }
      
      return data as any as BriefingWithDetails;
    },
    enabled: !!briefingId
  });
};

export const useBriefingEditor = (briefingId?: string) => {
  const queryClient = useQueryClient();
  const briefing = useBriefing(briefingId);

  const updateBriefing = useMutation({
    mutationFn: async (updates: Partial<Briefing>) => {
      if (!briefingId) throw new Error("ID do briefing é necessário para atualização");
      
      const { data, error } = await supabase
        .from('briefings')
        .update(updates)
        .eq('id', briefingId)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['briefing', briefingId] });
      queryClient.invalidateQueries({ queryKey: ['briefings'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar briefing: ${error.message}`);
    }
  });

  const updateResponse = useMutation({
    mutationFn: async ({ block_name, response_data }: { block_name: string, response_data: any }) => {
      if (!briefingId) throw new Error("ID do briefing é necessário para salvar respostas");
      
      const { data, error } = await supabase
        .from('briefing_responses')
        .upsert(
          { briefing_id: briefingId, block_name, response_data, updated_at: new Date().toISOString() }, 
          { onConflict: 'briefing_id, block_name' }
        )
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['briefing', briefingId] });
    }
  });

  const manageVideoItems = useMutation({
    mutationFn: async (items: Partial<BriefingVideoItem>[]) => {
      if (!briefingId) throw new Error("ID do briefing é necessário para gerenciar itens de vídeo");
      
      // Step 1: Remove existing items for this briefing
      const { error: deleteError } = await supabase
        .from('briefing_video_items')
        .delete()
        .eq('briefing_id', briefingId);
        
      if (deleteError) throw deleteError;

      // Step 2: Insert new items
      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          ...item,
          briefing_id: briefingId,
          item_index: index + 1
        }));
        
        const { data, error: insertError } = await supabase
          .from('briefing_video_items')
          .insert(itemsToInsert)
          .select();
          
        if (insertError) throw insertError;
        return data;
      }
      
      return [];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['briefing', briefingId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar itens de vídeo: ${error.message}`);
    }
  });

  return { 
    briefing, 
    updateBriefing, 
    updateResponse, 
    manageVideoItems 
  };
};

export const useUpdateBriefingStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string, status: BriefingStatus }) => {
      const { data, error } = await supabase
        .from('briefings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['briefing', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['briefings'] });
    }
  });
};

export const useGenerateMagicLink = () => {
  return useMutation({
    mutationFn: async (briefingId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-briefing-magic-link', {
        body: { briefing_id: briefingId }
      });
      
      if (error) throw error;
      return data;
    }
  });
};
