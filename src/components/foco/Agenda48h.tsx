import { useState } from 'react';
import { Calendar, Clock, Plus, Check, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { TimeBlockType } from '@/types/database';

const timeBlockColors: Record<TimeBlockType, string> = {
  cash: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
  client: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
  project: 'bg-purple-500/20 border-purple-500/50 text-purple-400',
};

const timeBlockLabels: Record<TimeBlockType, string> = {
  cash: 'Caixa',
  client: 'Cliente',
  project: 'Projeto',
};

export default function Agenda48h() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [type, setType] = useState<TimeBlockType>('project');

  const { timeBlocks, addTimeBlock, updateTimeBlock, deleteTimeBlock } = useAppStore();

  const today = new Date();
  const tomorrow = addDays(today, 1);
  const todayStr = format(today, 'yyyy-MM-dd');
  const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

  const todayBlocks = timeBlocks
    .filter(b => b.date === todayStr)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const tomorrowBlocks = timeBlocks
    .filter(b => b.date === tomorrowStr)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('time_blocks')
      .insert({
        user_id: user.id,
        title: title.trim(),
        date,
        start_time: startTime,
        end_time: endTime,
        type,
        completed: false
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar bloco');
      return;
    }

    addTimeBlock(data as any);
    setTitle('');
    setOpen(false);
    toast.success('Bloco criado!');
  };

  const handleToggleComplete = async (blockId: string, currentCompleted: boolean) => {
    const { error } = await supabase
      .from('time_blocks')
      .update({ completed: !currentCompleted })
      .eq('id', blockId);

    if (error) {
      toast.error('Erro ao atualizar bloco');
      return;
    }

    updateTimeBlock(blockId, { completed: !currentCompleted });
  };

  const handleDelete = async (blockId: string) => {
    const { error } = await supabase
      .from('time_blocks')
      .delete()
      .eq('id', blockId);

    if (error) {
      toast.error('Erro ao excluir bloco');
      return;
    }

    deleteTimeBlock(blockId);
  };

  const renderDayBlocks = (blocks: typeof timeBlocks, dayLabel: string) => (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">{dayLabel}</h3>
      {blocks.length === 0 ? (
        <p className="text-xs text-muted-foreground/60 text-center py-2">
          Nenhum bloco agendado
        </p>
      ) : (
        <div className="space-y-2">
          {blocks.map((block) => (
            <div
              key={block.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                timeBlockColors[block.type as TimeBlockType],
                block.completed && "opacity-50"
              )}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => handleToggleComplete(block.id, block.completed)}
              >
                {block.completed ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </Button>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium truncate",
                  block.completed && "line-through"
                )}>
                  {block.title}
                </p>
                <p className="text-xs opacity-70">
                  {block.start_time} - {block.end_time} • {timeBlockLabels[block.type as TimeBlockType]}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0 opacity-50 hover:opacity-100"
                onClick={() => handleDelete(block.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Card className="glass-card h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="w-5 h-5 text-primary" />
          Agenda 48h
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-auto h-8 w-8">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Bloco de Tempo</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddBlock} className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    placeholder="O que você vai fazer?"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Select value={date} onValueChange={setDate}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={todayStr}>
                          Hoje ({format(today, 'dd/MM', { locale: ptBR })})
                        </SelectItem>
                        <SelectItem value={tomorrowStr}>
                          Amanhã ({format(tomorrow, 'dd/MM', { locale: ptBR })})
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={type} onValueChange={(v) => setType(v as TimeBlockType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Caixa</SelectItem>
                        <SelectItem value="client">Cliente</SelectItem>
                        <SelectItem value="project">Projeto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Início</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={!title.trim()}>
                  Criar Bloco
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderDayBlocks(todayBlocks, `Hoje - ${format(today, 'EEEE, dd/MM', { locale: ptBR })}`)}
        {renderDayBlocks(tomorrowBlocks, `Amanhã - ${format(tomorrow, 'EEEE, dd/MM', { locale: ptBR })}`)}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 pt-2 border-t border-border/50">
          {Object.entries(timeBlockLabels).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={cn(
                "w-3 h-3 rounded-full",
                key === 'cash' && "bg-emerald-500",
                key === 'client' && "bg-blue-500",
                key === 'project' && "bg-purple-500"
              )} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
