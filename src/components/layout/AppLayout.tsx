import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { RealtimeIndicator } from './RealtimeIndicator';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useRealtimeStatus } from '@/hooks/useRealtimeStatus';
import { useAuth } from '@/hooks/useAuth';

export function AppLayout() {
  // Hooks chamados de forma canônica - NUNCA em try/catch
  const preferences = useUserPreferences();
  const { user } = useAuth();
  const userId = user?.id;
  
  // Sincronização cross-device em tempo real
  useRealtimeSync(userId);
  
  // Status realtime
  const realtimeStatus = useRealtimeStatus(userId);
  
  // Fallback seguro para appName
  const appName = preferences?.appName ?? 'Meu App';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Desktop/Tablet Sidebar */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <SidebarInset className="flex-1 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background/95 backdrop-blur-xl px-4 md:px-6">
            <SidebarTrigger className="hidden md:flex" />
            <div className="flex-1">
              <h1 className="font-display font-semibold text-lg md:hidden">{appName}</h1>
            </div>
            <RealtimeIndicator status={realtimeStatus} />
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto pb-20 md:pb-6">
            <Outlet />
          </main>
        </SidebarInset>

        {/* Mobile Bottom Nav */}
        <MobileNav />
      </div>
    </SidebarProvider>
  );
}
