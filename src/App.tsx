import { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppBootstrap } from "@/components/bootstrap/AppBootstrap";
import { Skeleton } from "@/components/ui/skeleton";

// Auth pages - loaded eagerly (needed immediately)
import Auth from "@/pages/Auth";
import AuthCallback from "@/pages/AuthCallback";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";

// Core pages - loaded eagerly (most accessed)
import CaixaDashboard from "@/pages/CaixaDashboard";
import FocoDashboard from "@/pages/FocoDashboard";

// Lazy loaded pages - less frequently accessed or heavy
const FinancasDashboard = lazy(() => import("@/pages/FinancasDashboard"));
const ProjetosDashboard = lazy(() => import("@/pages/ProjetosDashboard"));
const ComercialDashboard = lazy(() => import("@/pages/ComercialDashboard"));
const ConteudosDashboard = lazy(() => import("@/pages/ConteudosDashboard"));
const RoteirosDashboard = lazy(() => import("@/pages/RoteirosDashboard"));
const ConfigPage = lazy(() => import("@/pages/ConfigPage"));

// PJ Pages - lazy loaded (business context)
const FinanceiroPage = lazy(() => import("@/pages/PJ/FinanceiroPage"));
const PlanosPage = lazy(() => import("@/pages/PJ/PlanosPage"));
const InvestimentosPage = lazy(() => import("@/pages/PJ/InvestimentosPage"));
const TimePage = lazy(() => import("@/pages/PJ/TimePage"));
const ProjetosClientesPage = lazy(() => import("@/pages/PJ/ProjetosClientesPage"));
const CalendarioEditorialPage = lazy(() => import("@/pages/PJ/CalendarioEditorialPage"));
const AI360DashboardPage = lazy(() => import("@/pages/PJ/AI360DashboardPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

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
                {/* Personal Routes - Core (eager) */}
                <Route path="/caixa" element={<CaixaDashboard />} />
                <Route path="/foco" element={<FocoDashboard />} />
                
                {/* Personal Routes - Lazy loaded */}
                <Route path="/financas" element={
                  <Suspense fallback={<PageLoader />}>
                    <FinancasDashboard />
                  </Suspense>
                } />
                <Route path="/projetos" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProjetosDashboard />
                  </Suspense>
                } />
                <Route path="/conteudos" element={
                  <Suspense fallback={<PageLoader />}>
                    <ConteudosDashboard />
                  </Suspense>
                } />
                <Route path="/roteiros" element={
                  <Suspense fallback={<PageLoader />}>
                    <RoteirosDashboard />
                  </Suspense>
                } />
                
                {/* Business/PJ Routes - Lazy loaded */}
                <Route path="/comercial" element={
                  <Suspense fallback={<PageLoader />}>
                    <ComercialDashboard />
                  </Suspense>
                } />
                <Route path="/pj/projetos" element={
                  <Suspense fallback={<PageLoader />}>
                    <ProjetosClientesPage />
                  </Suspense>
                } />
                <Route path="/pj/financeiro" element={
                  <Suspense fallback={<PageLoader />}>
                    <FinanceiroPage />
                  </Suspense>
                } />
                <Route path="/pj/planos" element={
                  <Suspense fallback={<PageLoader />}>
                    <PlanosPage />
                  </Suspense>
                } />
                <Route path="/pj/investimentos" element={
                  <Suspense fallback={<PageLoader />}>
                    <InvestimentosPage />
                  </Suspense>
                } />
                <Route path="/pj/time" element={
                  <Suspense fallback={<PageLoader />}>
                    <TimePage />
                  </Suspense>
                } />
                <Route path="/pj/calendario-editorial" element={
                  <Suspense fallback={<PageLoader />}>
                    <CalendarioEditorialPage />
                  </Suspense>
                } />
                <Route path="/pj/cerebro-operacional" element={
                  <Suspense fallback={<PageLoader />}>
                    <AI360DashboardPage />
                  </Suspense>
                } />
                
                {/* Config - Lazy loaded */}
                <Route path="/config" element={
                  <Suspense fallback={<PageLoader />}>
                    <ConfigPage />
                  </Suspense>
                } />
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
