import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calculator, DollarSign, Percent, TrendingUp, Save, Trash2, Clock, HelpCircle, Building2 } from 'lucide-react';
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
  const { 
    corporatePricings, 
    addCorporatePricing, 
    deleteCorporatePricing,
    corporateCosts,
    corporateTeam,
    corporateInvestments,
  } = useAppStore();
  
  const [itemName, setItemName] = useState('');
  const [cost, setCost] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [marginPercent, setMarginPercent] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [useOperationalCost, setUseOperationalCost] = useState(false);
  const [chargedPrice, setChargedPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Format input as time H:MM while typing (clock-style mask)
  const formatTimeInput = (value: string): string => {
    // Remove everything that's not a digit
    const digits = value.replace(/\D/g, '');
    
    if (digits.length === 0) return '';
    
    // If 1-2 digits, they are hours
    if (digits.length <= 2) {
      return digits;
    }
    
    // If 3+ digits, separate hours and minutes
    const hours = digits.slice(0, -2);
    let minutes = digits.slice(-2);
    
    // Limit minutes to 59
    if (parseInt(minutes) > 59) {
      minutes = '59';
    }
    
    // Limit hours to 999
    const hoursNum = parseInt(hours);
    const limitedHours = hoursNum > 999 ? '999' : hours;
    
    return `${limitedHours}:${minutes}`;
  };

  // Helper function to parse time string (H:MM or decimal) to hours
  const parseTimeToHours = (timeStr: string): number => {
    if (!timeStr || timeStr.trim() === '') return 0;
    
    // If contains ":", parse as H:MM
    if (timeStr.includes(':')) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const h = isNaN(hours) ? 0 : hours;
      const m = isNaN(minutes) ? 0 : Math.min(minutes, 59);
      return h + (m / 60);
    }
    
    // If only digits (while typing), treat as hours
    if (/^\d+$/.test(timeStr)) {
      return parseFloat(timeStr) || 0;
    }
    
    // Fallback for decimal with comma
    const parsed = parseFloat(timeStr.replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  };

  // Helper function to format hours for display
  const formatHoursDisplay = (timeStr: string): string => {
    const hours = parseTimeToHours(timeStr);
    if (hours === 0) return '0h';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}h`;
    return `${h}h${m.toString().padStart(2, '0')}min`;
  };

  // Calculate operational cost per hour
  const operationalData = useMemo(() => {
    // Team costs (including CLT encargos)
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

    // Total hours available from team
    const totalHoursAvailable = corporateTeam
      .filter(m => m.is_active)
      .reduce((sum, m) => sum + (m.hours_available || 160), 0);

    // Recurring/Fixed costs (monthly)
    const activeCosts = corporateCosts.filter(c => c.is_active);
    
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

    // Monthly depreciation from investments
    const monthlyDepreciation = corporateInvestments
      .filter(inv => inv.useful_life_months && inv.useful_life_months > 0)
      .reduce((sum, inv) => sum + (inv.amount / inv.useful_life_months!), 0);

    const totalMonthlyCost = teamCost + monthlyRecurring + monthlyFixed + monthlyDepreciation;
    const costPerHour = totalHoursAvailable > 0 ? totalMonthlyCost / totalHoursAvailable : 0;

    return {
      teamCost,
      totalHoursAvailable,
      monthlyRecurring,
      monthlyFixed,
      monthlyDepreciation,
      totalMonthlyCost,
      costPerHour,
    };
  }, [corporateCosts, corporateTeam, corporateInvestments]);

  // Pricing calculations
  const calculations = useMemo(() => {
    const costValue = parseFloat(cost) || 0;
    const taxValue = parseFloat(taxRate) || 0;
    const marginValue = parseFloat(marginPercent) || 0;
    const hours = parseTimeToHours(estimatedHours);

    // Calculate operational cost based on hours
    const operationalCostForService = useOperationalCost && hours > 0 
      ? hours * operationalData.costPerHour 
      : 0;

    const totalCost = costValue + operationalCostForService;
    const custoComImpostos = totalCost * (1 + taxValue / 100);
    const precoFinal = custoComImpostos * (1 + marginValue / 100);
    const lucroLiquido = precoFinal - custoComImpostos;
    const margemReal = precoFinal > 0 ? (lucroLiquido / precoFinal) * 100 : 0;

    // Charged price calculations
    const chargedValue = parseFloat(chargedPrice) || 0;
    const chargedProfit = chargedValue > 0 ? chargedValue - custoComImpostos : lucroLiquido;
    const chargedMargin = chargedValue > 0 && chargedValue !== 0 
      ? (chargedProfit / chargedValue) * 100 
      : margemReal;
    const priceDifference = chargedValue > 0 ? chargedValue - precoFinal : 0;

    return {
      directCost: costValue,
      operationalCost: operationalCostForService,
      totalCost,
      taxAmount: totalCost * (taxValue / 100),
      finalPrice: precoFinal,
      profit: lucroLiquido,
      realMargin: margemReal,
      chargedValue,
      chargedProfit,
      chargedMargin,
      priceDifference,
    };
  }, [cost, taxRate, marginPercent, estimatedHours, useOperationalCost, operationalData.costPerHour, chargedPrice]);

  const handleSave = async () => {
    if (!user || !itemName.trim()) {
      toast.error('Preencha o nome do produto/serviço');
      return;
    }

    setSaving(true);
    
    const newPricing = {
      user_id: user.id,
      item_name: itemName.trim(),
      cost: calculations.totalCost, // Save total cost including operational
      tax_rate: parseFloat(taxRate) || 0,
      margin_percent: parseFloat(marginPercent) || 0,
      final_price: calculations.finalPrice,
      profit: calculations.chargedValue > 0 ? calculations.chargedProfit : calculations.profit,
      real_margin: calculations.chargedValue > 0 ? calculations.chargedMargin : calculations.realMargin,
      charged_price: calculations.chargedValue > 0 ? calculations.chargedValue : null,
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
      setEstimatedHours('');
      setUseOperationalCost(false);
      setChargedPrice('');
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
      {/* Operational Cost Summary */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Custo Operacional da Empresa
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-sm">
                    Soma de todos os custos fixos, recorrentes, equipe e depreciação 
                    de ativos dividido pelas horas disponíveis da equipe.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Custo Mensal Total</p>
              <p className="font-semibold">{formatCurrency(operationalData.totalMonthlyCost)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Horas Disponíveis</p>
              <p className="font-semibold">{operationalData.totalHoursAvailable}h/mês</p>
            </div>
            <div className="col-span-2 md:col-span-2">
              <p className="text-muted-foreground">Custo por Hora da Operação</p>
              <p className="font-bold text-primary text-lg">{formatCurrency(operationalData.costPerHour)}/h</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                <Label htmlFor="cost">Custo Direto (R$)</Label>
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
                <div className="flex items-center gap-1">
                  <Label htmlFor="estimatedHours">Horas Estimadas</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-sm">
                          Tempo necessário para executar o serviço.
                          Use formato H:MM (ex: 1:30) ou decimal (ex: 1.5).
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="estimatedHours"
                  type="text"
                  placeholder="1:30"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(formatTimeInput(e.target.value))}
                  maxLength={6}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="useOperationalCost">Incluir custo operacional proporcional</Label>
                  </div>
                  <Switch
                    id="useOperationalCost"
                    checked={useOperationalCost}
                    onCheckedChange={setUseOperationalCost}
                  />
                </div>
                {useOperationalCost && parseTimeToHours(estimatedHours) > 0 && (
                  <p className="text-sm text-muted-foreground">
                    + {formatCurrency(calculations.operationalCost)} ({formatHoursDisplay(estimatedHours)} × {formatCurrency(operationalData.costPerHour)}/h)
                  </p>
                )}
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
              
              <div className="space-y-2">
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

              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="chargedPrice">Valor Cobrado (R$)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-sm">
                          Opcional. Informe o valor que você realmente vai cobrar 
                          para calcular o lucro e margem reais.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="chargedPrice"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={chargedPrice}
                  onChange={(e) => setChargedPrice(e.target.value)}
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

            {/* Cost Breakdown */}
            {(parseFloat(cost) > 0 || calculations.operationalCost > 0) && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custo Direto:</span>
                  <span>{formatCurrency(calculations.directCost)}</span>
                </div>
                {useOperationalCost && calculations.operationalCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Custo Operacional ({formatHoursDisplay(estimatedHours)}):</span>
                    <span>{formatCurrency(calculations.operationalCost)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium border-t pt-1 mt-1">
                  <span>Custo Total:</span>
                  <span>{formatCurrency(calculations.totalCost)}</span>
                </div>
                {parseFloat(taxRate) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Impostos ({taxRate}%):</span>
                    <span>{formatCurrency(calculations.taxAmount)}</span>
                  </div>
                )}
              </div>
            )}
            
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
              {calculations.chargedValue > 0 && (
                <div className="mt-3 pt-3 border-t border-primary/20">
                  <p className="text-xs text-muted-foreground">Valor Cobrado</p>
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(calculations.chargedValue)}
                  </p>
                  <p className={`text-xs font-medium ${calculations.priceDifference >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {calculations.priceDifference >= 0 ? '+' : ''}{formatCurrency(calculations.priceDifference)} {calculations.priceDifference >= 0 ? 'acima' : 'abaixo'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {calculations.chargedValue > 0 ? 'Lucro Real' : 'Lucro Líquido'}
                  </p>
                  <p className="text-xl font-bold text-success">
                    {formatCurrency(calculations.chargedValue > 0 ? calculations.chargedProfit : calculations.profit)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-kpi-projects/5 border-kpi-projects/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-kpi-projects/10">
                  <Percent className="w-5 h-5 text-kpi-projects" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Margem Real</p>
                  <p className="text-xl font-bold text-kpi-projects">
                    {formatPercent(calculations.chargedValue > 0 ? calculations.chargedMargin : calculations.realMargin)}
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
                      <TableHead className="text-right">Preço Sugerido</TableHead>
                      <TableHead className="text-right">Valor Cobrado</TableHead>
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
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(pricing.final_price)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {pricing.charged_price ? formatCurrency(pricing.charged_price) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-success">
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
                        <span className="text-muted-foreground">Sugerido:</span>
                        <span className="ml-1 text-muted-foreground">{formatCurrency(pricing.final_price)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cobrado:</span>
                        <span className="ml-1 font-semibold text-primary">
                          {pricing.charged_price ? formatCurrency(pricing.charged_price) : '-'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Lucro:</span>
                        <span className="ml-1 text-success">{formatCurrency(pricing.profit)}</span>
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
