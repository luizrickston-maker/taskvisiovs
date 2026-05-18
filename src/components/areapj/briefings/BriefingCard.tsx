import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  User, 
  Calendar, 
  MoreVertical, 
  Send, 
  Eye, 
  Copy, 
  Trash2,
  Mail
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Briefing } from "@/types/briefing";
import { BriefingStatusBadge } from "@/components/briefings/BriefingStatusBadge";

interface BriefingCardProps {
  briefing: Briefing;
  onView: (id: string) => void;
  onSend: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export function BriefingCard({ briefing, onView, onSend, onDelete, onDuplicate }: BriefingCardProps) {
  return (
    <Card className="glass-card group hover:shadow-xl transition-all duration-300 border-primary/10 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <BriefingStatusBadge status={briefing.status} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => onView(briefing.id)} className="gap-2">
                <Eye className="w-4 h-4" /> 
                {briefing.status === 'approved' ? 'Visualizar' : 'Editar / Revisar'}
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
            <User className="w-4 h-4 text-primary/60" />
            <span className="truncate">
              {briefing.client?.name || "Sem cliente vinculado"}
            </span>
          </div>
          {briefing.external_filler_email && (
             <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4 text-primary/60" />
              <span className="truncate">{briefing.external_filler_email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 text-primary/60" />
            <span>Atualizado em {format(new Date(briefing.updated_at), "dd/MM/yyyy", { locale: ptBR })}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-xs h-9 font-semibold"
            onClick={() => onView(briefing.id)}
          >
            Abrir
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs h-9 font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={() => onSend(briefing.id)}
          >
            Enviar Link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
