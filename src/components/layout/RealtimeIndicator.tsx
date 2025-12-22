import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { RealtimeStatus } from '@/hooks/useRealtimeStatus';

interface RealtimeIndicatorProps {
  status?: RealtimeStatus;
}

export function RealtimeIndicator({ status = 'disconnected' }: RealtimeIndicatorProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50">
          {status === 'connected' && (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <Wifi className="h-3.5 w-3.5 text-emerald-500" />
            </>
          )}
          {status === 'connecting' && (
            <Loader2 className="h-3.5 w-3.5 text-amber-500 animate-spin" />
          )}
          {status === 'disconnected' && (
            <>
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
              </span>
              <WifiOff className="h-3.5 w-3.5 text-destructive" />
            </>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {status === 'connected' && 'Sincronização ativa'}
        {status === 'connecting' && 'Conectando...'}
        {status === 'disconnected' && 'Desconectado'}
      </TooltipContent>
    </Tooltip>
  );
}
