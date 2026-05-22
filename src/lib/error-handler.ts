import { toast } from "sonner";

/**
 * Interface para a resposta padrão do Supabase/PostgREST
 */
interface SupabaseResponse<T> {
  data: T | null;
  error: any;
}

/**
 * Helper para tratamento de erros global em chamadas do Supabase.
 * Exibe toasts amigáveis e loga detalhes técnicos no console.
 */
export async function handleSupabaseError<T>(
  promise: Promise<SupabaseResponse<T>>,
  friendlyMessage: string
): Promise<T | null> {
  try {
    const { data, error } = await promise;

    if (error) {
      console.error(`[Supabase Error]:`, error);
      
      // Mensagens específicas baseadas em códigos de erro comuns do Postgres/Supabase
      let message = friendlyMessage;
      
      if (error.code === '23505') {
        message = "Este registro já existe.";
      } else if (error.code === '42501') {
        message = "Você não tem permissão para realizar esta ação.";
      } else if (error.message?.includes('network')) {
        message = "Erro de conexão. Verifique sua internet.";
      }

      toast.error(message);
      return null;
    }

    return data;
  } catch (err) {
    console.error(`[Unexpected Error]:`, err);
    toast.error("Ocorreu um erro inesperado. Tente novamente.");
    return null;
  }
}
