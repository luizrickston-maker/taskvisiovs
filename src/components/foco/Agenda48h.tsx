import { useState } from 'react';
import { Calendar, CheckCircle, Plus, Trash2, Settings2, Palette } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const defaultTypes = [
  { value: 'cash', label: 'Caixa', color: '#22c55e' },
  { value: 'client', label: 'Cliente', color: '#3b82f6' },
  { value: 'project', label: 'Projeto', color: '#8b5cf6' },
];

const colorOptions = [
  '#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

export default function Agenda48h() {
  const [open, setOpen] = useState(false);
  const [typesOpen, setTypesOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [type, setType] = useState<string>('project');
  const [color, setColor] = useState('#6366f1');
  
  // Type manager state
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#6366f1');

  const { 
    timeBlocks, addTimeBlock, updateTimeBlock, deleteTimeBlock,
    customTimeBlockTypes, addCustomTimeBlockType, deleteCustomTimeBlockType 
  } = useAppStore();

  const today = new Date();
  const tomorrow = addDays(today, 1);
  const todayStr = format(today, 'yyyy-MM-dd');
  const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

  // Filter only non-completed blocks for 48h view
  const todayBlocks = timeBlocks
    .filter(b => b.date === todayStr && !b.completed)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const tomorrowBlocks = timeBlocks
    .filter(b => b.date === tomorrowStr && !b.completed)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  // Combine default and custom types - ensure all values are strings
  const allTypes = [
    ...defaultTypes,
    ...customTimeBlockTypes.map(t => ({ value: t.id, label: t.name, color: t.color || '#6366f1' }))
  ];

  const getTypeInfo = (typeValue: string) => {
    const found = allTypes.find(t => t.value === typeValue);
    return found || { label: typeValue, color: '#6b7280' };
  };

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
        color,
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

  const handleCompleteBlock = async (blockId: string) => {
    const { error } = await supabase
      .from('time_blocks')
      .update({ completed: true })
      .eq('id', blockId);

    if (error) {
      toast.error('Erro ao concluir bloco');
      return;
    }

    updateTimeBlock(blockId, { completed: true });
    toast.success('Compromisso concluído!');
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

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('time_block_types')
      .insert({
        user_id: user.id,
        name: newTypeName.trim(),
        color: newTypeColor
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar tipo');
      return;
    }

    addCustomTimeBlockType(data as any);
    setNewTypeName('');
    toast.success('Tipo criado!');
  };

  const handleDeleteType = async (typeId: string) => {
    const { error } = await supabase
      .from('time_block_types')
      .delete()
      .eq('id', typeId);

    if (error) {
      toast.error('Erro ao excluir tipo');
      return;
    }

    deleteCustomTimeBlockType(typeId);
  };

  const getBlockStyle = (block: typeof timeBlocks[0]) => {
    const blockColor = block.color || getTypeInfo(block.type).color;
    return {
      backgroundColor: `${blockColor}20`,
      borderColor: `${blockColor}50`,
    } as React.CSSProperties;
  };

  const renderDayBlocks = (blocks: typeof timeBlocks, dayLabel: string) => (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">{dayLabel}</h3>
      {blocks.length === 0 ? (
        <p className="text-xs text-muted-foreground/60 text-center py-2">
          Nenhum bloco pendente
        </p>
      ) : (
        <div className="space-y-2">
          {blocks.map((block) => {
            const typeInfo = getTypeInfo(block.type);
            return (
              <div
                key={block.id}
                className="flex items-center gap-3 p-3 rounded-lg border transition-all"
                style={getBlockStyle(block)}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0 text-success hover:bg-success/20"
                  onClick={() => handleCompleteBlock(block.id)}
                  title="Concluir compromisso"
                >
                  <CheckCircle className="w-4 h-4" />
                </Button>
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: block.color || typeInfo.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {block.title}
                  </p>
                  <p className="text-xs opacity-70">
                    {block.start_time} - {block.end_time} • {typeInfo.label}
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
            );
          })}
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
          <div className="ml-auto flex gap-1">
            {/* Type Manager */}
            <Dialog open={typesOpen} onOpenChange={setTypesOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings2 className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Gerenciar Tipos de Compromisso</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <form onSubmit={handleAddType} className="flex gap-2">
                    <Input
                      placeholder="Nome do tipo"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      className="flex-1"
                    />
                    <div className="flex gap-1">
                      {colorOptions.slice(0, 5).map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={cn(
                            "w-6 h-6 rounded-full transition-all",
                            newTypeColor === c && "ring-2 ring-offset-2 ring-offset-background ring-primary"
                          )}
                          style={{ backgroundColor: c }}
                          onClick={() => setNewTypeColor(c)}
                        />
                      ))}
                    </div>
                    <Button type="submit" size="icon">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </form>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Tipos Padrão</p>
                    {defaultTypes.map((t) => (
                      <div key={t.value} className="flex items-center gap-3 p-2 rounded bg-muted/30">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: t.color }}
                        />
                        <span className="flex-1 text-sm">{t.label}</span>
                        <span className="text-xs text-muted-foreground">Padrão</span>
                      </div>
                    ))}
                  </div>

                  {customTimeBlockTypes.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Meus Tipos</p>
                      {customTimeBlockTypes.map((t) => (
                        <div key={t.id} className="flex items-center gap-3 p-2 rounded bg-muted/30">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: t.color }}
                          />
                          <span className="flex-1 text-sm">{t.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleDeleteType(t.id)}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Add Block */}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
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
                      <Select value={type} onValueChange={setType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allTypes.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: t.color }}
                                />
                                {t.label}
                              </div>
                            </SelectItem>
                          ))}
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
                  
                  {/* Color Picker */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Cor do Compromisso
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={cn(
                            "w-8 h-8 rounded-full transition-all",
                            color === c && "ring-2 ring-offset-2 ring-offset-background ring-primary"
                          )}
                          style={{ backgroundColor: c }}
                          onClick={() => setColor(c)}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={!title.trim()}>
                    Criar Bloco
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderDayBlocks(todayBlocks, `Hoje - ${format(today, 'EEEE, dd/MM', { locale: ptBR })}`)}
        {renderDayBlocks(tomorrowBlocks, `Amanhã - ${format(tomorrow, 'EEEE, dd/MM', { locale: ptBR })}`)}
      </CardContent>
    </Card>
  );
}