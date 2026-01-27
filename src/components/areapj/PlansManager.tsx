import { useState, useMemo } from 'react';
import { Package, Plus, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/stores/useAppStore';
import { formatCurrency } from '@/lib/currency';
import { PlanForm } from './PlanForm';
import { PlanCard } from './PlanCard';
import type { ServicePlan, PlanTier, PlanType } from '@/types/database';

export function PlansManager() {
  const { servicePlans, servicePlanItems, corporatePricings } = useAppStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ServicePlan | null>(null);
  const [filterTier, setFilterTier] = useState<PlanTier | 'all'>('all');
  const [filterType, setFilterType] = useState<PlanType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredPlans = useMemo(() => {
    return servicePlans.filter(plan => {
      if (filterTier !== 'all' && plan.tier !== filterTier) return false;
      if (filterType !== 'all' && plan.plan_type !== filterType) return false;
      if (filterStatus === 'active' && !plan.is_active) return false;
      if (filterStatus === 'inactive' && plan.is_active) return false;
      return true;
    });
  }, [servicePlans, filterTier, filterType, filterStatus]);

  const activePlansCount = servicePlans.filter(p => p.is_active).length;
  const potentialMonthlyRevenue = useMemo(() => {
    return servicePlans
      .filter(p => p.is_active && p.plan_type === 'recorrente')
      .reduce((sum, p) => sum + p.final_price, 0);
  }, [servicePlans]);

  const handleEdit = (plan: ServicePlan) => {
    setEditingPlan(plan);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingPlan(null);
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Planos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePlansCount}</div>
            <p className="text-xs text-muted-foreground">
              de {servicePlans.length} planos cadastrados
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Potencial Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(potentialMonthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              soma dos planos recorrentes ativos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Add Button */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterTier} onValueChange={(v) => setFilterTier(v as PlanTier | 'all')}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="bronze">Bronze</SelectItem>
              <SelectItem value="silver">Prata</SelectItem>
              <SelectItem value="gold">Ouro</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={(v) => setFilterType(v as PlanType | 'all')}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="recorrente">Recorrente</SelectItem>
              <SelectItem value="pontual">Pontual</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as 'all' | 'active' | 'inactive')}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      {/* Plans Grid */}
      {filteredPlans.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-medium text-muted-foreground">Nenhum plano encontrado</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {servicePlans.length === 0 
              ? 'Crie seu primeiro plano de serviços'
              : 'Tente ajustar os filtros'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlans.map(plan => (
            <PlanCard 
              key={plan.id} 
              plan={plan} 
              planItems={servicePlanItems.filter(item => item.plan_id === plan.id)}
              pricings={corporatePricings}
              onEdit={() => handleEdit(plan)}
            />
          ))}
        </div>
      )}

      <PlanForm 
        open={isFormOpen} 
        onOpenChange={handleCloseForm}
        editingPlan={editingPlan}
      />
    </div>
  );
}
