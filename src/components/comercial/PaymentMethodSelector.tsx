import { useState, useEffect, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Banknote, QrCode, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { useAppStore } from '@/stores/useAppStore';
import type { PaymentMethod, PaymentMethodEntry, PaymentFeeSetting } from '@/types/database';

interface PaymentMethodSelectorProps {
  totalValue: number;
  selectedMethods: PaymentMethodEntry[];
  onChange: (methods: PaymentMethodEntry[]) => void;
}

const METHODS: { method: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { method: 'credito', label: 'Crédito', icon: <CreditCard className="w-4 h-4" /> },
  { method: 'debito', label: 'Débito', icon: <CreditCard className="w-4 h-4" /> },
  { method: 'pix', label: 'PIX', icon: <QrCode className="w-4 h-4" /> },
  { method: 'dinheiro', label: 'Dinheiro', icon: <Banknote className="w-4 h-4" /> },
  { method: 'boleto', label: 'Boleto', icon: <FileText className="w-4 h-4" /> },
];

function getInstallmentRate(ranges: Record<string, number> | undefined, installments: number): number {
  if (!ranges) return 0;
  
  if (installments === 1) return ranges["1"] || 0;
  if (installments >= 2 && installments <= 6) return ranges["2-6"] || 0;
  if (installments >= 7 && installments <= 12) return ranges["7-12"] || 0;
  
  return 0;
}

function calculateFee(method: PaymentMethod, value: number, installments: number, settings: PaymentFeeSetting[]): number {
  const setting = settings.find(s => s.method === method);
  if (!setting) return 0;
  
  switch (method) {
    case 'credito':
      const rate = getInstallmentRate(setting.installment_ranges as Record<string, number>, installments);
      return value * (rate / 100);
    case 'debito':
      return value * ((setting.fee_percent || 0) / 100);
    case 'pix':
      return value * ((setting.fee_percent || 0) / 100);
    case 'boleto':
      return setting.fee_fixed || 0;
    case 'dinheiro':
    default:
      return 0;
  }
}

export function PaymentMethodSelector({ totalValue, selectedMethods, onChange }: PaymentMethodSelectorProps) {
  const { paymentFeeSettings } = useAppStore();
  
  const isSelected = (method: PaymentMethod) => selectedMethods.some(m => m.method === method);
  const getEntry = (method: PaymentMethod) => selectedMethods.find(m => m.method === method);
  
  const handleToggle = (method: PaymentMethod, checked: boolean) => {
    if (checked) {
      // If single method, give it full value
      const newValue = selectedMethods.length === 0 ? totalValue : 0;
      const newEntry: PaymentMethodEntry = {
        method,
        value: newValue,
        installments: method === 'credito' ? 1 : undefined,
        fee: calculateFee(method, newValue, 1, paymentFeeSettings),
      };
      onChange([...selectedMethods, newEntry]);
    } else {
      onChange(selectedMethods.filter(m => m.method !== method));
    }
  };
  
  const handleValueChange = (method: PaymentMethod, value: number) => {
    const entry = getEntry(method);
    const installments = entry?.installments || 1;
    
    onChange(
      selectedMethods.map(m => 
        m.method === method 
          ? { ...m, value, fee: calculateFee(method, value, installments, paymentFeeSettings) }
          : m
      )
    );
  };
  
  const handleInstallmentsChange = (method: PaymentMethod, installments: number) => {
    const entry = getEntry(method);
    const value = entry?.value || 0;
    
    onChange(
      selectedMethods.map(m => 
        m.method === method 
          ? { ...m, installments, fee: calculateFee(method, value, installments, paymentFeeSettings) }
          : m
      )
    );
  };
  
  const totalAllocated = useMemo(() => 
    selectedMethods.reduce((sum, m) => sum + (m.value || 0), 0),
    [selectedMethods]
  );
  
  const totalFees = useMemo(() => 
    selectedMethods.reduce((sum, m) => sum + (m.fee || 0), 0),
    [selectedMethods]
  );
  
  const remaining = totalValue - totalAllocated;
  
  // Auto-fill remaining when only one method selected
  useEffect(() => {
    if (selectedMethods.length === 1 && remaining !== 0) {
      const method = selectedMethods[0].method;
      handleValueChange(method, totalValue);
    }
  }, [totalValue]);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Formas de Pagamento</Label>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {METHODS.map(({ method, label, icon }) => {
          const selected = isSelected(method);
          const entry = getEntry(method);
          const setting = paymentFeeSettings.find(s => s.method === method);
          
          return (
            <Card 
              key={method} 
              className={`cursor-pointer transition-colors ${selected ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'}`}
              onClick={() => handleToggle(method, !selected)}
            >
              <CardContent className="p-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selected}
                    onCheckedChange={(checked) => handleToggle(method, checked as boolean)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {icon}
                  <span className="text-xs font-medium">{label}</span>
                </div>
                
                {selected && (
                  <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={entry?.value || ''}
                      onChange={(e) => handleValueChange(method, parseFloat(e.target.value) || 0)}
                      placeholder="Valor"
                      className="h-7 text-xs"
                    />
                    
                    {method === 'credito' && (
                      <Select 
                        value={String(entry?.installments || 1)} 
                        onValueChange={(v) => handleInstallmentsChange(method, parseInt(v))}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                            <SelectItem key={n} value={String(n)}>
                              {n}x {n === 1 ? '(à vista)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    {entry?.fee && entry.fee > 0 && (
                      <p className="text-xs text-destructive">
                        Taxa: -{formatCurrency(entry.fee)}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {selectedMethods.length > 1 && (
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total alocado:</span>
            <span className={remaining !== 0 ? 'text-warning' : 'text-success'}>
              {formatCurrency(totalAllocated)}
            </span>
          </div>
          {remaining !== 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Restante:</span>
              <span className="text-warning">{formatCurrency(remaining)}</span>
            </div>
          )}
        </div>
      )}
      
      {totalFees > 0 && (
        <div className="bg-destructive/10 rounded-lg p-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Total de taxas:</span>
            <span className="text-destructive font-medium">-{formatCurrency(totalFees)}</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-muted-foreground">Valor líquido:</span>
            <span className="font-medium">{formatCurrency(totalAllocated - totalFees)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
