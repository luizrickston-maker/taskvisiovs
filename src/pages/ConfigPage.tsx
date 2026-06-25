import { useState, useEffect } from 'react';
import { Settings, Moon, Sun, Check, User, Building2, Clock, MessageCircle } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ConfigPage() {
  const { 
    personalAppName, 
    businessAppName, 
    defaultAvailableHours,
    theme, 
    setTheme, 
    updateAppName, 
    updateBusinessAppName,
    updateDefaultAvailableHours,
  } = useUserPreferences();
  
  const { data: userRole } = useUserRole();
  const isCollaborator = userRole === 'collaborator';
  
  const [newPersonalName, setNewPersonalName] = useState(personalAppName);
  const [newBusinessName, setNewBusinessName] = useState(businessAppName);
  const [newDefaultHours, setNewDefaultHours] = useState(String(defaultAvailableHours));
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [isSavingBusiness, setIsSavingBusiness] = useState(false);
  const [isSavingHours, setIsSavingHours] = useState(false);

  // WhatsApp do gestor para notificações de atualização de tarefas
  const [notifyWhatsapp, setNotifyWhatsapp] = useState('');
  const [isSavingNotify, setIsSavingNotify] = useState(false);

  useEffect(() => {
    if (isCollaborator) return;
    (async () => {
      const { data: wsId } = await supabase.rpc('get_my_workspace_id');
      if (!wsId) return;
      const { data } = await supabase
        .from('workspaces')
        .select('notify_whatsapp')
        .eq('id', wsId)
        .maybeSingle();
      if (data?.notify_whatsapp) setNotifyWhatsapp(data.notify_whatsapp);
    })();
  }, [isCollaborator]);

  const handleSaveNotifyWhatsapp = async () => {
    setIsSavingNotify(true);
    try {
      const { data: wsId } = await supabase.rpc('get_my_workspace_id');
      if (!wsId) {
        toast.error('Workspace não encontrado.');
        return;
      }
      const digits = notifyWhatsapp.replace(/\D/g, '') || null;
      const { error } = await supabase
        .from('workspaces')
        .update({ notify_whatsapp: digits })
        .eq('id', wsId);
      if (error) throw error;
      setNotifyWhatsapp(digits ?? '');
      toast.success('WhatsApp de notificações atualizado!');
    } catch {
      toast.error('Erro ao salvar o WhatsApp de notificações.');
    } finally {
      setIsSavingNotify(false);
    }
  };

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

  const handleSaveDefaultHours = async () => {
    const hours = parseInt(newDefaultHours);
    if (isNaN(hours) || hours < 1 || hours > 999) {
      toast.error('Informe um valor entre 1 e 999');
      return;
    }
    setIsSavingHours(true);
    await updateDefaultAvailableHours(hours);
    setIsSavingHours(false);
    toast.success('Horas padrão atualizadas!');
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
          {/* Personal App Name - Only visible for managers */}
          {!isCollaborator && (
            <>
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

              {/* WhatsApp do gestor para notificações de tarefas */}
              <div className="space-y-2">
                <Label htmlFor="notifyWhatsapp" className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                  WhatsApp para Notificações (Gestor)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="notifyWhatsapp"
                    type="tel"
                    inputMode="numeric"
                    value={notifyWhatsapp}
                    onChange={(e) => setNotifyWhatsapp(e.target.value)}
                    placeholder="Ex: 5511999999999 (DDI + DDD + número)"
                  />
                  <Button onClick={handleSaveNotifyWhatsapp} disabled={isSavingNotify}>
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Você recebe um aviso neste número sempre que um colaborador atualizar o status de uma tarefa (iniciar, concluir, reabrir), com a hora exata.
                </p>
              </div>
            </>
          )}

          {/* Default Available Hours */}
          <div className="space-y-2">
            <Label htmlFor="defaultHours" className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Horas Disponíveis Padrão (mensal)
            </Label>
            <div className="flex gap-2">
              <Input
                id="defaultHours"
                type="number"
                min={1}
                max={999}
                value={newDefaultHours}
                onChange={(e) => setNewDefaultHours(e.target.value)}
                placeholder="160"
              />
              <Button onClick={handleSaveDefaultHours} disabled={isSavingHours}>
                <Check className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Usado no Precificador para calcular o custo/hora quando não há equipe cadastrada.
            </p>
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label>Tema</Label>
            <div className="flex gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                onClick={() => setTheme('light')}
                className="flex-1"
              >
                <Sun className="w-4 h-4 mr-2" />
                Claro
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                onClick={() => setTheme('dark')}
                className="flex-1"
              >
                <Moon className="w-4 h-4 mr-2" />
                Escuro
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
