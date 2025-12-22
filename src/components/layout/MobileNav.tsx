import { Wallet, TrendingUp, Target, FolderKanban, MoreHorizontal, Pen, Calendar, Settings } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const mainNavItems = [
  { title: 'Caixa', url: '/caixa', icon: Wallet },
  { title: 'Finanças', url: '/financas', icon: TrendingUp },
  { title: 'Foco', url: '/foco', icon: Target },
  { title: 'Projetos', url: '/projetos', icon: FolderKanban },
];

const moreNavItems = [
  { title: 'Roteiros', url: '/roteiros', icon: Pen },
  { title: 'Conteúdos', url: '/conteudos', icon: Calendar },
  { title: 'Config', url: '/config', icon: Settings },
];

export function MobileNav() {
  const location = useLocation();
  const isMoreActive = moreNavItems.some(item => location.pathname === item.url);

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
                <DropdownMenuItem key={item.title} asChild>
                  <NavLink
                    to={item.url}
                    className={cn(
                      "flex items-center gap-3 w-full cursor-pointer",
                      isActive && "text-primary font-medium"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </NavLink>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
