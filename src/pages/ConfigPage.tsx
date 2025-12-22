import { useState } from 'react';
import { Settings, Moon, Sun, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { toast } from 'sonner';

export default function ConfigPage() {
  const { appName, theme, setTheme, updateAppName } = useUserPreferences();
  const [newAppName, setNewAppName] = useState(appName);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAppName = async () => {
    if (!newAppName.trim()) return;
    setIsSaving(true);
    await updateAppName(newAppName.trim());
    setIsSaving(false);
    toast.success('Nome atualizado!');
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
          {/* App Name */}
          <div className="space-y-2">
            <Label htmlFor="appName">Nome do Aplicativo</Label>
            <div className="flex gap-2">
              <Input
                id="appName"
                value={newAppName}
                onChange={(e) => setNewAppName(e.target.value)}
                placeholder="Flow Control"
              />
              <Button onClick={handleSaveAppName} disabled={isSaving}>
                <Check className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Este nome será sincronizado em todos os seus dispositivos.
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
