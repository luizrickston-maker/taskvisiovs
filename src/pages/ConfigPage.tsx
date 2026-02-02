import { useState } from 'react';
import { Settings, Moon, Sun, Check, User, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { toast } from 'sonner';

export default function ConfigPage() {
  const { 
    personalAppName, 
    businessAppName, 
    theme, 
    setTheme, 
    updateAppName, 
    updateBusinessAppName 
  } = useUserPreferences();
  
  const [newPersonalName, setNewPersonalName] = useState(personalAppName);
  const [newBusinessName, setNewBusinessName] = useState(businessAppName);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [isSavingBusiness, setIsSavingBusiness] = useState(false);

  const handleSavePersonalName = async () => {
    if (!newPersonalName.trim()) return;
    setIsSavingPersonal(true);
    await updateAppName(newPersonalName.trim());
    setIsSavingPersonal(false);
    toast.success('Nome pessoal atualizado!');
  };

  const handleSaveBusinessName = async () => {
    if (!newBusinessName.trim()) return;
    setIsSavingBusiness(true);
    await updateBusinessAppName(newBusinessName.trim());
    setIsSavingBusiness(false);
    toast.success('Nome empresarial atualizado!');
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <Card className="glass-card animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Configurações
          </CardTitle>
          <CardDescription>Personalize seu aplicativo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Personal App Name */}
          <div className="space-y-2">
            <Label htmlFor="personalAppName" className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              Nome do Contexto Pessoal
            </Label>
            <div className="flex gap-2">
              <Input
                id="personalAppName"
                value={newPersonalName}
                onChange={(e) => setNewPersonalName(e.target.value)}
                placeholder="Ex: Luiz Rickston"
              />
              <Button onClick={handleSavePersonalName} disabled={isSavingPersonal}>
                <Check className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Este nome aparece quando você está no modo pessoal.
            </p>
          </div>

          {/* Business App Name */}
          <div className="space-y-2">
            <Label htmlFor="businessAppName" className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              Nome do Contexto Empresarial
            </Label>
            <div className="flex gap-2">
              <Input
                id="businessAppName"
                value={newBusinessName}
                onChange={(e) => setNewBusinessName(e.target.value)}
                placeholder="Ex: Chapada Digital"
              />
              <Button onClick={handleSaveBusinessName} disabled={isSavingBusiness}>
                <Check className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Este nome aparece quando você está no modo empresarial.
            </p>
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label>Tema</Label>
            <div className="flex gap-2">
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                onClick={() => setTheme('dark')}
                className="flex-1"
              >
                <Moon className="w-4 h-4 mr-2" />
                Escuro
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                onClick={() => setTheme('system')}
                className="flex-1"
              >
                <Sun className="w-4 h-4 mr-2" />
                Sistema
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              O tema é salvo apenas neste dispositivo.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
