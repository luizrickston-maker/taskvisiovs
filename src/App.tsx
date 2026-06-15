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
import { SuperAdminRoute } from "@/components/SuperAdminRoute";
import { ClientPortalRoute } from "@/components/ClientPortalRoute";
import { CollaboratorRoute } from "@/components/auth/CollaboratorRoute";
import { ThemeProvider } from "@/components/ThemeProvider";

// Auth pages - loaded eagerly (needed immediately)
import Auth from "@/pages/Auth";
import AuthCallback from "@/pages/AuthCallback";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";
import BriefingFillPage from "@/pages/BriefingFillPage";
import VideoBriefingViewPage from "@/pages/VideoBriefingViewPage";
import { RootRedirect } from "@/components/auth/RootRedirect";

// Componentes core que serão carregados com prioridade (mas ainda lazy para não travar o main thread)
const CaixaDashboard = lazy(() => import(/* vitePrefetch: true */ "@/pages/CaixaDashboard"));
const FocoDashboard = lazy(() => import(/* vitePrefetch: true */ "@/pages/FocoDashboard"));

// ALL other app pages lazy loaded for fast initial bundle
const PortalRedirect = lazy(() => import("@/pages/PortalRedirect"));
const FinancasDashboard = lazy(() => import("@/pages/FinancasDashboard"));
const PlanejamentoDashboard = lazy(() => import("@/pages/PlanejamentoDashboard"));
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
const AgendaPage = lazy(() => import("@/pages/PJ/AgendaPage"));
const CalendarioEditorialPage = lazy(() => import("@/pages/PJ/CalendarioEditorialPage"));
const AI360DashboardPage = lazy(() => import("@/pages/PJ/AI360DashboardPage"));
const AiAgentsManagerPage = lazy(() => import("@/pages/PJ/AiAgentsManagerPage"));
const ProcessosPage = lazy(() => import("@/pages/PJ/ProcessosPage"));
const ProcessEditorPage = lazy(() => import("@/pages/PJ/ProcessEditorPage"));
const ProcessViewPage = lazy(() => import("@/pages/PJ/ProcessViewPage"));
const BriefingsPage = lazy(() => import("@/pages/PJ/BriefingsPage"));
const BriefingEditorPage = lazy(() => import("@/pages/PJ/BriefingEditorPage"));
const BriefingReviewPage = lazy(() => import("@/pages/PJ/BriefingReviewPage"));
const ClientesFinaisPage = lazy(() => import("@/pages/Comercial/ClientesFinaisPage"));
const ClientFinalDetailsPage = lazy(() => import("@/pages/Comercial/ClientFinalDetailsPage"));
const AI360PersonalDashboardPage = lazy(() => import("@/pages/Personal/AI360PersonalDashboardPage"));
const FinanceCategoryManagementPage = lazy(() => import("@/pages/Personal/FinanceCategoryManagementPage"));
const FerramentasPage = lazy(() => import("@/pages/FerramentasPage"));
const SuperAdminDashboard = lazy(() => import("@/pages/SuperAdmin/SuperAdminDashboard"));
const WorkspaceDetailsPage = lazy(() => import("@/pages/SuperAdmin/WorkspaceDetailsPage"));
const PortalDashboard = lazy(() => import("@/pages/ClientPortal/PortalDashboard"));
const CollaboratorPortal = lazy(() => import("@/pages/PJ/CollaboratorPortal"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
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

// Fallback leve para erro isolado por rota — não derruba a navegação global
function PageError() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <p className="text-sm font-medium text-destructive">Esta página encontrou um erro.</p>
      <button
        className="text-xs text-muted-foreground underline hover:text-foreground"
        onClick={() => window.location.reload()}
      >
        Recarregar
      </button>
    </div>
  );
}

// Combina Suspense + ErrorBoundary por rota para isolar falhas
function SafePage({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary fallback={<PageError />}>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </ErrorBoundary>
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
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme" attribute="class">
          <AuthProvider>
            <Toaster />
            <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<RootRedirect />} />
              {/* Removed individual top-level /colaborador route to use AppLayout instead */}
              {/* Alias for cerebro-operacional to avoid 404s */}
              <Route path="/pj/cerebro-ia" element={<Navigate to="/pj/cerebro-operacional" replace />} />
              <Route path="/pj/clientes" element={<Navigate to="/comercial/clientes" replace />} />
              <Route path="/pj/clientes/:id" element={<Navigate to="/comercial/clientes/:id" replace />} />
              <Route path="/colaboradores" element={<Navigate to="/colaborador" replace />} />
              <Route path="/collaborator" element={<Navigate to="/colaborador" replace />} />
              {/* Short link redirect - public */}
              <Route path="/p/:code" element={
                <SafePage>
                  <PortalRedirect />
                </SafePage>
              } />
              <Route path="/briefing/fill" element={<BriefingFillPage />} />
              <Route path="/video-briefing/fill" element={<VideoBriefingViewPage />} />
              <Route path="/pj/projetos/tarefas/:taskId/briefing" element={<VideoBriefingViewPage />} />
              {/* Client Portal - isolated from main app */}
              <Route path="/portal" element={
                <ClientPortalRoute>
                  <SafePage>
                    <PortalDashboard />
                  </SafePage>
                </ClientPortalRoute>
              } />
              {/* Collaborator Portal is now at top level */}
              {/* Super Admin - outside AppLayout */}
              <Route path="/super-admin" element={
                <SuperAdminRoute>
                  <SafePage>
                    <SuperAdminDashboard />
                  </SafePage>
                </SuperAdminRoute>
              } />
              <Route path="/super-admin/workspace/:id" element={
                <SuperAdminRoute>
                  <SafePage>
                    <WorkspaceDetailsPage />
                  </SafePage>
                </SuperAdminRoute>
              } />
              <Route
                element={
                  <ProtectedRoute>
                    <AppBootstrap>
                      <AppLayout />
                    </AppBootstrap>
                  </ProtectedRoute>
                }
              >
                {/* Personal Routes - Core */}
                <Route path="/caixa" element={
                  <SafePage>
                    <CaixaDashboard />
                  </SafePage>
                } />
                <Route path="/meu-dia" element={
                  <SafePage>
                    <FocoDashboard />
                  </SafePage>
                } />
                <Route path="/foco" element={<Navigate to="/meu-dia" replace />} />
                
                {/* Personal Routes - Lazy loaded */}
                <Route path="/financas" element={
                  <SafePage>
                    <FinancasDashboard />
                  </SafePage>
                } />
                <Route path="/planejamento" element={
                  <SafePage>
                    <PlanejamentoDashboard />
                  </SafePage>
                } />
                <Route path="/projetos" element={
                  <SafePage>
                    <ProjetosDashboard />
                  </SafePage>
                } />
                <Route path="/conteudos" element={
                  <SafePage>
                    <ConteudosDashboard />
                  </SafePage>
                } />
                <Route path="/roteiros" element={
                  <SafePage>
                    <RoteirosDashboard />
                  </SafePage>
                } />
                <Route path="/assistente-pessoal" element={
                  <SafePage>
                    <AI360PersonalDashboardPage />
                  </SafePage>
                } />
                <Route path="/financas/categorias" element={
                  <SafePage>
                    <FinanceCategoryManagementPage />
                  </SafePage>
                } />
                <Route path="/ferramentas" element={
                  <SafePage>
                    <FerramentasPage />
                  </SafePage>
                } />
                
                {/* Business/PJ Routes - Lazy loaded */}
                <Route path="/comercial" element={
                  <SafePage>
                    <ComercialDashboard />
                  </SafePage>
                } />
                <Route path="/pj/projetos" element={
                  <SafePage>
                    <ProjetosClientesPage />
                  </SafePage>
                } />
                <Route path="/pj/financeiro" element={
                  <SafePage>
                    <FinanceiroPage />
                  </SafePage>
                } />
                <Route path="/pj/planos" element={
                  <SafePage>
                    <PlanosPage />
                  </SafePage>
                } />
                <Route path="/pj/investimentos" element={
                  <SafePage>
                    <InvestimentosPage />
                  </SafePage>
                } />
                <Route path="/pj/time" element={
                  <SafePage>
                    <TimePage />
                  </SafePage>
                } />
                <Route path="/pj/agenda" element={
                  <SafePage>
                    <AgendaPage />
                  </SafePage>
                } />
                <Route path="/pj/calendario-editorial" element={
                  <SafePage>
                    <CalendarioEditorialPage />
                  </SafePage>
                } />
                <Route path="/pj/cerebro-operacional" element={
                  <SafePage>
                    <AI360DashboardPage />
                  </SafePage>
                } />
                <Route path="/pj/agentes-ia" element={
                  <SafePage>
                    <AiAgentsManagerPage />
                  </SafePage>
                } />
                <Route path="/pj/processos" element={
                  <SafePage>
                    <ProcessosPage />
                  </SafePage>
                } />
                <Route path="/pj/briefings" element={
                  <SafePage>
                    <BriefingsPage />
                  </SafePage>
                } />
                <Route path="/pj/briefings/novo" element={
                  <SafePage>
                    <BriefingEditorPage />
                  </SafePage>
                } />
                <Route path="/pj/briefings/:id/editar" element={
                  <SafePage>
                    <BriefingEditorPage />
                  </SafePage>
                } />
                <Route path="/pj/briefings/:id/review" element={
                  <SafePage>
                    <BriefingReviewPage />
                  </SafePage>
                } />
                <Route path="/comercial/clientes" element={
                  <SafePage>
                    <ClientesFinaisPage />
                  </SafePage>
                } />
                <Route path="/comercial/clientes/:id" element={
                  <SafePage>
                    <ClientFinalDetailsPage />
                  </SafePage>
                } />
                <Route path="/pj/processos/novo" element={
                  <SafePage>
                    <ProcessEditorPage />
                  </SafePage>
                } />
                <Route path="/pj/processos/:id" element={
                  <SafePage>
                    <ProcessViewPage />
                  </SafePage>
                } />
                <Route path="/pj/processos/:id/editar" element={
                  <SafePage>
                    <ProcessEditorPage />
                  </SafePage>
                } />
                
                {/* Config - Lazy loaded */}
                <Route path="/config" element={
                  <SafePage>
                    <ConfigPage />
                  </SafePage>
                } />
                
                <Route path="/colaborador" element={
                  <CollaboratorRoute>
                    <SafePage>
                      <CollaboratorPortal />
                    </SafePage>
                  </CollaboratorRoute>
                } />
                
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
