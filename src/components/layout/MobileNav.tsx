import { Wallet, TrendingUp, Target, FolderKanban, MoreHorizontal, Pen, Calendar, Settings, LogOut, Briefcase, Calculator, Package, Users, User, Building2 } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppContext } from '@/hooks/useAppContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const personalMainNavItems = [
  { title: 'Caixa', url: '/caixa', icon: Wallet },
  { title: 'Finanças', url: '/financas', icon: TrendingUp },
  { title: 'Foco', url: '/foco', icon: Target },
  { title: 'Projetos', url: '/projetos', icon: FolderKanban },
];

const personalMoreNavItems = [
  { title: 'Roteiros', url: '/roteiros', icon: Pen },
  { title: 'Conteúdos', url: '/conteudos', icon: Calendar },
  { title: 'Config', url: '/config', icon: Settings },
];

const businessMainNavItems = [
  { title: 'Comercial', url: '/comercial', icon: Briefcase },
  { title: 'Precificador', url: '/pj/precificador', icon: Calculator },
  { title: 'Planos', url: '/pj/planos', icon: Package },
  { title: 'Time', url: '/pj/time', icon: Users },
];

const businessMoreNavItems = [
  { title: 'Investimentos', url: '/pj/investimentos', icon: TrendingUp },
  { title: 'Config', url: '/config', icon: Settings },
];

export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuthContext();
  const { mode, setMode } = useAppContext();
  
  const mainNavItems = mode === 'personal' ? personalMainNavItems : businessMainNavItems;
  const moreNavItems = mode === 'personal' ? personalMoreNavItems : businessMoreNavItems;
  
  const isMoreActive = moreNavItems.some(item => location.pathname === item.url);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  const handleSwitchMode = () => {
    const newMode = mode === 'personal' ? 'business' : 'personal';
    const defaultRoute = newMode === 'personal' ? '/caixa' : '/comercial';
    setMode(newMode);
    navigate(defaultRoute);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {mainNavItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <NavLink
              key={item.title}
              to={item.url}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 min-w-[60px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "drop-shadow-lg")} />
              <span className="text-[10px] font-medium">{item.title}</span>
            </NavLink>
          );
        })}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 min-w-[60px]",
                isMoreActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MoreHorizontal className={cn("w-5 h-5", isMoreActive && "drop-shadow-lg")} />
              <span className="text-[10px] font-medium">Mais</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-background border-border mb-2">
            {/* Context Switcher */}
            <DropdownMenuItem 
              onClick={handleSwitchMode}
              className="flex items-center gap-3 w-full cursor-pointer bg-muted/50"
            >
              {mode === 'personal' ? (
                <>
                  <Building2 className="w-4 h-4" />
                  <span>Modo Empresarial</span>
                </>
              ) : (
                <>
                  <User className="w-4 h-4" />
                  <span>Modo Pessoal</span>
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            
            {moreNavItems.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <DropdownMenuItem 
                  key={item.title} 
                  onClick={() => navigate(item.url)}
                  className={cn(
                    "flex items-center gap-3 w-full cursor-pointer",
                    isActive && "text-primary font-medium"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.title}</span>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
