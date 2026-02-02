import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Instagram, 
  Youtube, 
  Linkedin, 
  FileText, 
  Video,
  Music2
} from 'lucide-react';
import { 
  contentPlatformConfig, 
  contentStatusLabels,
  contentStatusColors,
  contentTypeLabels,
  type EditorialCalendarItem,
  type ContentPlatform
} from '@/types/editorial';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppStore } from '@/stores/useAppStore';
import { useMemo } from 'react';

// Platform icons mapping
const platformIcons: Record<ContentPlatform, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  tiktok: Music2, // TikTok-like icon
  linkedin: Linkedin,
  blog: FileText,
  youtube: Youtube,
};

interface CalendarItemCardProps {
  item: EditorialCalendarItem;
  compact?: boolean;
  onClick?: () => void;
}

export function CalendarItemCard({ item, compact = false, onClick }: CalendarItemCardProps) {
  const { corporateTeam } = useAppStore();
  
  const platformConfig = contentPlatformConfig[item.platform];
  const statusLabel = contentStatusLabels[item.status];
  const statusColor = contentStatusColors[item.status];
  const typeLabel = contentTypeLabels[item.content_type];
  const PlatformIcon = platformIcons[item.platform];

  // Get assigned team member
  const assignedMember = useMemo(() => {
    if (!item.assigned_to) return null;
    return corporateTeam.find(m => m.id === item.assigned_to);
  }, [item.assigned_to, corporateTeam]);

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full text-left px-2 py-1.5 rounded-md transition-all duration-200",
          "flex items-center gap-1.5",
          "bg-card/80 backdrop-blur-sm border border-border/40",
          "hover:bg-card hover:border-border/60 hover:shadow-sm",
          "group"
        )}
        title={`${item.title} - ${platformConfig.label} (${typeLabel})`}
      >
        {/* Platform icon */}
        <div className={cn(
          "w-5 h-5 rounded flex items-center justify-center shrink-0",
          platformConfig.color
        )}>
          <PlatformIcon className="w-3 h-3 text-white" />
        </div>
        
        {/* Title */}
        <span className="text-[11px] md:text-xs truncate flex-1 text-foreground group-hover:text-foreground">
          {item.title}
        </span>

        {/* Status dot */}
        <div 
          className={cn("w-2 h-2 rounded-full shrink-0", statusColor)}
          title={statusLabel}
        />
      </button>
    );
  }

  // Full card view
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg transition-all duration-200 cursor-pointer",
        // Glass-card styling
        "bg-card/70 backdrop-blur-sm border border-border/40",
        "shadow-sm hover:shadow-md hover:border-border/60",
        "hover:bg-card/90",
        onClick && "cursor-pointer"
      )}
    >
      {/* Header: Title + Status */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {/* Platform icon */}
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
            platformConfig.color
          )}>
            <PlatformIcon className="w-4 h-4 text-white" />
          </div>
          
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-sm line-clamp-2 text-foreground">
              {item.title}
            </h4>
            <span className="text-[10px] text-muted-foreground">
              {platformConfig.label} • {typeLabel}
            </span>
          </div>
        </div>

        {/* Status badge */}
        <Badge 
          variant="secondary" 
          className={cn(
            "shrink-0 text-[10px] px-1.5 py-0.5",
            statusColor, 
            "text-white border-0"
          )}
        >
          {statusLabel}
        </Badge>
      </div>

      {/* Description (if exists) */}
      {item.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2 pl-9">
          {item.description}
        </p>
      )}

      {/* Footer: Date + Assigned */}
      <div className="flex items-center justify-between gap-2 pl-9">
        <span className="text-[10px] text-muted-foreground">
          {format(new Date(item.due_date), "dd MMM", { locale: ptBR })}
        </span>

        {/* Assigned member indicator */}
        {assignedMember && (
          <div className="flex items-center gap-1.5">
            <Avatar className="w-5 h-5">
              <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                {getInitials(assignedMember.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              {assignedMember.name.split(' ')[0]}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
