import { BriefingStatus } from "@/types/briefing";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BriefingStatusBadgeProps {
  status: BriefingStatus;
  className?: string;
}

export const BriefingStatusBadge = ({ status, className }: BriefingStatusBadgeProps) => {
  const statusConfig: Record<BriefingStatus, { label: string; className: string }> = {
    draft: { label: "Rascunho", className: "bg-slate-500 hover:bg-slate-600 text-white" },
    pending_fill: { label: "Aguardando Preenchimento", className: "bg-amber-500 hover:bg-amber-600 text-white" },
    in_review: { label: "Em Revisão", className: "bg-blue-500 hover:bg-blue-600 text-white" },
    approved: { label: "Aprovado", className: "bg-green-500 hover:bg-green-600 text-white" },
    archived: { label: "Arquivado", className: "bg-gray-500 hover:bg-gray-600 text-white" },
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <Badge className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
};
