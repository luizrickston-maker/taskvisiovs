import { useState } from 'react';
import { Wallet, TrendingUp, FolderKanban, FileText, Pen, Settings, LogOut, Briefcase, Package, Users, Calendar, Brain, ShoppingBag, CalendarDays, Wrench, Shield, ChevronDown, Workflow, Layout } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useUserRole } from '@/hooks/useUserRole';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { title: string; url: string; icon: React.ComponentType<{ className?: string }> }[];
}

const personalNavItems: NavItem[] = [
  { title: 'Assistente IA', url: '/assistente-pessoal', icon: Brain },
  { title: 'Meu Dia', url: '/meu-dia', icon: CalendarDays },
  { title: 'Caixa', url: '/caixa', icon: Wallet },
  { title: 'Finanças', url: '/financas', icon: TrendingUp },
  { title: 'Planejamento', url: '/planejamento', icon: ShoppingBag },
  { title: 'Projetos', url: '/projetos', icon: FolderKanban },
  { title: 'Conteúdos', url: '/conteudos', icon: FileText },
  { title: 'Roteiros', url: '/roteiros', icon: Pen },
  { title: 'Ferramentas', url: '/ferramentas', icon: Wrench },
];




const businessNavItems: NavItem[] = [
  { title: 'Cérebro IA', url: '/pj/cerebro-operacional', icon: Brain },
  {
    title: 'Comercial',
    url: '/comercial',
    icon: Briefcase,
    children: [
      { title: 'Clientes', url: '/comercial/clientes', icon: Users },
    ],
  },
  { title: 'Projetos', url: '/pj/projetos', icon: FolderKanban },
  { title: 'Briefings', url: '/pj/briefings', icon: FileText },
  { title: 'Processos', url: '/pj/processos', icon: Workflow },
  { title: 'Calendário', url: '/pj/calendario-editorial', icon: Calendar },
  { title: 'Financeiro', url: '/pj/financeiro', icon: Wallet },
  { title: 'Planos', url: '/pj/planos', icon: Package },
  { title: 'Investimentos', url: '/pj/investimentos', icon: TrendingUp },
  { title: 'Time', url: '/pj/time', icon: Users },
  { title: 'Ferramentas', url: '/ferramentas', icon: Wrench },
];

const collaboratorNavItems: NavItem[] = [
  { title: 'Meu Painel', url: '/colaborador', icon: Layout },
  { title: 'IA Assistente', url: '/assistente-pessoal', icon: Brain },
];

const settingsItem = { title: 'Config', url: '/config', icon: Settings };

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { appName } = useUserPreferences();
  const authContext = useAuthContextSafe();
  const signOut = authContext?.signOut;
  const { mode } = useAppContext();
  const collapsed = state === 'collapsed';
  const { isSuperAdmin } = useSuperAdmin();
  const { data: userRole } = useUserRole();

  // Track which parent items are expanded
  const [expandedItems, setExpandedItems] = useState<string[]>(['Comercial']);

  // Get nav items based on current mode and role
  const navItems = (userRole as string) === 'collaborator' 
    ? collaboratorNavItems 
    : (mode === 'personal' ? personalNavItems : businessNavItems);

  const handleSignOut = async () => {
    if (signOut) {
      await signOut();
    }
    navigate('/auth', { replace: true });
  };

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const isChildActive = (item: NavItem) =>
    item.children?.some(c => location.pathname.startsWith(c.url)) ?? false;

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
                const hasChildren = item.children && item.children.length > 0;
                const isExpanded = expandedItems.includes(item.title);
                const isActive = location.pathname === item.url;
                const childActive = isChildActive(item);
                const isParentHighlighted = isActive || childActive;

                if (hasChildren) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      {/* Parent item — clicking navigates and toggles children */}
                      <SidebarMenuButton
                        isActive={isParentHighlighted}
                        tooltip={item.title}
                        onClick={() => {
                          navigate(item.url);
                          if (!collapsed) toggleExpanded(item.title);
                        }}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 w-full cursor-pointer",
                          isParentHighlighted
                            ? "bg-primary text-primary-foreground shadow-lg"
                            : "hover:bg-sidebar-accent text-sidebar-foreground"
                        )}
                      >
                        <item.icon className="w-5 h-5 shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="truncate flex-1">{item.title}</span>
                            <ChevronDown className={cn(
                              "w-4 h-4 shrink-0 transition-transform duration-200",
                              isExpanded && "rotate-180"
                            )} />
                          </>
                        )}
                      </SidebarMenuButton>

                      {/* Children */}
                      {!collapsed && isExpanded && (
                        <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                          {item.children!.map(child => {
                            const childIsActive = location.pathname.startsWith(child.url);
                            return (
                              <NavLink
                                key={child.url}
                                to={child.url}
                                className={cn(
                                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all duration-200",
                                  childIsActive
                                    ? "bg-primary/15 text-primary font-medium"
                                    : "hover:bg-sidebar-accent text-sidebar-foreground"
                                )}
                              >
                                <child.icon className="w-4 h-4 shrink-0" />
                                <span className="truncate">{child.title}</span>
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </SidebarMenuItem>
                  );
                }

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
          {isSuperAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location.pathname.startsWith('/super-admin')}
                tooltip="Super Admin"
              >
                <NavLink
                  to="/super-admin"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                    location.pathname.startsWith('/super-admin')
                      ? "bg-amber-500 text-white shadow-lg"
                      : "hover:bg-amber-500/10 text-amber-500"
                  )}
                >
                  <Shield className="w-5 h-5 shrink-0" />
                  {!collapsed && <span className="truncate">Super Admin</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
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
              onClick={handleSignOut}
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
