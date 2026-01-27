import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calculator, DollarSign, Percent, TrendingUp, Save, Trash2 } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency, formatPercent } from '@/lib/currency';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CorporatePricing } from '@/types/database';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function PricingCalculator() {
  const { user } = useAuthContext();
  const { corporatePricings, addCorporatePricing, deleteCorporatePricing } = useAppStore();
  
  const [itemName, setItemName] = useState('');
  const [cost, setCost] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [marginPercent, setMarginPercent] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Cálculos em tempo real
  const calculations = useMemo(() => {
    const costValue = parseFloat(cost) || 0;
    const taxValue = parseFloat(taxRate) || 0;
    const marginValue = parseFloat(marginPercent) || 0;

    const custoComImpostos = costValue * (1 + taxValue / 100);
    const precoFinal = custoComImpostos * (1 + marginValue / 100);
    const lucroLiquido = precoFinal - custoComImpostos;
    const margemReal = precoFinal > 0 ? (lucroLiquido / precoFinal) * 100 : 0;

    return {
      finalPrice: precoFinal,
      profit: lucroLiquido,
      realMargin: margemReal,
    };
  }, [cost, taxRate, marginPercent]);

  const handleSave = async () => {
    if (!user || !itemName.trim()) {
      toast.error('Preencha o nome do produto/serviço');
      return;
    }

    setSaving(true);
    
    const newPricing = {
      user_id: user.id,
      item_name: itemName.trim(),
      cost: parseFloat(cost) || 0,
      tax_rate: parseFloat(taxRate) || 0,
      margin_percent: parseFloat(marginPercent) || 0,
      final_price: calculations.finalPrice,
      profit: calculations.profit,
      real_margin: calculations.realMargin,
      notes: notes.trim() || null,
    };

    const { data, error } = await supabase
      .from('corporate_pricing')
      .insert(newPricing)
      .select()
      .single();

    if (error) {
      toast.error('Erro ao salvar precificação');
      console.error(error);
    } else {
      addCorporatePricing(data as CorporatePricing);
      toast.success('Precificação salva com sucesso!');
      // Reset form
      setItemName('');
      setCost('');
      setTaxRate('');
      setMarginPercent('');
      setNotes('');
    }
    
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('corporate_pricing')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir precificação');
    } else {
      deleteCorporatePricing(id);
      toast.success('Precificação excluída');
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulário e Cards de Resumo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Formulário */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="w-5 h-5 text-primary" />
              Calcular Preço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="itemName">Nome do Produto/Serviço</Label>
                <Input
                  id="itemName"
                  placeholder="Ex: Consultoria de Marketing"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cost">Custo (R$)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="taxRate">Impostos (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="marginPercent">Margem Desejada (%)</Label>
                <Input
                  id="marginPercent"
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={marginPercent}
                  onChange={(e) => setMarginPercent(e.target.value)}
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Notas adicionais..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            
            <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Precificação'}
            </Button>
          </CardContent>
        </Card>

        {/* Cards de KPI */}
        <div className="space-y-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Preço Sugerido</p>
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(calculations.finalPrice)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lucro Líquido</p>
                  <p className="text-xl font-bold text-green-500">
                    {formatCurrency(calculations.profit)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Percent className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Margem Real</p>
                  <p className="text-xl font-bold text-blue-500">
                    {formatPercent(calculations.realMargin)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Histórico de Precificações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Precificações</CardTitle>
        </CardHeader>
        <CardContent>
          {corporatePricings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma precificação salva ainda.
            </p>
          ) : (
            <>
              {/* Desktop: Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead className="text-right">Impostos</TableHead>
                      <TableHead className="text-right">Margem</TableHead>
                      <TableHead className="text-right">Preço Final</TableHead>
                      <TableHead className="text-right">Lucro</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {corporatePricings.map((pricing) => (
                      <TableRow key={pricing.id}>
                        <TableCell className="font-medium">{pricing.item_name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(pricing.cost)}</TableCell>
                        <TableCell className="text-right">{formatPercent(pricing.tax_rate)}</TableCell>
                        <TableCell className="text-right">{formatPercent(pricing.margin_percent)}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {formatCurrency(pricing.final_price)}
                        </TableCell>
                        <TableCell className="text-right text-green-500">
                          {formatCurrency(pricing.profit)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(pricing.created_at), 'dd/MM/yy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(pricing.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: Cards */}
              <div className="md:hidden space-y-3">
                {corporatePricings.map((pricing) => (
                  <Card key={pricing.id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold">{pricing.item_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(pricing.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(pricing.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Custo:</span>
                        <span className="ml-1">{formatCurrency(pricing.cost)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Impostos:</span>
                        <span className="ml-1">{formatPercent(pricing.tax_rate)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Preço:</span>
                        <span className="ml-1 font-semibold text-primary">{formatCurrency(pricing.final_price)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Lucro:</span>
                        <span className="ml-1 text-green-500">{formatCurrency(pricing.profit)}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
