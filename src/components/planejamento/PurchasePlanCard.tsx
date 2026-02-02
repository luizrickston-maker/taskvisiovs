import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, Plus, Pencil, Trash2, CheckCircle, 
  Calendar, Tag, ImageIcon
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/useAppStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { PurchasePlan } from '@/types/database';
import { AddSavingsModal } from './AddSavingsModal';
import { PurchasePlanForm } from './PurchasePlanForm';

interface PurchasePlanCardProps {
  plan: PurchasePlan;
}

const priorityConfig = {
  low: { label: 'Baixa', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  medium: { label: 'Média', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  high: { label: 'Alta', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const statusConfig = {
  planning: { label: 'Planejando', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  in_progress: { label: 'Em Andamento', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  completed: { label: 'Concluído', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};

export function PurchasePlanCard({ plan }: PurchasePlanCardProps) {
  const { updatePurchasePlan, deletePurchasePlan } = useAppStore();
  const [addSavingsOpen, setAddSavingsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const targetAmount = Number(plan.target_amount);
  const savedAmount = Number(plan.saved_amount);
  const remaining = Math.max(0, targetAmount - savedAmount);
  const progress = targetAmount > 0 ? Math.min(100, (savedAmount / targetAmount) * 100) : 0;

  const daysLeft = plan.deadline 
    ? differenceInDays(parseISO(plan.deadline), new Date())
    : null;

  const handleDelete = async () => {
    const { error } = await supabase
      .from('purchase_plans')
      .delete()
      .eq('id', plan.id);

    if (error) {
      toast.error('Erro ao excluir plano');
      return;
    }

    deletePurchasePlan(plan.id);
    toast.success('Plano excluído');
  };

  const handleMarkComplete = async () => {
    const newStatus = plan.status === 'completed' ? 'in_progress' : 'completed';
    const { error } = await supabase
      .from('purchase_plans')
      .update({ status: newStatus })
      .eq('id', plan.id);

    if (error) {
      toast.error('Erro ao atualizar status');
      return;
    }

    updatePurchasePlan(plan.id, { status: newStatus });
    toast.success(newStatus === 'completed' ? 'Meta concluída! 🎉' : 'Meta reaberta');
  };

  return (
    <>
      <Card className={cn(
        "glass-card transition-all hover:shadow-lg relative overflow-hidden group",
        plan.status === 'completed' && "opacity-75"
      )}>
        {/* Image or Placeholder */}
        {plan.image_url ? (
          <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${plan.image_url})` }} />
        ) : (
          <div className="h-20 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}

        <CardHeader className="pb-2 pt-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 flex-1 min-w-0">
              <h3 className="font-semibold text-lg leading-tight truncate" title={plan.name}>
                {plan.name}
              </h3>
              {plan.category && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Tag className="h-3 w-3" />
                  <span>{plan.category}</span>
                </div>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleMarkComplete}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {plan.status === 'completed' ? 'Reabrir' : 'Marcar Concluído'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge variant="secondary" className={cn("text-xs", priorityConfig[plan.priority].className)}>
              {priorityConfig[plan.priority].label}
            </Badge>
            <Badge variant="secondary" className={cn("text-xs", statusConfig[plan.status].className)}>
              {statusConfig[plan.status].label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatCurrency(savedAmount)} economizado</span>
              <span>{formatCurrency(targetAmount)} total</span>
            </div>
          </div>

          {/* Remaining */}
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground">Falta economizar</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(remaining)}</p>
          </div>

          {/* Deadline */}
          {plan.deadline && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {format(parseISO(plan.deadline), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                {daysLeft !== null && (
                  <span className={cn(
                    "ml-1",
                    daysLeft < 0 && "text-destructive font-medium",
                    daysLeft <= 30 && daysLeft >= 0 && "text-amber-600 font-medium"
                  )}>
                    ({daysLeft >= 0 ? `${daysLeft} dias` : 'Atrasada'})
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Add Savings Button */}
          {plan.status !== 'completed' && (
            <Button 
              onClick={() => setAddSavingsOpen(true)} 
              className="w-full gap-2"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              Adicionar Economia
            </Button>
          )}
        </CardContent>
      </Card>

      <AddSavingsModal 
        open={addSavingsOpen} 
        onOpenChange={setAddSavingsOpen} 
        plan={plan} 
      />
      
      <PurchasePlanForm 
        open={editOpen} 
        onOpenChange={setEditOpen} 
        editPlan={plan}
      />
    </>
  );
}
