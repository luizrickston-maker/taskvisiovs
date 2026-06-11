import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { VideoEditingBriefing, VideoBriefingStatus } from "@/types/video";

export type { VideoEditingBriefing, VideoBriefingStatus };

export const useVideoEditingBriefing = (id: string) => {
  return useQuery({
    queryKey: ["video-editing-briefing", id],
    queryFn: async (): Promise<VideoEditingBriefing | null> => {
      const { data, error } = await supabase
        .from("video_editing_briefings")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching video briefing:", error);
        throw error;
      }
      return data as VideoEditingBriefing | null;
    },
    enabled: !!id,
  });
};

export const useCreateVideoEditingBriefing = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  return useMutation({
    mutationFn: async (briefing: Partial<VideoEditingBriefing>) => {
      if (!briefing.client_id) {
        throw new Error('Este projeto não possui cliente vinculado. Associe um cliente ao projeto antes de criar o briefing.');
      }

      const payload = {
        ...briefing,
        created_by_user_id: briefing.created_by_user_id ?? user?.id,
      };

      // 1. Create the briefing
      const { data, error } = await supabase
        .from("video_editing_briefings")
        .insert(payload as any)
        .select()
        .single();

      if (error) throw error;

      // 2. Link to the project task if applicable
      if (briefing.project_task_id) {
        const { error: linkError } = await supabase
          .from("project_tasks")
          .update({ video_editing_briefing_id: data.id })
          .eq("id", briefing.project_task_id);
        
        if (linkError) console.error("Error linking briefing to task:", linkError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-editing-briefings"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      toast.success("Briefing de edição criado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar briefing: ${error.message}`);
    },
  });
};

export const useUpdateVideoEditingBriefing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (briefing: Partial<VideoEditingBriefing> & { id: string }) => {
      const { data, error } = await supabase
        .from("video_editing_briefings")
        .update(briefing as any)
        .eq("id", briefing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["video-editing-briefing", data.id],
      });
      queryClient.invalidateQueries({ queryKey: ["video-editing-briefings"] });
      toast.success("Briefing atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar briefing: ${error.message}`);
    },
  });
};

export const useGenerateVideoBriefingMagicLink = () => {
  return useMutation({
    mutationFn: async (briefingId: string) => {
      const { data, error } = await supabase.functions.invoke("generate-video-briefing-magic-link", {
        body: { video_editing_briefing_id: briefingId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Magic link gerado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao gerar magic link: ${error.message}`);
    },
  });
};
