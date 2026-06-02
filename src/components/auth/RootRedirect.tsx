import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useAppContext } from "@/hooks/useAppContext";
import { Loader2 } from "lucide-react";

export function RootRedirect() {
  const { data: role, isLoading } = useUserRole();
  const { setMode } = useAppContext();

  useEffect(() => {
    if (role === "collaborator") {
      setMode("business");
    }
  }, [role, setMode]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (role === "collaborator") {
    return <Navigate to="/colaborador" replace />;
  }

  // Default redirect for owners/admins
  return <Navigate to="/comercial" replace />;
}
