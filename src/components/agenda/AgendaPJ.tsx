import { useState, useMemo, useCallback } from 'react';
import {
  format, addDays, subDays, startOfWeek, endOfWeek,
  eachDayOfInterval, isToday, addWeeks, subWeeks,
  startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, isSameDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarClock, ChevronLeft, ChevronRight, Plus,
  Edit2, Trash2, AlertTriangle, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useTimeBlocks, useCreateTimeBlock, useUpdateTimeBlock, useDeleteTimeBlock,
  hasConflict, timeToMinutes,
} from '@/hooks/useAgendaPJ';
import type { TimeBlock } from '@/types/database';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const HOUR_HEIGHT = 56;
const START_HOUR = 7;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const CONTAINER_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;

export const APPOINTMENT_TYPES = [
  { value: 'reuniao',  label: 'Reunião',   color: '#3b82f6' },
  { value: 'cliente',  label: 'Cliente',   color: '#8b5cf6' },
  { value: 'projeto',  label: 'Projeto',   color: '#22c55e' },
  { value: 'tarefa',   label: 'Tarefa',    color: '#f59e0b' },
  { value: 'ligacao',  label: 'Ligação',   color: '#06b6d4' },
  { value: 'pessoal',  label: 'Pessoal',   color: '#ec4899' },
  { value: 'outros',   label: 'Outros',    color: '#6b7280' },
];

const TIME_OPTIONS: string[] = [];
for (let m = START_HOUR * 60; m <= END_HOUR * 60; m += 30) {
  TIME_OPTIONS.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
}

const HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getTypeConf(type: string) {
  return APPOINTMENT_TYPES.find(t => t.value === type) ?? APPOINTMENT_TYPES[APPOINTMENT_TYPES.length - 1];
}

function addMinutes(time: string, min: number): string {
  const total = Math.min(timeToMinutes(time) + min, END_HOUR * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

interface FormState {
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  type: string;
  color: string;
}

type ViewType = 'day' | 'week' | 'month';

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export function AgendaPJ() {
  const [view, setView] = useState<ViewType>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TimeBlock | null>(null);
  // delete confirmation lives at the top level — avoids Popover/AlertDialog conflict
  const [deletingBlock, setDeletingBlock] = useState<TimeBlock | null>(null);
  const [form, setForm] = useState<FormState>({
    title: '', date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00', end_time: '10:00',
    type: 'reuniao', color: '#3b82f6',
  });

  const weekStart  = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd    = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays   = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const monthStart = startOfMonth(selectedDate);
  const monthEnd   = endOfMonth(selectedDate);

  const dateFrom = view === 'day'  ? format(selectedDate, 'yyyy-MM-dd')
                 : view === 'week' ? format(weekStart,    'yyyy-MM-dd')
                 :                   format(monthStart,   'yyyy-MM-dd');
  const dateTo   = view === 'day'  ? format(selectedDate, 'yyyy-MM-dd')
                 : view === 'week' ? format(weekEnd,      'yyyy-MM-dd')
                 :                   format(monthEnd,     'yyyy-MM-dd');

  const { data: blocks = [] } = useTimeBlocks(dateFrom, dateTo);
  const createMut = useCreateTimeBlock();
  const updateMut = useUpdateTimeBlock();
  const deleteMut = useDeleteTimeBlock();

  const blocksForDate = useCallback((d: Date) => {
    const s = format(d, 'yyyy-MM-dd');
    return blocks.filter(b => b.date === s).sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [blocks]);

  const formConflicts = useMemo(() => {
    if (!form.start_time || !form.end_time) return [];
    if (timeToMinutes(form.end_time) <= timeToMinutes(form.start_time)) return [];
    return blocks.filter(b =>
      b.date === form.date &&
      b.id !== editing?.id &&
      hasConflict({ ...form, id: editing?.id }, b)
    );
  }, [form, blocks, editing]);

  function goToToday() {
    setSelectedDate(new Date());
    setView('day');
  }

  function openAdd(date?: Date, startTime?: string) {
    setEditing(null);
    const d = date ?? selectedDate;
    const start = startTime ?? '09:00';
    setForm({
      title: '', date: format(d, 'yyyy-MM-dd'),
      start_time: start, end_time: addMinutes(start, 60),
      type: 'reuniao', color: '#3b82f6',
    });
    setFormOpen(true);
  }

  function openEdit(block: TimeBlock) {
    setEditing(block);
    setForm({
      title: block.title, date: block.date,
      start_time: block.start_time, end_time: block.end_time,
      type: block.type, color: block.color ?? '#3b82f6',
    });
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (timeToMinutes(form.end_time) <= timeToMinutes(form.start_time)) {
      toast.error('Horário fim deve ser após o início');
      return;
    }
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, ...form });
    } else {
      await createMut.mutateAsync(form);
    }
    setFormOpen(false);
  }

  async function confirmDelete() {
    if (!deletingBlock) return;
    deleteMut.mutate(deletingBlock.id);
    setDeletingBlock(null);
  }

  const goToPrev = () => {
    if (view === 'day')  setSelectedDate(d => subDays(d, 1));
    else if (view === 'week') setSelectedDate(d => subWeeks(d, 1));
    else                 setSelectedDate(d => subMonths(d, 1));
  };
  const goToNext = () => {
    if (view === 'day')  setSelectedDate(d => addDays(d, 1));
    else if (view === 'week') setSelectedDate(d => addWeeks(d, 1));
    else                 setSelectedDate(d => addMonths(d, 1));
  };

  const periodLabel = view === 'day'
    ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })
    : view === 'week'
    ? `${format(weekStart, "d MMM", { locale: ptBR })} – ${format(weekEnd, "d MMM", { locale: ptBR })}`
    : format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR });

  const VIEW_LABELS: Record<ViewType, { full: string; short: string }> = {
    day:   { full: 'Dia',    short: 'Dia' },
    week:  { full: 'Semana', short: 'Sem' },
    month: { full: 'Mês',    short: 'Mês' },
  };

  return (
    <>
      <Card className="glass-card">
        <CardContent className="p-3 md:p-5 space-y-3 md:space-y-4">

          {/* ── Header ── */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarClock className="w-4 h-4 md:w-5 md:h-5 text-primary shrink-0" />
              <span className="font-semibold capitalize text-sm md:text-base truncate">{periodLabel}</span>
            </div>

            <div className="flex items-center gap-1 md:gap-1.5 flex-wrap shrink-0">
              {/* View toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                {(['day', 'week', 'month'] as ViewType[]).map((v, i) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn(
                      'px-2 md:px-3 py-1.5 font-medium transition-colors',
                      i > 0 && 'border-l border-border',
                      view === v ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground',
                    )}
                  >
                    <span className="hidden sm:inline">{VIEW_LABELS[v].full}</span>
                    <span className="sm:hidden">{VIEW_LABELS[v].short}</span>
                  </button>
                ))}
              </div>

              <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={goToToday}>
                Hoje
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrev}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNext}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" className="h-8 md:h-7 gap-1.5 text-xs px-3" onClick={() => openAdd()}>
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Novo</span>
              </Button>
            </div>
          </div>

          {/* ── Views ── */}
          {view === 'day' && (
            <AgendaDayView
              date={selectedDate}
              blocks={blocksForDate(selectedDate)}
              allBlocks={blocks}
              onAddAt={(t) => openAdd(selectedDate, t)}
              onEdit={openEdit}
              onRequestDelete={setDeletingBlock}
            />
          )}
          {view === 'week' && (
            <AgendaWeekView
              days={weekDays}
              blocksForDate={blocksForDate}
              allBlocks={blocks}
              onDaySelect={(d) => { setSelectedDate(d); setView('day'); }}
              onAddAt={(d, t) => openAdd(d, t)}
              onEdit={openEdit}
              onRequestDelete={setDeletingBlock}
            />
          )}
          {view === 'month' && (
            <AgendaMonthView
              selectedDate={selectedDate}
              blocksForDate={blocksForDate}
              onDaySelect={(d) => { setSelectedDate(d); setView('day'); }}
              onAddAt={(d) => openAdd(d)}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Appointment Form ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm mx-4 md:mx-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Compromisso' : 'Novo Compromisso'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formConflicts.length > 0 && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-sm min-w-0">
                  <p className="font-medium text-amber-600 dark:text-amber-400">Conflito de horário</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {formConflicts.map(c => `"${c.title}" ${c.start_time}–${c.end_time}`).join(' · ')}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="apt-title">Título *</Label>
              <Input
                id="apt-title" value={form.title} required autoFocus
                placeholder="Ex: Reunião com cliente"
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input
                  type="date" value={form.date} required
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => {
                  const tc = getTypeConf(v);
                  setForm(f => ({ ...f, type: v, color: tc.color }));
                }}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color }} />
                          {t.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Início</Label>
                <Select value={form.start_time} onValueChange={v => setForm(f => ({ ...f, start_time: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-52">
                    {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fim</Label>
                <Select value={form.end_time} onValueChange={v => setForm(f => ({ ...f, end_time: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-52">
                    {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={createMut.isPending || updateMut.isPending}>
                {editing ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation — rendered OUTSIDE Card/Popover hierarchy ── */}
      <AlertDialog open={!!deletingBlock} onOpenChange={(open) => { if (!open) setDeletingBlock(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover compromisso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O compromisso "{deletingBlock?.title}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─────────────────────────────────────────────
// Month View
// ─────────────────────────────────────────────

interface MonthViewProps {
  selectedDate: Date;
  blocksForDate: (d: Date) => TimeBlock[];
  onDaySelect: (d: Date) => void;
  onAddAt: (d: Date) => void;
}

function AgendaMonthView({ selectedDate, blocksForDate, onDaySelect, onAddAt }: MonthViewProps) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd   = endOfMonth(selectedDate);
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd    = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const allDays    = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weekLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  return (
    <div className="rounded-lg border border-border/30 overflow-hidden">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-border/30 bg-muted/30">
        {weekLabels.map(d => (
          <div key={d} className="py-2 text-center text-[10px] md:text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d[0]}</span>
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {allDays.map((day, idx) => {
          const dayBlocks = blocksForDate(day);
          const isCurrentMonth = isSameMonth(day, selectedDate);
          const today = isToday(day);
          const isSelected = isSameDay(day, selectedDate);
          const MAX_VISIBLE = 2;
          const overflow = dayBlocks.length - MAX_VISIBLE;

          return (
            <div
              key={idx}
              className={cn(
                'min-h-[72px] md:min-h-[90px] p-1 md:p-1.5 border-b border-r border-border/20 cursor-pointer group transition-colors',
                !isCurrentMonth && 'bg-muted/20',
                today && 'bg-primary/5',
                isSelected && !today && 'bg-accent/30',
                'hover:bg-accent/20 active:bg-accent/40',
              )}
              onClick={() => onDaySelect(day)}
            >
              <div className="flex items-center justify-between mb-0.5 md:mb-1">
                <span className={cn(
                  'inline-flex w-5 h-5 md:w-6 md:h-6 items-center justify-center rounded-full text-[11px] md:text-xs font-semibold',
                  today ? 'bg-primary text-primary-foreground' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/40',
                )}>
                  {format(day, 'd')}
                </span>
                {isCurrentMonth && (
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity touch-manipulation"
                    onClick={e => { e.stopPropagation(); onAddAt(day); }}
                    title="Adicionar compromisso"
                  >
                    <Plus className="w-3 h-3 md:w-3.5 md:h-3.5 text-primary" />
                  </button>
                )}
              </div>

              <div className="space-y-0.5">
                {dayBlocks.slice(0, MAX_VISIBLE).map(block => {
                  const tc = getTypeConf(block.type);
                  return (
                    <div
                      key={block.id}
                      className="truncate rounded px-1 py-0.5 text-[9px] md:text-[10px] font-medium text-white leading-tight"
                      style={{ background: block.color ?? tc.color }}
                    >
                      <span className="hidden sm:inline opacity-80 mr-0.5">{block.start_time} </span>
                      {block.title}
                    </div>
                  );
                })}
                {overflow > 0 && (
                  <div className="text-[9px] md:text-[10px] text-muted-foreground font-medium px-0.5">
                    +{overflow}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend — hidden on mobile to save space */}
      <div className="hidden sm:flex px-3 py-2 border-t border-border/30 bg-muted/20 flex-wrap gap-3">
        {APPOINTMENT_TYPES.map(t => (
          <div key={t.value} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
            <span className="text-[10px] text-muted-foreground">{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Day Timeline View
// ─────────────────────────────────────────────

interface DayViewProps {
  date: Date;
  blocks: TimeBlock[];
  allBlocks: TimeBlock[];
  onAddAt: (startTime: string) => void;
  onEdit: (b: TimeBlock) => void;
  onRequestDelete: (b: TimeBlock) => void;
}

function AgendaDayView({ date, blocks, allBlocks, onAddAt, onEdit, onRequestDelete }: DayViewProps) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((nowMin - START_HOUR * 60) / (TOTAL_HOURS * 60)) * 100;
  const showNow = isToday(date) && nowMin > START_HOUR * 60 && nowMin < END_HOUR * 60;

  function handleBgClick(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('[data-event]')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalMin = START_HOUR * 60 + Math.floor((y / CONTAINER_HEIGHT) * TOTAL_HOURS * 60);
    const rounded = Math.floor(totalMin / 30) * 30;
    onAddAt(`${String(Math.floor(rounded / 60)).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`);
  }

  return (
    <div className="overflow-y-auto rounded-lg border border-border/30" style={{ maxHeight: 'min(520px, 65vh)' }}>
      <div className="flex" style={{ minHeight: CONTAINER_HEIGHT }}>
        {/* Hour labels */}
        <div className="w-12 shrink-0 relative select-none" style={{ height: CONTAINER_HEIGHT }}>
          {HOURS.map(h => (
            <div
              key={h}
              className="absolute right-2 text-[10px] text-muted-foreground/60 leading-none"
              style={{ top: `${((h - START_HOUR) / TOTAL_HOURS) * 100}%`, transform: 'translateY(-50%)' }}
            >
              {String(h).padStart(2, '0')}h
            </div>
          ))}
        </div>

        {/* Timeline area */}
        <div
          className="flex-1 relative border-l border-border/30 cursor-pointer"
          style={{ height: CONTAINER_HEIGHT }}
          onClick={handleBgClick}
        >
          {HOURS.map(h => (
            <div key={h} className="absolute w-full border-t border-border/25"
              style={{ top: `${((h - START_HOUR) / TOTAL_HOURS) * 100}%` }} />
          ))}
          {HOURS.slice(0, -1).map(h => (
            <div key={`hh-${h}`} className="absolute w-full border-t border-dashed border-border/10"
              style={{ top: `${((h - START_HOUR + 0.5) / TOTAL_HOURS) * 100}%` }} />
          ))}

          {/* Now line */}
          {showNow && (
            <div className="absolute w-full flex items-center z-20 pointer-events-none" style={{ top: `${nowTop}%` }}>
              <div className="w-2.5 h-2.5 rounded-full bg-primary -ml-1.5 shrink-0" />
              <div className="flex-1 h-px bg-primary" />
            </div>
          )}

          {/* Events */}
          {blocks.map(block => {
            const startMin  = timeToMinutes(block.start_time) - START_HOUR * 60;
            const duration  = timeToMinutes(block.end_time) - timeToMinutes(block.start_time);
            const topPct    = Math.max(0, (startMin / (TOTAL_HOURS * 60)) * 100);
            const heightPct = Math.max(1.8, (duration / (TOTAL_HOURS * 60)) * 100);
            const tc        = getTypeConf(block.type);
            const conflicted = allBlocks.some(b => b.id !== block.id && hasConflict(block, b));

            return (
              <Popover key={block.id}>
                <PopoverTrigger asChild>
                  <div
                    data-event
                    className={cn(
                      'absolute left-1 right-1 rounded-md px-2 py-1 text-white text-[11px] cursor-pointer z-10',
                      'hover:brightness-110 active:brightness-95 transition-all shadow-sm overflow-hidden select-none',
                      conflicted && 'ring-2 ring-destructive/70 ring-offset-1',
                    )}
                    style={{
                      top: `${topPct}%`,
                      height: `${heightPct}%`,
                      minHeight: 28,
                      background: block.color ?? tc.color,
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex items-start gap-1 overflow-hidden h-full">
                      {conflicted && <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 opacity-90" />}
                      <div className="min-w-0">
                        <p className="font-semibold leading-tight truncate">{block.title}</p>
                        {duration >= 30 && (
                          <p className="opacity-80 text-[10px] leading-tight">{block.start_time}–{block.end_time}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="start"
                  sideOffset={6}
                  alignOffset={-4}
                  avoidCollisions
                  collisionPadding={12}
                  className="w-[min(224px,calc(100vw-24px))] p-3 z-30"
                  onClick={e => e.stopPropagation()}
                >
                  <EventPopoverContent
                    block={block}
                    conflicted={conflicted}
                    onEdit={onEdit}
                    onRequestDelete={onRequestDelete}
                  />
                </PopoverContent>
              </Popover>
            );
          })}

          {blocks.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
              <p className="text-xs text-muted-foreground/50">Nenhum compromisso</p>
              <p className="text-[10px] text-muted-foreground/35 hidden md:block">Toque na timeline para adicionar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Week View
// ─────────────────────────────────────────────

interface WeekViewProps {
  days: Date[];
  blocksForDate: (d: Date) => TimeBlock[];
  allBlocks: TimeBlock[];
  onDaySelect: (d: Date) => void;
  onAddAt: (d: Date, time: string) => void;
  onEdit: (b: TimeBlock) => void;
  onRequestDelete: (b: TimeBlock) => void;
}

function AgendaWeekView({ days, blocksForDate, allBlocks, onDaySelect, onAddAt, onEdit, onRequestDelete }: WeekViewProps) {
  function handleColClick(day: Date, e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('[data-event]')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalMin = START_HOUR * 60 + Math.floor((y / CONTAINER_HEIGHT) * TOTAL_HOURS * 60);
    const rounded = Math.floor(totalMin / 30) * 30;
    onAddAt(day, `${String(Math.floor(rounded / 60)).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`);
  }

  return (
    <div className="overflow-auto rounded-lg border border-border/30" style={{ maxHeight: 'min(520px, 65vh)' }}>
      <div className="flex min-w-[400px]">
        {/* Hour labels */}
        <div className="w-10 shrink-0 relative bg-card sticky left-0 z-10" style={{ height: CONTAINER_HEIGHT + 32 }}>
          <div className="h-8 border-b border-border/30" />
          <div className="relative" style={{ height: CONTAINER_HEIGHT }}>
            {HOURS.map(h => (
              <div
                key={h}
                className="absolute right-1 text-[9px] text-muted-foreground/60 leading-none select-none"
                style={{ top: `${((h - START_HOUR) / TOTAL_HOURS) * 100}%`, transform: 'translateY(-50%)' }}
              >
                {String(h).padStart(2, '0')}h
              </div>
            ))}
          </div>
        </div>

        {/* Day columns */}
        {days.map(day => {
          const dayBlocks = blocksForDate(day);
          const today = isToday(day);
          return (
            <div key={day.toISOString()} className="flex-1 min-w-[52px] border-l border-border/25 flex flex-col">
              <div
                className={cn(
                  'h-8 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors border-b border-border/30 sticky top-0 bg-card z-10 shrink-0',
                  today && 'bg-primary/5',
                )}
                onClick={() => onDaySelect(day)}
              >
                <span className="text-[9px] md:text-[10px] text-muted-foreground font-medium capitalize">
                  {format(day, 'EEE', { locale: ptBR })}
                </span>
                <span className={cn('text-xs font-bold leading-tight', today ? 'text-primary' : 'text-foreground')}>
                  {format(day, 'd')}
                </span>
              </div>

              <div
                className="relative cursor-pointer"
                style={{ height: CONTAINER_HEIGHT }}
                onClick={(e) => handleColClick(day, e)}
              >
                {HOURS.map(h => (
                  <div key={h} className="absolute w-full border-t border-border/15"
                    style={{ top: `${((h - START_HOUR) / TOTAL_HOURS) * 100}%` }} />
                ))}
                {dayBlocks.map(block => {
                  const startMin  = timeToMinutes(block.start_time) - START_HOUR * 60;
                  const duration  = timeToMinutes(block.end_time) - timeToMinutes(block.start_time);
                  const topPct    = Math.max(0, (startMin / (TOTAL_HOURS * 60)) * 100);
                  const heightPct = Math.max(1.8, (duration / (TOTAL_HOURS * 60)) * 100);
                  const tc        = getTypeConf(block.type);
                  const conflicted = allBlocks.some(b => b.id !== block.id && hasConflict(block, b));

                  return (
                    <Popover key={block.id}>
                      <PopoverTrigger asChild>
                        <div
                          data-event
                          className={cn(
                            'absolute left-0.5 right-0.5 rounded px-1 text-white text-[9px] cursor-pointer z-10',
                            'hover:brightness-110 active:brightness-95 transition-all shadow-sm overflow-hidden select-none',
                            conflicted && 'ring-1 ring-destructive',
                          )}
                          style={{
                            top: `${topPct}%`,
                            height: `${heightPct}%`,
                            minHeight: 20,
                            background: block.color ?? tc.color,
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          <p className="font-medium truncate leading-tight">{block.title}</p>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent
                        side="bottom"
                        align="center"
                        sideOffset={6}
                        avoidCollisions
                        collisionPadding={12}
                        className="w-[min(208px,calc(100vw-24px))] p-3 z-30"
                        onClick={e => e.stopPropagation()}
                      >
                        <EventPopoverContent
                          block={block}
                          conflicted={conflicted}
                          onEdit={onEdit}
                          onRequestDelete={onRequestDelete}
                        />
                      </PopoverContent>
                    </Popover>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Event Popover Content
// ─────────────────────────────────────────────

interface EventPopoverContentProps {
  block: TimeBlock;
  conflicted: boolean;
  onEdit: (b: TimeBlock) => void;
  onRequestDelete: (b: TimeBlock) => void;
}

function EventPopoverContent({ block, conflicted, onEdit, onRequestDelete }: EventPopoverContentProps) {
  const tc = getTypeConf(block.type);
  return (
    <div className="space-y-2" onClick={e => e.stopPropagation()}>
      <div className="min-w-0">
        <p className="font-semibold text-sm leading-tight break-words">{block.title}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">{block.start_time} – {block.end_time}</span>
        </div>
        <Badge
          variant="outline"
          className="mt-1.5 text-[10px] py-0 px-1.5 h-4"
          style={{ borderColor: block.color ?? tc.color, color: block.color ?? tc.color }}
        >
          {tc.label}
        </Badge>
        {conflicted && (
          <div className="flex items-center gap-1 mt-1.5 text-[11px] text-amber-500">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            Conflito de horário
          </div>
        )}
      </div>
      <div className="flex gap-2 pt-2 border-t border-border/50">
        <Button
          variant="outline" size="sm"
          className="flex-1 h-9 text-xs gap-1 touch-manipulation"
          onClick={() => onEdit(block)}
        >
          <Edit2 className="w-3 h-3" /> Editar
        </Button>
        <Button
          variant="outline" size="sm"
          className="h-9 w-9 p-0 shrink-0 touch-manipulation text-destructive hover:bg-destructive/10 hover:border-destructive/40"
          onClick={() => onRequestDelete(block)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
