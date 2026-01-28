import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppBootstrap } from "@/components/bootstrap/AppBootstrap";
import Auth from "@/pages/Auth";
import AuthCallback from "@/pages/AuthCallback";
import ResetPassword from "@/pages/ResetPassword";
import CaixaDashboard from "@/pages/CaixaDashboard";
import FinancasDashboard from "@/pages/FinancasDashboard";
import FocoDashboard from "@/pages/FocoDashboard";
import ProjetosDashboard from "@/pages/ProjetosDashboard";
import ComercialDashboard from "@/pages/ComercialDashboard";
import ConteudosDashboard from "@/pages/ConteudosDashboard";
import RoteirosDashboard from "@/pages/RoteirosDashboard";
import ConfigPage from "@/pages/ConfigPage";
import NotFound from "@/pages/NotFound";

// PJ Pages
import PrecificadorPage from "@/pages/PJ/PrecificadorPage";
import PlanosPage from "@/pages/PJ/PlanosPage";
import InvestimentosPage from "@/pages/PJ/InvestimentosPage";
import TimePage from "@/pages/PJ/TimePage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Boot marker para debug
if (import.meta.env.DEV) {
  console.log('[App] Bootstrap iniciado', { timestamp: new Date().toISOString() });
}

const App = () => {
  // Log de montagem em dev
  if (import.meta.env.DEV) {
    console.log('[App] Componente montado');
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
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
                    <AppBootstrap>
                      <AppLayout />
                    </AppBootstrap>
                  </ProtectedRoute>
                }
              >
                {/* Personal Routes */}
                <Route path="/caixa" element={<CaixaDashboard />} />
                <Route path="/financas" element={<FinancasDashboard />} />
                <Route path="/foco" element={<FocoDashboard />} />
                <Route path="/projetos" element={<ProjetosDashboard />} />
                <Route path="/conteudos" element={<ConteudosDashboard />} />
                <Route path="/roteiros" element={<RoteirosDashboard />} />
                
                {/* Business/PJ Routes */}
                <Route path="/comercial" element={<ComercialDashboard />} />
                <Route path="/pj/precificador" element={<PrecificadorPage />} />
                <Route path="/pj/planos" element={<PlanosPage />} />
                <Route path="/pj/investimentos" element={<InvestimentosPage />} />
                <Route path="/pj/time" element={<TimePage />} />
                
                {/* Config */}
                <Route path="/config" element={<ConfigPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
