import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

export function RootRedirect() {
  const { data: role, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (role === "collaborator") {
    console.log('[RootRedirect] Redirecting to collaborator portal');
    return <Navigate to="/colaborador" replace />;
  }

  // Default redirect for owners/admins
  return <Navigate to="/comercial" replace />;
}
