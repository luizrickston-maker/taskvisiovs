import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useBriefingEditor = (briefingId?: string) => {
  const queryClient = useQueryClient();

  const briefing = useQuery({
    queryKey: ['briefing', briefingId],
    queryFn: async () => {
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
      
      if (error) throw error;
      return data;
    },
    enabled: !!briefingId
  });

  const updateBriefing = useMutation({
    mutationFn: async (updates: any) => {
      const { data, error } = await supabase
        .from('briefings')
        .update(updates)
        .eq('id', briefingId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['briefing', briefingId] })
  });

  const updateResponse = useMutation({
    mutationFn: async ({ block_name, response_data }: { block_name: string, response_data: any }) => {
      const { data, error } = await supabase
        .from('briefing_responses')
        .upsert({ briefing_id: briefingId, block_name, response_data }, { onConflict: 'briefing_id, block_name' })
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['briefing', briefingId] })
  });

  const manageVideoItems = useMutation({
    mutationFn: async (items: any[]) => {
      // Simplificado: delete todos e insira novos
      await supabase.from('briefing_video_items').delete().eq('briefing_id', briefingId);
      const { data, error } = await supabase.from('briefing_video_items').insert(items);
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['briefing', briefingId] })
  });

  return { briefing, updateBriefing, updateResponse, manageVideoItems };
};
