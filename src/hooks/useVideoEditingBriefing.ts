import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VideoEditingBriefing {
  id?: string;
  workspace_id: string;
  client_id: string;
  project_task_id?: string | null;
  title: string;
  delivery_deadline?: string | null;
  objective?: string | null;
  target_duration?: string | null;
  files_sent?: string | null;
  preferred_take?: string | null;
  ignore_takes?: string | null;
  b_roll_included?: boolean;
  b_roll_usage?: string | null;
  music_override?: string | null;
  typography_override?: string | null;
  color_style_override?: string | null;
  format_override?: string | null;
  cta_final?: string | null;
  delivery_drive_folder?: string | null;
  final_file_naming?: string | null;
  status?: string;
  magic_link_token?: string | null;
  magic_link_expires_at?: string | null;
  created_by_user_id?: string;
  created_at?: string;
  updated_at?: string;
  use_client_profile?: boolean;
  notify_on_completion?: boolean;
  assigned_to_user_id?: string | null;
  opening_hook?: string | null;
  custom_caption?: string | null;
  specific_music?: string | null;
  music_reference_video?: string | null;
  observations?: string | null;
  external_filler_email?: string | null;
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
      // 1. Create the briefing
      const { data, error } = await supabase
        .from("video_editing_briefings")
        .insert(briefing as any)
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
