import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { useUserPreferences } from '@/hooks/useUserPreferences';

export function AppLayout() {
  const { appName } = useUserPreferences();

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
