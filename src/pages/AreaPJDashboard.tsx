import { Building2, Calculator, TrendingUp, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PricingCalculator } from '@/components/areapj/PricingCalculator';
import { InvestmentManager } from '@/components/areapj/InvestmentManager';
import { TeamManager } from '@/components/areapj/TeamManager';

export default function AreaPJDashboard() {
  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Building2 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold">Área PJ</h1>
          <p className="text-sm text-muted-foreground">Gestão financeira e operacional da empresa</p>
        </div>
      </div>

      <Tabs defaultValue="pricing" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full md:w-auto md:inline-grid">
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            <span className="hidden sm:inline">Precificador</span>
          </TabsTrigger>
          <TabsTrigger value="investments" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Investimentos</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Time</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="space-y-4">
          <PricingCalculator />
        </TabsContent>
        
        <TabsContent value="investments" className="space-y-4">
          <InvestmentManager />
        </TabsContent>
        
        <TabsContent value="team" className="space-y-4">
          <TeamManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
