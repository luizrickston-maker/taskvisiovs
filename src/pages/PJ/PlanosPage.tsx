import { Package } from 'lucide-react';
import { PlansManager } from '@/components/areapj/PlansManager';

export default function PlanosPage() {
  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Package className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold">Planos de Serviço</h1>
          <p className="text-sm text-muted-foreground">Gerencie pacotes e planos para clientes</p>
        </div>
      </div>

      <PlansManager />
    </div>
  );
}
