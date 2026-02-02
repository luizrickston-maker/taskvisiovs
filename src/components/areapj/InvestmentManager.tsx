import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, TrendingDown, Trash2, Edit2, Package, Monitor, Sofa, Megaphone, MoreHorizontal } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { InvestmentForm } from './InvestmentForm';
import type { CorporateInvestment, InvestmentCategory } from '@/types/database';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const categoryConfig: Record<InvestmentCategory, { label: string; icon: React.ElementType; color: string }> = {
  equipamento: { label: 'Equipamento', icon: Package, color: 'bg-invest-equipment/10 text-invest-equipment border-invest-equipment/20' },
  software: { label: 'Software', icon: Monitor, color: 'bg-invest-software/10 text-invest-software border-invest-software/20' },
  mobilia: { label: 'Mobília', icon: Sofa, color: 'bg-invest-furniture/10 text-invest-furniture border-invest-furniture/20' },
  marketing: { label: 'Marketing', icon: Megaphone, color: 'bg-invest-marketing/10 text-invest-marketing border-invest-marketing/20' },
  outro: { label: 'Outro', icon: MoreHorizontal, color: 'bg-invest-other/10 text-invest-other border-invest-other/20' },
};

export function InvestmentManager() {
  const { user } = useAuthContext();
  const { corporateInvestments, addCorporateInvestment, updateCorporateInvestment, deleteCorporateInvestment } = useAppStore();
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<CorporateInvestment | null>(null);

  const totalInvested = useMemo(() => {
    return corporateInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  }, [corporateInvestments]);

  const byCategory = useMemo(() => {
    const result: Record<string, number> = {};
    corporateInvestments.forEach((inv) => {
      result[inv.category] = (result[inv.category] || 0) + inv.amount;
    });
    return result;
  }, [corporateInvestments]);

  const handleSave = async (data: Partial<CorporateInvestment>) => {
    if (!user) return;

    if (editingInvestment) {
      const { error } = await supabase
        .from('corporate_investments')
        .update(data)
        .eq('id', editingInvestment.id);

      if (error) {
        toast.error('Erro ao atualizar investimento');
      } else {
        updateCorporateInvestment(editingInvestment.id, data);
        toast.success('Investimento atualizado!');
      }
    } else {
      const { data: newData, error } = await supabase
        .from('corporate_investments')
        .insert({
          user_id: user.id,
          item_name: data.item_name || '',
          category: data.category || 'outro',
          amount: data.amount || 0,
          purchase_date: data.purchase_date || new Date().toISOString().split('T')[0],
          notes: data.notes,
        })
        .select()
        .single();

      if (error) {
        toast.error('Erro ao adicionar investimento');
      } else {
        addCorporateInvestment(newData as CorporateInvestment);
        toast.success('Investimento adicionado!');
      }
    }

    setFormOpen(false);
    setEditingInvestment(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('corporate_investments')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir investimento');
    } else {
      deleteCorporateInvestment(id);
      toast.success('Investimento excluído');
    }
  };

  const handleEdit = (investment: CorporateInvestment) => {
    setEditingInvestment(investment);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <TrendingDown className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Investido</p>
                <p className="text-xl font-bold text-destructive">
                  {formatCurrency(totalInvested)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {Object.entries(byCategory).slice(0, 3).map(([cat, value]) => {
          const config = categoryConfig[cat as InvestmentCategory];
          const Icon = config?.icon || MoreHorizontal;
          return (
            <Card key={cat} className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{config?.label || cat}</p>
                    <p className="text-lg font-semibold">{formatCurrency(value)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Lista de Investimentos */}
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base">Investimentos Registrados</CardTitle>
          <Button onClick={() => { setEditingInvestment(null); setFormOpen(true); }} className="w-full md:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Novo Investimento
          </Button>
        </CardHeader>
        <CardContent>
          {corporateInvestments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum investimento registrado ainda.
            </p>
          ) : (
            <>
              {/* Desktop: Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {corporateInvestments.map((investment) => {
                      const config = categoryConfig[investment.category];
                      return (
                        <TableRow key={investment.id}>
                          <TableCell className="font-medium">{investment.item_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={config?.color}>
                              {config?.label || investment.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-destructive">
                            {formatCurrency(investment.amount)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(investment.purchase_date), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {investment.notes || '-'}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-background border-border">
                                <DropdownMenuItem onClick={() => handleEdit(investment)}>
                                  <Edit2 className="w-4 h-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(investment.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2} className="font-semibold">Total</TableCell>
                      <TableCell className="text-right font-bold text-destructive">
                        {formatCurrency(totalInvested)}
                      </TableCell>
                      <TableCell colSpan={3}></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>

              {/* Mobile: Cards */}
              <div className="md:hidden space-y-3">
                {corporateInvestments.map((investment) => {
                  const config = categoryConfig[investment.category];
                  return (
                    <Card key={investment.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">{investment.item_name}</p>
                          <Badge variant="outline" className={`mt-1 ${config?.color}`}>
                            {config?.label || investment.category}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background border-border">
                            <DropdownMenuItem onClick={() => handleEdit(investment)}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(investment.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(investment.purchase_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                        <span className="font-bold text-destructive">
                          {formatCurrency(investment.amount)}
                        </span>
                      </div>
                      {investment.notes && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{investment.notes}</p>
                      )}
                    </Card>
                  );
                })}
                
                <Card className="p-4 bg-destructive/5 border-destructive/20">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Investido</span>
                    <span className="font-bold text-lg text-destructive">
                      {formatCurrency(totalInvested)}
                    </span>
                  </div>
                </Card>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <InvestmentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={handleSave}
        investment={editingInvestment}
      />
    </div>
  );
}
