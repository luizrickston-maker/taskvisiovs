import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, parseCurrency } from '@/lib/currency';
import type { CorporatePricing } from '@/types/database';
import { Package } from 'lucide-react';

interface SelectedItem {
  pricing_id: string;
  quantity: number;
  custom_price: number | null;
}

interface PlanItemSelectorProps {
  pricings: CorporatePricing[];
  selectedItems: SelectedItem[];
  onChange: (items: SelectedItem[]) => void;
}

export const PlanItemSelector = React.forwardRef<HTMLDivElement, PlanItemSelectorProps>(
  function PlanItemSelector({ pricings, selectedItems, onChange }, ref) {
  const isSelected = (pricingId: string) => selectedItems.some(i => i.pricing_id === pricingId);
  
  const getItem = (pricingId: string) => selectedItems.find(i => i.pricing_id === pricingId);

  const handleToggle = (pricingId: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedItems, { pricing_id: pricingId, quantity: 1, custom_price: null }]);
    } else {
      onChange(selectedItems.filter(i => i.pricing_id !== pricingId));
    }
  };

  const handleQuantityChange = (pricingId: string, quantity: number) => {
    onChange(
      selectedItems.map(i => 
        i.pricing_id === pricingId ? { ...i, quantity: Math.max(1, quantity) } : i
      )
    );
  };

  const handleCustomPriceChange = (pricingId: string, value: string) => {
    const price = value ? parseCurrency(value) : null;
    onChange(
      selectedItems.map(i => 
        i.pricing_id === pricingId ? { ...i, custom_price: price } : i
      )
    );
  };

  if (pricings.length === 0) {
    return (
      <div ref={ref} className="text-center py-8 border rounded-lg">
        <Package className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">
          Nenhum serviço cadastrado no precificador.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Adicione serviços na aba "Precificador" primeiro.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Selecione os serviços que compõem este plano:
      </p>
      
      <div className="border rounded-lg divide-y max-h-[250px] overflow-y-auto">
        {pricings.map(pricing => {
          const selected = isSelected(pricing.id);
          const item = getItem(pricing.id);

          return (
            <div key={pricing.id} className="p-3 hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                <Checkbox
                  id={`pricing-${pricing.id}`}
                  checked={selected}
                  onCheckedChange={(checked) => handleToggle(pricing.id, checked as boolean)}
                  className="mt-0.5"
                />
                
                <div className="flex-1 min-w-0">
                  <Label 
                    htmlFor={`pricing-${pricing.id}`} 
                    className="font-medium cursor-pointer block truncate"
                  >
                    {pricing.item_name}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Preço original: {formatCurrency(pricing.final_price)}
                  </p>
                  
                  {selected && (
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Qtd:</Label>
                        <Input
                          type="number"
                          min={1}
                          value={item?.quantity || 1}
                          onChange={(e) => handleQuantityChange(pricing.id, parseInt(e.target.value) || 1)}
                          className="w-16 h-7 text-xs"
                        />
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Preço:</Label>
                        <Input
                          value={item?.custom_price !== null ? formatCurrency(item.custom_price!) : ''}
                          onChange={(e) => handleCustomPriceChange(pricing.id, e.target.value)}
                          placeholder={formatCurrency(pricing.final_price)}
                          className="w-24 h-7 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {selectedItems.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selectedItems.length} serviço(s) selecionado(s)
        </p>
      )}
    </div>
  );
});
