import { AlertTriangle, Calendar, CheckCircle2, Clock, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { computeSla, type SlaInfo } from '@/lib/sla';
import { cn } from '@/lib/utils';

interface SlaChipProps {
  deadline?: string | null;
  status?: string | null;
  compact?: boolean;
  className?: string;
}

function pickIcon(info: SlaInfo) {
  if (info.level === 'overdue') return AlertTriangle;
  if (info.level === 'today') return Clock;
  if (info.level === 'attention') return Calendar;
  if (info.level === 'done') return CheckCircle2;
  return Minus;
}

/**
 * Chip visual de SLA: mostra se a tarefa/projeto/etapa está no prazo,
 * vence em breve, vence hoje ou está atrasada.
 */
export default function SlaChip({ deadline, status, compact = false, className }: SlaChipProps) {
  const info = computeSla(deadline, status);

  if (info.level === 'none') {
    if (compact) return null;
    return (
      <Badge variant="outline" className={cn('gap-1 text-[10px] text-muted-foreground', className)}>
        Sem prazo
      </Badge>
    );
  }

  const Icon = pickIcon(info);
  const overdue = info.level === 'overdue';

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 text-[10px] border-current/30 font-medium',
        info.color,
        info.bg,
        overdue && 'animate-pulse',
        className
      )}
      title={deadline ? `Prazo: ${deadline}` : undefined}
    >
      <Icon className="w-3 h-3" />
      {!compact && info.label}
    </Badge>
  );
}