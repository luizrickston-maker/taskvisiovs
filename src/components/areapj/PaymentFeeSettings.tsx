import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppStore } from '@/stores/useAppStore';
import { toast } from 'sonner';
import { CreditCard, Banknote, QrCode, Wallet, FileText, Save, Loader2 } from 'lucide-react';
import type { PaymentFeeSetting, PaymentMethod } from '@/types/database';

const PAYMENT_METHODS: { method: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { method: 'credito', label: 'Cartão de Crédito', icon: <CreditCard className="w-5 h-5" /> },
  { method: 'debito', label: 'Cartão de Débito', icon: <CreditCard className="w-5 h-5" /> },
  { method: 'pix', label: 'PIX', icon: <QrCode className="w-5 h-5" /> },
  { method: 'dinheiro', label: 'Dinheiro', icon: <Banknote className="w-5 h-5" /> },
  { method: 'boleto', label: 'Boleto', icon: <FileText className="w-5 h-5" /> },
];

const DEFAULT_SETTINGS: Record<PaymentMethod, Partial<PaymentFeeSetting>> = {
  credito: { fee_percent: 2.99, receiving_days: 30, installment_ranges: { "1": 2.99, "2-6": 3.49, "7-12": 4.49 } },
  debito: { fee_percent: 1.29, receiving_days: 1 },
  pix: { fee_percent: 0, discount_percent: 0, receiving_days: 0 },
  dinheiro: { fee_percent: 0, discount_percent: 0, receiving_days: 0 },
  boleto: { fee_fixed: 3.50, receiving_days: 3 },
};

export function PaymentFeeSettings() {
  const { user } = useAuthContext();
  const { paymentFeeSettings, setPaymentFeeSettings, addPaymentFeeSetting, updatePaymentFeeSetting } = useAppStore();
  const [localSettings, setLocalSettings] = useState<Record<PaymentMethod, Partial<PaymentFeeSetting>>>({} as any);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Initialize local settings from store or defaults
    const settings: Record<PaymentMethod, Partial<PaymentFeeSetting>> = {} as any;
    
    PAYMENT_METHODS.forEach(({ method }) => {
      const existing = paymentFeeSettings.find(s => s.method === method);
      if (existing) {
        settings[method] = existing;
      } else {
        settings[method] = { ...DEFAULT_SETTINGS[method], method, is_active: true };
      }
    });
    
    setLocalSettings(settings);
  }, [paymentFeeSettings]);

  const handleChange = (method: PaymentMethod, field: keyof PaymentFeeSetting, value: PaymentFeeSetting[keyof PaymentFeeSetting]) => {
    setLocalSettings(prev => ({
      ...prev,
      [method]: { ...prev[method], [field]: value }
    }));
  };

  const handleInstallmentRangeChange = (method: PaymentMethod, range: string, value: number) => {
    setLocalSettings(prev => ({
      ...prev,
      [method]: {
        ...prev[method],
        installment_ranges: {
          ...(prev[method]?.installment_ranges || {}),
          [range]: value
        }
      }
    }));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    setIsSaving(true);
    
    try {
      for (const method of Object.keys(localSettings) as PaymentMethod[]) {
        const setting = localSettings[method];
        const existing = paymentFeeSettings.find(s => s.method === method);
        
        if (existing) {
          // Update
          const { error } = await supabase
            .from('payment_fee_settings')
            .update({
              fee_percent: setting.fee_percent || 0,
              fee_fixed: setting.fee_fixed || 0,
              discount_percent: setting.discount_percent || 0,
              installment_ranges: setting.installment_ranges || null,
              receiving_days: setting.receiving_days || 0,
              is_active: setting.is_active ?? true,
            })
            .eq('id', existing.id);
            
          if (error) throw error;
          updatePaymentFeeSetting(existing.id, setting);
        } else {
          // Insert
          const { data, error } = await supabase
            .from('payment_fee_settings')
            .insert({
              user_id: user.id,
              method,
              fee_percent: setting.fee_percent || 0,
              fee_fixed: setting.fee_fixed || 0,
              discount_percent: setting.discount_percent || 0,
              installment_ranges: setting.installment_ranges || null,
              receiving_days: setting.receiving_days || 0,
              is_active: setting.is_active ?? true,
            })
            .select()
            .single();
            
          if (error) throw error;
          if (data) addPaymentFeeSetting(data as PaymentFeeSetting);
        }
      }
      
      toast.success('Taxas salvas com sucesso!');
    } catch (error) {
      console.error('Error saving payment fee settings:', error);
      toast.error('Erro ao salvar taxas');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Taxas de Formas de Pagamento</h3>
          <p className="text-sm text-muted-foreground">
            Configure as taxas que sua empresa paga por forma de pagamento
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PAYMENT_METHODS.map(({ method, label, icon }) => {
          const setting = localSettings[method] || {};
          
          return (
            <Card key={method} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {icon}
                    {label}
                  </CardTitle>
                  <Switch
                    checked={setting.is_active ?? true}
                    onCheckedChange={(checked) => handleChange(method, 'is_active', checked)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {method === 'credito' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Taxa à vista (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={setting.installment_ranges?.["1"] ?? 2.99}
                          onChange={(e) => handleInstallmentRangeChange(method, "1", parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Taxa 2-6x (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={setting.installment_ranges?.["2-6"] ?? 3.49}
                          onChange={(e) => handleInstallmentRangeChange(method, "2-6", parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Taxa 7-12x (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={setting.installment_ranges?.["7-12"] ?? 4.49}
                          onChange={(e) => handleInstallmentRangeChange(method, "7-12", parseFloat(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Prazo (dias)</Label>
                        <Input
                          type="number"
                          value={setting.receiving_days ?? 30}
                          onChange={(e) => handleChange(method, 'receiving_days', parseInt(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                    </div>
                  </>
                )}
                
                {method === 'debito' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Taxa (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={setting.fee_percent ?? 1.29}
                        onChange={(e) => handleChange(method, 'fee_percent', parseFloat(e.target.value) || 0)}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Prazo (dias)</Label>
                      <Input
                        type="number"
                        value={setting.receiving_days ?? 1}
                        onChange={(e) => handleChange(method, 'receiving_days', parseInt(e.target.value) || 0)}
                        className="h-8"
                      />
                    </div>
                  </div>
                )}
                
                {method === 'pix' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Taxa (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={setting.fee_percent ?? 0}
                        onChange={(e) => handleChange(method, 'fee_percent', parseFloat(e.target.value) || 0)}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Desconto sugerido (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={setting.discount_percent ?? 0}
                        onChange={(e) => handleChange(method, 'discount_percent', parseFloat(e.target.value) || 0)}
                        className="h-8"
                      />
                    </div>
                  </div>
                )}
                
                {method === 'dinheiro' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Desconto sugerido (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={setting.discount_percent ?? 0}
                      onChange={(e) => handleChange(method, 'discount_percent', parseFloat(e.target.value) || 0)}
                      className="h-8"
                    />
                  </div>
                )}
                
                {method === 'boleto' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Taxa fixa (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={setting.fee_fixed ?? 3.50}
                        onChange={(e) => handleChange(method, 'fee_fixed', parseFloat(e.target.value) || 0)}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Prazo (dias)</Label>
                      <Input
                        type="number"
                        value={setting.receiving_days ?? 3}
                        onChange={(e) => handleChange(method, 'receiving_days', parseInt(e.target.value) || 0)}
                        className="h-8"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
