import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CalendarClock, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// "1, 3" -> [1,3] ; vazio -> []
function parseList(s: string): number[] {
  return s.split(/[,\s]+/).map(x => parseInt(x, 10)).filter(n => !isNaN(n) && n >= 0);
}

export function AgendaReminderSettings() {
  const [wsId, setWsId] = useState<string | null>(null);
  const [dias, setDias] = useState('');
  const [horas, setHoras] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: id } = await supabase.rpc('get_my_workspace_id');
      if (!id) return;
      setWsId(id as string);
      const { data } = await supabase.from('workspaces')
        .select('agenda_remind_days_before, agenda_remind_hours_before')
        .eq('id', id as string).maybeSingle();
      if (data) {
        setDias((data.agenda_remind_days_before ?? []).join(', '));
        setHoras((data.agenda_remind_hours_before ?? []).join(', '));
      }
    })();
  }, []);

  const save = async () => {
    if (!wsId) { toast.error('Workspace não encontrado.'); return; }
    setSaving(true);
    const { error } = await supabase.from('workspaces').update({
      agenda_remind_days_before: parseList(dias),
      agenda_remind_hours_before: parseList(horas),
    }).eq('id', wsId);
    setSaving(false);
    if (error) { toast.error('Erro ao salvar.'); return; }
    toast.success('Lembretes de agenda atualizados!');
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-primary" />
          Lembretes de Compromisso
        </CardTitle>
        <CardDescription>
          Quando avisar você (gestor) dos seus compromissos da Agenda. Deixe um campo vazio para desligar aquele modo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="ag-dias">Dias antes</Label>
            <Input id="ag-dias" inputMode="numeric" value={dias} onChange={e => setDias(e.target.value)}
              placeholder="Ex: 1  (ou 2, 1)" />
            <p className="text-[11px] text-muted-foreground">Aviso pela manhã. Vários: separe por vírgula.</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ag-horas">Horas antes</Label>
            <Input id="ag-horas" inputMode="numeric" value={horas} onChange={e => setHoras(e.target.value)}
              placeholder="Ex: 2  (ou 3, 1)" />
            <p className="text-[11px] text-muted-foreground">Aviso N horas antes do horário.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving}>
            <Check className="w-4 h-4 mr-1" /> {saving ? 'Salvando…' : 'Salvar'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Recebe quem estiver marcado como <strong>Agenda</strong> nos Destinatários abaixo.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}