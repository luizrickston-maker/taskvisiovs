import { Wallet, TrendingUp, Target, FolderKanban, FileText, Pen, Settings, LogOut, Briefcase, Package, Users, Calendar, Brain, ShoppingBag } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/hooks/useAppContext';
import { ContextSwitcher } from './ContextSwitcher';
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
import { useAuthContextSafe } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';

const personalNavItems = [
  { title: 'Caixa', url: '/caixa', icon: Wallet },
  { title: 'Finanças', url: '/financas', icon: TrendingUp },
  { title: 'Planejamento', url: '/planejamento', icon: ShoppingBag },
  { title: 'Foco', url: '/foco', icon: Target },
  { title: 'Projetos', url: '/projetos', icon: FolderKanban },
  { title: 'Conteúdos', url: '/conteudos', icon: FileText },
  { title: 'Roteiros', url: '/roteiros', icon: Pen },
  { title: 'Assistente IA', url: '/assistente-pessoal', icon: Brain },
];

const businessNavItems = [
  { title: 'Comercial', url: '/comercial', icon: Briefcase },
  { title: 'Projetos', url: '/pj/projetos', icon: FolderKanban },
  { title: 'Calendário', url: '/pj/calendario-editorial', icon: Calendar },
  { title: 'Financeiro', url: '/pj/financeiro', icon: Wallet },
  { title: 'Planos', url: '/pj/planos', icon: Package },
  { title: 'Investimentos', url: '/pj/investimentos', icon: TrendingUp },
  { title: 'Time', url: '/pj/time', icon: Users },
  { title: 'Cérebro IA', url: '/pj/cerebro-operacional', icon: Brain },
];

const settingsItem = { title: 'Config', url: '/config', icon: Settings };

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { appName } = useUserPreferences();
  const authContext = useAuthContextSafe();
  const signOut = authContext?.signOut ?? (() => {});
  const { mode } = useAppContext();
  const collapsed = state === 'collapsed';

  // Get nav items based on current mode
  const navItems = mode === 'personal' ? personalNavItems : businessNavItems;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 space-y-3">
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
        
        <ContextSwitcher collapsed={collapsed} />
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
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
