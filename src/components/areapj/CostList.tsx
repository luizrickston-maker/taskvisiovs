import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, Search, Trash2, Edit2, DollarSign, TrendingDown, 
  RefreshCcw, Calendar, Users 
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';
import { CostForm } from './CostForm';
import type { CorporateCost, CorporateCostType } from '@/types/database';

const COST_TYPE_LABELS: Record<CorporateCostType, string> = {
  recorrente: 'Recorrente',
  fixo: 'Fixo',
  pontual: 'Pontual',
};

const COST_TYPE_COLORS: Record<CorporateCostType, string> = {
  recorrente: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  fixo: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  pontual: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
};

export function CostList() {
  const { corporateCosts, corporateCostCategories, corporateTeam, updateCorporateCost, deleteCorporateCost } = useAppStore();
  
  const [showForm, setShowForm] = useState(false);
  const [editingCost, setEditingCost] = useState<CorporateCost | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('active');

  // Calculate totals with proper frequency normalization
  const summary = useMemo(() => {
    const activeCosts = corporateCosts.filter(c => c.is_active);
    
    // Calculate monthly equivalent for recurring costs based on frequency
    const monthlyRecurring = activeCosts
      .filter(c => c.cost_type === 'recorrente')
      .reduce((sum, c) => {
        switch (c.frequency) {
          case 'diario': return sum + c.amount * 30;
          case 'semanal': return sum + c.amount * 4.33;
          case 'anual': return sum + c.amount / 12;
          default: return sum + c.amount; // mensal
        }
      }, 0);
    
    const monthlyFixed = activeCosts
      .filter(c => c.cost_type === 'fixo')
      .reduce((sum, c) => sum + c.amount, 0);
    
    // Team cost including CLT encargos
    const teamCost = corporateTeam
      .filter(m => m.is_active)
      .reduce((sum, m) => {
        if (m.contract_type === 'clt') {
          const encargos = m.cost * 0.7;
          const benefits = m.clt_benefits || 0;
          return sum + m.cost + encargos + benefits;
        }
        return sum + m.cost;
      }, 0);

    const totalMonthly = monthlyRecurring + monthlyFixed + teamCost;

    return {
      monthlyRecurring,
      monthlyFixed,
      teamCost,
      totalMonthly,
    };
  }, [corporateCosts, corporateTeam]);

  // Filter costs
  const filteredCosts = useMemo(() => {
    return corporateCosts.filter(cost => {
      const matchesSearch = cost.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === 'all' || cost.cost_type === filterType;
      const matchesCategory = filterCategory === 'all' || 
        (filterCategory === 'none' ? !cost.category_id : cost.category_id === filterCategory);
      const matchesActive = filterActive === 'all' || 
        (filterActive === 'active' ? cost.is_active : !cost.is_active);
      
      return matchesSearch && matchesType && matchesCategory && matchesActive;
    });
  }, [corporateCosts, search, filterType, filterCategory, filterActive]);

  const getCategoryById = (id: string | undefined) => {
    if (!id) return null;
    return corporateCostCategories.find(c => c.id === id);
  };

  const handleToggleActive = async (cost: CorporateCost) => {
    const { error } = await supabase
      .from('corporate_costs')
      .update({ is_active: !cost.is_active })
      .eq('id', cost.id);

    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      updateCorporateCost(cost.id, { is_active: !cost.is_active });
      toast.success(cost.is_active ? 'Custo desativado' : 'Custo ativado');
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('corporate_costs')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir custo');
    } else {
      deleteCorporateCost(id);
      toast.success('Custo excluído');
    }
  };

  const handleEdit = (cost: CorporateCost) => {
    setEditingCost(cost);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Custo Mensal Total</p>
                <p className="text-lg font-bold">{formatCurrency(summary.totalMonthly)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <RefreshCcw className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recorrentes</p>
                <p className="text-lg font-bold text-blue-500">{formatCurrency(summary.monthlyRecurring)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Calendar className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fixos</p>
                <p className="text-lg font-bold text-purple-500">{formatCurrency(summary.monthlyFixed)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Equipe</p>
                <p className="text-lg font-bold text-green-500">{formatCurrency(summary.teamCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Add Button */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-primary" />
              Custos Operacionais
            </CardTitle>
            <Button onClick={() => { setEditingCost(null); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Custo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="recorrente">Recorrente</SelectItem>
                <SelectItem value="fixo">Fixo</SelectItem>
                <SelectItem value="pontual">Pontual</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                <SelectItem value="none">Sem categoria</SelectItem>
                {corporateCostCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cost List */}
          {filteredCosts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum custo encontrado.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredCosts.map((cost) => {
                const category = getCategoryById(cost.category_id);
                return (
                  <div
                    key={cost.id}
                    className={`p-4 rounded-lg border ${
                      cost.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{cost.name}</span>
                          <Badge variant="outline" className={COST_TYPE_COLORS[cost.cost_type]}>
                            {COST_TYPE_LABELS[cost.cost_type]}
                          </Badge>
                          {category && (
                            <Badge 
                              variant="outline"
                              style={{ 
                                backgroundColor: `${category.color}15`,
                                color: category.color,
                                borderColor: `${category.color}30`
                              }}
                            >
                              {category.name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground text-lg">
                            {formatCurrency(cost.amount)}
                          </span>
                          {cost.cost_type === 'recorrente' && cost.frequency && (
                            <span>/ {cost.frequency}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={cost.is_active}
                          onCheckedChange={() => handleToggleActive(cost)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(cost)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(cost.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {cost.notes && (
                      <p className="text-xs text-muted-foreground mt-2">{cost.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <CostForm
        open={showForm}
        onOpenChange={setShowForm}
        editingCost={editingCost}
      />
    </div>
  );
}
