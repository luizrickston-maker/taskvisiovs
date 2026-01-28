import { Calculator } from 'lucide-react';
import { PricingCalculator } from '@/components/areapj/PricingCalculator';

export default function PrecificadorPage() {
  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Calculator className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold">Precificador</h1>
          <p className="text-sm text-muted-foreground">Calcule preços e margens de lucro</p>
        </div>
      </div>

      <PricingCalculator />
    </div>
  );
}
