import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Copy, Trash2, Workflow, Tag, Package, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { BusinessProcess } from '@/hooks/useBusinessProcesses';

interface ProcessCardProps {
  process: BusinessProcess;
  onEdit: (process: BusinessProcess) => void;
  onDuplicate: (process: BusinessProcess) => void;
  onDelete: (id: string) => void;
  instanceCount?: number;
  completedCount?: number;
}

const categoryIcons: Record<string, React.ReactNode> = {
  atendimento: <Tag className="w-3.5 h-3.5" />,
  producao: <Wrench className="w-3.5 h-3.5" />,
  vendas: <Package className="w-3.5 h-3.5" />,
};

const categoryColors: Record<string, string> = {
  atendimento: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  producao: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  vendas: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

export function ProcessCard({
  process,
  onEdit,
  onDuplicate,
  onDelete,
  instanceCount = 0,
  completedCount = 0,
}: ProcessCardProps) {
  const progress = instanceCount > 0 ? Math.round((completedCount / instanceCount) * 100) : 0;

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4 group hover:shadow-lg transition-all duration-300">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Workflow className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate">{process.name}</h3>
            {process.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {process.description}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(process)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDuplicate(process)}>
            <Copy className="w-4 h-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir processo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação é irreversível. Todas as etapas, conexões e instâncias vinculadas serão removidas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(process.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-2">
        {process.category && (
          <Badge
            variant="outline"
            className={categoryColors[process.category] ?? 'bg-muted/50 text-muted-foreground border-border'}
          >
            {categoryIcons[process.category] ?? <Tag className="w-3.5 h-3.5" />}
            <span className="ml-1 capitalize">{process.category}</span>
          </Badge>
        )}

        {(process.related_product_id || process.related_service_id) && (
          <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border">
            {process.related_product_id ? (
              <Package className="w-3.5 h-3.5 mr-1" />
            ) : (
              <Wrench className="w-3.5 h-3.5 mr-1" />
            )}
            Vinculado
          </Badge>
        )}
      </div>

      {/* Progress (instances) */}
      {instanceCount > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {completedCount}/{instanceCount} instâncias concluídas
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
        <span>
          Atualizado{' '}
          {process.updated_at
            ? format(new Date(process.updated_at), "dd MMM yyyy", { locale: ptBR })
            : '—'}
        </span>
      </div>
    </div>
  );
}
