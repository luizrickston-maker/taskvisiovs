import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export function useUserRole() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching user role:", error);
        return "user";
      }

      if (!data || data.length === 0) return "user";

      // Prioridade: super_admin > admin > collaborator > user
      const roles = data.map(r => r.role);
      if (roles.includes("super_admin")) return "super_admin";
      if (roles.includes("admin")) return "admin";
      if (roles.includes("collaborator")) return "collaborator";
      
      return roles[0] || "user";
    },
    enabled: !!user,
  });
}
