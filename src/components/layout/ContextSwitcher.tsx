import { User, Building2, ChevronDown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAppContext, type AppContextMode } from '@/hooks/useAppContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ContextSwitcherProps {
  collapsed?: boolean;
}

const contexts: { value: AppContextMode; label: string; icon: React.ElementType }[] = [
  { value: 'personal', label: 'Pessoal', icon: User },
  { value: 'business', label: 'Empresarial', icon: Building2 },
];

export function ContextSwitcher({ collapsed = false }: ContextSwitcherProps) {
  const { mode, setMode } = useAppContext();
  const navigate = useNavigate();
  const current = contexts.find(c => c.value === mode) || contexts[0];
  const CurrentIcon = current.icon;

  const handleModeChange = (newMode: AppContextMode) => {
    if (newMode !== mode) {
      setMode(newMode);
      const defaultRoute = newMode === 'personal' ? '/caixa' : '/comercial';
      // UI: Smooth transition to the new mode's landing page
      navigate(defaultRoute, { replace: true });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2 rounded-lg",
            "bg-muted/50 hover:bg-muted transition-colors",
            "text-sm font-medium text-foreground",
            collapsed && "justify-center px-2"
          )}
        >
          <CurrentIcon className="w-4 h-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left truncate">{current.label}</span>
              <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-48 bg-background border-border"
        sideOffset={4}
      >
        {contexts.map((context) => {
          const Icon = context.icon;
          const isActive = mode === context.value;
          return (
            <DropdownMenuItem
              key={context.value}
              onClick={() => handleModeChange(context.value)}
              className={cn(
                "flex items-center gap-3 cursor-pointer",
                isActive && "bg-primary/10 text-primary font-medium"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1">{context.label}</span>
              {isActive && <Check className="w-4 h-4" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
