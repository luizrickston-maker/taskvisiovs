import { useState } from 'react';
import { MoreHorizontal, Edit, Copy, Trash2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
import type { ServicePlan, ServicePlanItem, CorporatePricing } from '@/types/database';
import { cn } from '@/lib/utils';

interface PlanCardProps {
  plan: ServicePlan;
  planItems: ServicePlanItem[];
  pricings: CorporatePricing[];
  onEdit: () => void;
}

const tierConfig = {
  bronze: {
    label: 'Bronze',
    borderColor: 'border-l-amber-700',
    bgColor: 'bg-amber-700/10',
    textColor: 'text-amber-700',
  },
  silver: {
    label: 'Prata',
    borderColor: 'border-l-slate-400',
    bgColor: 'bg-slate-400/10',
    textColor: 'text-slate-500',
  },
  gold: {
    label: 'Ouro',
    borderColor: 'border-l-yellow-500',
    bgColor: 'bg-yellow-500/10',
    textColor: 'text-yellow-600',
  },
};

export function PlanCard({ plan, planItems, pricings, onEdit }: PlanCardProps) {
  const { user } = useAuthContext();
  const { updateServicePlan, deleteServicePlan, addServicePlan, addServicePlanItem } = useAppStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const tier = tierConfig[plan.tier] || tierConfig.bronze;

  const itemsWithNames = planItems.map(item => {
    const pricing = pricings.find(p => p.id === item.pricing_id);
    return {
      ...item,
      name: pricing?.item_name || 'Item removido',
    };
  });

  const visibleItems = itemsWithNames.slice(0, 3);
  const remainingCount = itemsWithNames.length - 3;

  const handleToggleActive = async () => {
    const newStatus = !plan.is_active;
    updateServicePlan(plan.id, { is_active: newStatus });

    const { error } = await supabase
      .from('service_plans')
      .update({ is_active: newStatus })
      .eq('id', plan.id);

    if (error) {
      updateServicePlan(plan.id, { is_active: plan.is_active });
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = async () => {
    if (!user) return;

    const newPlan = {
      user_id: user.id,
      name: `${plan.name} (Cópia)`,
      description: plan.description,
      tier: plan.tier,
      plan_type: plan.plan_type,
      base_cost: plan.base_cost,
      final_price: plan.final_price,
      profit: plan.profit,
      profit_margin: plan.profit_margin,
      monthly_limit: plan.monthly_limit,
      is_active: false,
      notes: plan.notes,
    };

    const { data, error } = await supabase
      .from('service_plans')
      .insert(newPlan)
      .select()
      .single();

    if (error) {
      toast({
        title: 'Erro ao duplicar plano',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    addServicePlan(data as ServicePlan);

    // Duplicate items
    for (const item of planItems) {
      const newItem = {
        user_id: user.id,
        plan_id: data.id,
        pricing_id: item.pricing_id,
        quantity: item.quantity,
        custom_price: item.custom_price,
      };

      const { data: itemData, error: itemError } = await supabase
        .from('service_plan_items')
        .insert(newItem)
        .select()
        .single();

      if (!itemError && itemData) {
        addServicePlanItem(itemData as ServicePlanItem);
      }
    }

    toast({
      title: 'Plano duplicado',
      description: 'O plano foi duplicado com sucesso.',
    });
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    const { error } = await supabase
      .from('service_plans')
      .delete()
      .eq('id', plan.id);

    if (error) {
      toast({
        title: 'Erro ao excluir plano',
        description: error.message,
        variant: 'destructive',
      });
      setIsDeleting(false);
      return;
    }

    deleteServicePlan(plan.id);
    toast({
      title: 'Plano excluído',
      description: 'O plano foi removido com sucesso.',
    });
    setShowDeleteDialog(false);
    setIsDeleting(false);
  };

  return (
    <>
      <Card className={cn('border-l-4 transition-all hover:shadow-md', tier.borderColor, !plan.is_active && 'opacity-60')}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={cn('text-xs', tier.bgColor, tier.textColor)} variant="secondary">
                  {tier.label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {plan.plan_type === 'recorrente' ? 'Recorrente' : 'Pontual'}
                </Badge>
              </div>
              <h3 className="font-semibold truncate">{plan.name}</h3>
              {plan.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{plan.description}</p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Items List */}
          {itemsWithNames.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Serviços inclusos:</p>
              <ul className="text-xs space-y-0.5">
                {visibleItems.map(item => (
                  <li key={item.id} className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-primary rounded-full flex-shrink-0" />
                    <span className="truncate">
                      {item.quantity > 1 && `${item.quantity}x `}{item.name}
                    </span>
                  </li>
                ))}
                {remainingCount > 0 && (
                  <li className="text-muted-foreground">e mais {remainingCount}...</li>
                )}
              </ul>
            </div>
          )}

          {/* Monthly Limit */}
          {plan.monthly_limit && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Limite: {plan.monthly_limit}</span>
            </div>
          )}

          {/* Price and Margin */}
          <div className="pt-2 border-t space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">Preço Final</span>
              <span className="text-lg font-bold">{formatCurrency(plan.final_price)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">Margem de Lucro</span>
              <span className={cn('text-sm font-medium', plan.profit_margin >= 0 ? 'text-green-600' : 'text-destructive')}>
                {plan.profit_margin.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">Ativo para venda</span>
            <Switch checked={plan.is_active} onCheckedChange={handleToggleActive} />
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O plano "{plan.name}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
