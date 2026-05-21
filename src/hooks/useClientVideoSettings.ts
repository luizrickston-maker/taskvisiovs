import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ClientVideoSettings {
  id?: string;
  client_id: string;
  workspace_id: string;
  video_management_enabled: boolean;
  default_music_style: string | null;
  default_typography: string | null;
  default_color_style: string | null;
  default_format: string | null;
  default_cta: string | null;
  default_drive_folder_link: string | null;
  default_file_naming: string | null;
  created_at?: string;
  updated_at?: string;
}

export const useClientVideoSettings = (clientId: string) => {
  return useQuery({
    queryKey: ["client-video-settings", clientId],
    queryFn: async (): Promise<ClientVideoSettings | null> => {
      const { data, error } = await supabase
        .from("client_video_settings")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching client video settings:", error);
        throw error;
      }
      return data as ClientVideoSettings | null;
    },
    enabled: !!clientId,
  });
};

export const useUpdateClientVideoSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: ClientVideoSettings) => {
      const { data, error } = await supabase
        .from("client_video_settings")
        .upsert(settings, { onConflict: "client_id" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["client-video-settings", variables.client_id],
      });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Perfil de edição padrão atualizado!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar configurações: ${error.message}`);
    },
  });
};
