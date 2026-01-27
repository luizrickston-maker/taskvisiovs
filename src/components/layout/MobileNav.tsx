import { Wallet, TrendingUp, Target, FolderKanban, MoreHorizontal, Pen, Calendar, Settings, LogOut, Briefcase, Building2 } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const mainNavItems = [
  { title: 'Comercial', url: '/comercial', icon: Briefcase },
  { title: 'Caixa', url: '/caixa', icon: Wallet },
  { title: 'Finanças', url: '/financas', icon: TrendingUp },
  { title: 'Foco', url: '/foco', icon: Target },
];

const moreNavItems = [
  { title: 'Projetos', url: '/projetos', icon: FolderKanban },
  { title: 'Roteiros', url: '/roteiros', icon: Pen },
  { title: 'Conteúdos', url: '/conteudos', icon: Calendar },
  { title: 'Área PJ', url: '/area-pj', icon: Building2 },
  { title: 'Config', url: '/config', icon: Settings },
];

export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuthContext();
  const isMoreActive = moreNavItems.some(item => location.pathname === item.url);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
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
