import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  FileText, 
  User, 
  Calendar, 
  MoreVertical, 
  Send, 
  Eye, 
  Copy, 
  Trash2, 
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface BriefingCardProps {
  briefing: any;
  onView: (id: string) => void;
  onSend: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export function BriefingCard({ briefing, onView, onSend, onDelete, onDuplicate }: BriefingCardProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return { label: 'Aprovado', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle2 };
      case 'pending_fill':
        return { label: 'Aguardando Preenchimento', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Clock };
      case 'in_review':
        return { label: 'Em Revisão', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Eye };
      case 'rejected':
        return { label: 'Recusado', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: AlertCircle };
      default:
        return { label: 'Rascunho', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20', icon: FileText };
    }
  };

  const status = getStatusConfig(briefing.status);
  const StatusIcon = status.icon;

  return (
    <Card className="glass-card group hover:shadow-xl transition-all duration-300 border-primary/10 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <Badge className={cn("gap-1 font-medium", status.color)}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onView(briefing.id)} className="gap-2">
                <Eye className="w-4 h-4" /> Visualizar / Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSend(briefing.id)} className="gap-2">
                <Send className="w-4 h-4" /> Enviar p/ Preenchimento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(briefing.id)} className="gap-2">
                <Copy className="w-4 h-4" /> Duplicar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(briefing.id)} className="gap-2 text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardTitle className="mt-3 text-lg line-clamp-1 group-hover:text-primary transition-colors">
          {briefing.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            <span className="truncate">
              {briefing.clients?.name || briefing.external_filler_email || briefing.assigned_user?.email || "Não atribuído"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Atualizado em {format(new Date(briefing.updated_at), "dd/MM/yyyy", { locale: ptBR })}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-xs h-8"
            onClick={() => onView(briefing.id)}
          >
            Abrir
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs h-8 hover:bg-primary/10 hover:text-primary"
            onClick={() => onSend(briefing.id)}
          >
            Enviar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
