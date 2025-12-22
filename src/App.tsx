import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "@/pages/Auth";
import AuthCallback from "@/pages/AuthCallback";
import ResetPassword from "@/pages/ResetPassword";
import CaixaDashboard from "@/pages/CaixaDashboard";
import FinancasDashboard from "@/pages/FinancasDashboard";
import FocoDashboard from "@/pages/FocoDashboard";
import ProjetosDashboard from "@/pages/ProjetosDashboard";
import ConteudosDashboard from "@/pages/ConteudosDashboard";
import RoteirosDashboard from "@/pages/RoteirosDashboard";
import ConfigPage from "@/pages/ConfigPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<Navigate to="/caixa" replace />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/caixa" element={<CaixaDashboard />} />
            <Route path="/financas" element={<FinancasDashboard />} />
            <Route path="/foco" element={<FocoDashboard />} />
            <Route path="/projetos" element={<ProjetosDashboard />} />
            <Route path="/conteudos" element={<ConteudosDashboard />} />
            <Route path="/roteiros" element={<RoteirosDashboard />} />
            <Route path="/config" element={<ConfigPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
