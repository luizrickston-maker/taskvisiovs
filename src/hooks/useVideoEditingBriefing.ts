import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VideoEditingBriefing {
  id?: string;
  workspace_id: string;
  client_id: string;
  project_task_id?: string | null;
  video_title: string;
  deadline?: string | null;
  objective?: string | null;
  target_duration?: string | null;
  files_sent_url?: string | null;
  preferred_takes?: string | null;
  ignore_takes?: string | null;
  b_roll_included?: boolean;
  b_roll_usage_notes?: string | null;
  music_style?: string | null;
  typography_style?: string | null;
  color_style?: string | null;
  video_format?: string | null;
  cta_text?: string | null;
  drive_folder_link?: string | null;
  file_naming_convention?: string | null;
  status?: 'draft' | 'pending' | 'in_progress' | 'review' | 'completed';
  magic_link_token?: string | null;
  magic_link_expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

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

  return useMutation({
    mutationFn: async (briefing: Partial<VideoEditingBriefing>) => {
      const { data, error } = await supabase
        .from("video_editing_briefings")
        .insert(briefing)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-editing-briefings"] });
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
        .update(briefing)
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
