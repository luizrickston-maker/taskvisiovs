import { Wallet, TrendingUp, Target, FolderKanban, FileText, Pen, Settings, LogOut, Briefcase } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const mainNavItems = [
  { title: 'Comercial', url: '/comercial', icon: Briefcase },
  { title: 'Caixa', url: '/caixa', icon: Wallet },
  { title: 'Finanças', url: '/financas', icon: TrendingUp },
  { title: 'Foco', url: '/foco', icon: Target },
  { title: 'Projetos', url: '/projetos', icon: FolderKanban },
  { title: 'Conteúdos', url: '/conteudos', icon: FileText },
  { title: 'Roteiros', url: '/roteiros', icon: Pen },
];

const settingsItem = { title: 'Config', url: '/config', icon: Settings };

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { appName } = useUserPreferences();
  const { signOut } = useAuthContext();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className={cn(
          "flex items-center gap-3 transition-all duration-200",
          collapsed && "justify-center"
        )}>
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center glow-primary">
            <Wallet className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-display font-semibold text-lg text-foreground truncate">
              {appName}
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                          isActive 
                            ? "bg-primary text-primary-foreground shadow-lg" 
                            : "hover:bg-sidebar-accent text-sidebar-foreground"
                        )}
                      >
                        <item.icon className="w-5 h-5 shrink-0" />
                        {!collapsed && <span className="truncate">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <Separator className="mb-2" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === settingsItem.url}
              tooltip={settingsItem.title}
            >
              <NavLink
                to={settingsItem.url}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                  location.pathname === settingsItem.url
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "hover:bg-sidebar-accent text-sidebar-foreground"
                )}
              >
                <Settings className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="truncate">{settingsItem.title}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sair"
              onClick={signOut}
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-destructive/10 text-destructive cursor-pointer"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="truncate">Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
