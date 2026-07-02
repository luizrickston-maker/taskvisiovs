import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Bell, Plus, Trash2, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Recipient {
  id: string;
  label: string;
  whatsapp: string;
  types: string[];
  is_active: boolean;
}

// Catálogo de tipos de notificação (estender aqui no futuro).
const NOTIFICATION_TYPES: { value: string; label: string }[] = [
  { value: 'financeiro', label: 'Financeiro (pagamentos de clientes)' },
  { value: 'tarefas', label: 'Tarefas (mudança de status)' },
  { value: 'agenda', label: 'Agenda (lembretes de compromisso)' },
];

export function NotificationRecipients() {
  const [wsId, setWsId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);

  const [label, setLabel] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async (workspaceId: string) => {
    const { data } = await supabase
      .from('notification_recipients')
      .select('id, label, whatsapp, types, is_active')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });
    setRecipients((data ?? []) as Recipient[]);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data: id } = await supabase.rpc('get_my_workspace_id');
      if (!id) { setLoading(false); return; }
      setWsId(id as string);
      await load(id as string);
    })();
  }, []);

  const toggleNewType = (t: string) =>
    setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const handleAdd = async () => {
    const nome = label.trim();
    const numero = whatsapp.replace(/\D/g, '');
    if (!nome || !numero) { toast.error('Informe nome e número.'); return; }
    if (types.length === 0) { toast.error('Selecione ao menos um tipo de notificação.'); return; }
    if (!wsId) { toast.error('Workspace não encontrado.'); return; }

    setSaving(true);
    const { error } = await supabase.from('notification_recipients')
      .insert({ workspace_id: wsId, label: nome, whatsapp: numero, types });
    setSaving(false);
    if (error) { toast.error('Erro ao adicionar destinatário.'); return; }
    setLabel(''); setWhatsapp(''); setTypes([]);
    toast.success('Destinatário adicionado!');
    load(wsId);
  };

  const toggleActive = async (r: Recipient) => {
    const { error } = await supabase.from('notification_recipients')
      .update({ is_active: !r.is_active }).eq('id', r.id);
    if (error) { toast.error('Erro ao atualizar.'); return; }
    setRecipients(prev => prev.map(x => x.id === r.id ? { ...x, is_active: !x.is_active } : x));
  };

  const toggleType = async (r: Recipient, t: string) => {
    const next = r.types.includes(t) ? r.types.filter(x => x !== t) : [...r.types, t];
    const { error } = await supabase.from('notification_recipients')
      .update({ types: next }).eq('id', r.id);
    if (error) { toast.error('Erro ao atualizar tipos.'); return; }
    setRecipients(prev => prev.map(x => x.id === r.id ? { ...x, types: next } : x));
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('notification_recipients').delete().eq('id', id);
    if (error) { toast.error('Erro ao remover.'); return; }
    setRecipients(prev => prev.filter(x => x.id !== id));
    toast.success('Destinatário removido.');
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Destinatários de Notificações
        </CardTitle>
        <CardDescription>
          Cadastre quem recebe cada tipo de notificação no WhatsApp. Um número pode receber vários tipos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Lista */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : recipients.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum destinatário cadastrado ainda.</p>
        ) : (
          <div className="space-y-3">
            {recipients.map(r => (
              <div key={r.id} className="rounded-lg border border-border p-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
                      {r.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.whatsapp}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(r.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {NOTIFICATION_TYPES.map(t => (
                    <label key={t.value} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox checked={r.types.includes(t.value)} onCheckedChange={() => toggleType(r, t.value)} />
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Adicionar */}
        <div className="rounded-lg border border-dashed border-border p-3 space-y-3">
          <p className="text-sm font-medium">Adicionar destinatário</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="nr-label" className="text-xs">Nome</Label>
              <Input id="nr-label" value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex: Financeiro João" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nr-num" className="text-xs">WhatsApp</Label>
              <Input id="nr-num" inputMode="numeric" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                placeholder="5575999999999 (DDI+DDD+número)" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {NOTIFICATION_TYPES.map(t => (
              <label key={t.value} className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox checked={types.includes(t.value)} onCheckedChange={() => toggleNewType(t.value)} />
                {t.label}
              </label>
            ))}
          </div>
          <Button onClick={handleAdd} disabled={saving} size="sm">
            <Plus className="w-4 h-4 mr-1" /> {saving ? 'Adicionando…' : 'Adicionar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}