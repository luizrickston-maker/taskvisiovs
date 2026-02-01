import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  contentPlatformConfig, 
  contentStatusLabels,
  contentStatusColors,
  contentTypeLabels,
  type EditorialCalendarItem 
} from '@/types/editorial';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContentItemCardProps {
  item: EditorialCalendarItem;
  compact?: boolean;
  onClick?: () => void;
}

export function ContentItemCard({ item, compact = false, onClick }: ContentItemCardProps) {
  const platformConfig = contentPlatformConfig[item.platform];
  const statusLabel = contentStatusLabels[item.status];
  const statusColor = contentStatusColors[item.status];
  const typeLabel = contentTypeLabels[item.content_type];

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full text-left px-1.5 py-1 rounded text-[10px] md:text-xs truncate transition-all",
          "hover:opacity-80 hover:scale-[1.02]",
          platformConfig.color,
          "text-white"
        )}
        title={`${item.title} - ${platformConfig.label} (${typeLabel})`}
      >
        <span className="truncate block">{item.title}</span>
      </button>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg border border-border bg-card/80 cursor-pointer transition-all",
        "hover:shadow-md hover:border-primary/50",
        onClick && "cursor-pointer"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-sm line-clamp-2">{item.title}</h4>
        <Badge variant="secondary" className={cn("shrink-0 text-xs", statusColor, "text-white")}>
          {statusLabel}
        </Badge>
      </div>

      {item.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {item.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className={cn("text-xs", platformConfig.color, "text-white border-0")}>
          {platformConfig.label}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {typeLabel}
        </Badge>
        <span className="text-xs text-muted-foreground ml-auto">
          {format(new Date(item.due_date), "dd MMM", { locale: ptBR })}
        </span>
      </div>
    </div>
  );
}
