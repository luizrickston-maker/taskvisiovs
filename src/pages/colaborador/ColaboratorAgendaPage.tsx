import { useMemo, useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarClock, ChevronLeft, ChevronRight, Plus, CheckCircle2, Ban, CalendarOff, Trash2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCollaboratorAvailability, useDeleteAvailability } from '@/hooks/useCollaboratorAvailability';
import {
  useCollaboratorAppointments,
  useRespondAppointment,
} from '@/hooks/useCollaboratorAppointments';
import { useCollaboratorPermissions } from '@/hooks/useCollaboratorPermissions';
import { AvailabilityForm } from '@/components/areapj/AvailabilityForm';
import { AgendaDayView, AgendaMonthView } from '@/components/agenda/views';
import {
  availabilityConflictsWith,
  mapAppointmentToCalendarEvent,
  mapAvailabilityToCalendarEvents,
} from '@/components/agenda/CalendarEvent';
import { formatDateBR } from '@/lib/schedule';

// =====================================================
// The collaborator's own agenda at /colaborador/agenda: their unavailability,
// the manager's appointments and the confirm/cancel answer to them.
// =====================================================

const STATUS_LABELS: Record<'pending' | 'confirmed' | 'cancelled', string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
};

const STATUS_CLASSES: Record<'pending' | 'confirmed' | 'cancelled', string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  confirmed: 'bg-green-500/10 text-green-600 border-green-500/30',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/30',
};

export default function ColaboratorAgendaPage() {
  const { can } = useCollaboratorPermissions();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);

  const dateFrom = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
  const dateTo = format(endOfMonth(selectedDate), 'yyyy-MM-dd');

  const availability = useCollaboratorAvailability(dateFrom, dateTo);
  const appointments = useCollaboratorAppointments(dateFrom, dateTo);
  const respond = useRespondAppointment();
  // AVAIL-09: the row can be removed here, and the mutation invalidates the
  // query so the calendar re-renders without a full reload.
  const removeAvailability = useDeleteAvailability();

  const availabilityRows = useMemo(() => availability.data ?? [], [availability.data]);
  const appointmentRows = useMemo(() => appointments.data ?? [], [appointments.data]);

  const events = useMemo(
    () => [
      ...availabilityRows.flatMap(mapAvailabilityToCalendarEvents),
      ...appointmentRows.map(a =>
        mapAppointmentToCalendarEvent(a, {
          conflicted: availabilityConflictsWith(a, availabilityRows),
        }),
      ),
    ],
    [availabilityRows, appointmentRows],
  );

  async function respondTo(action: 'confirm' | 'cancel', id: string) {
    const appointment = appointmentRows.find(a => a.id === id);
    if (!appointment) return;
    try {
      await respond.mutateAsync({ appointment, action });
    } catch {
      // The mutation already reported the refusal (COLAB-04).
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto min-h-screen bg-background text-foreground transition-colors duration-300">
      <AvailabilityForm open={formOpen} onCancel={() => setFormOpen(false)} />

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-border">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold font-display text-foreground">Minha Agenda</h1>
          <p className="text-muted-foreground text-sm">
            Veja seus compromissos e marque os períodos em que não está disponível.
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setSelectedDate(d => subMonths(d, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold capitalize min-w-[9rem] text-center">
            {format(selectedDate, "MMMM 'de' yyyy")}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setSelectedDate(d => addMonths(d, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          {can('agenda') && (
            <Button size="sm" className="gap-1.5" onClick={() => setFormOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Indisponibilidade
            </Button>
          )}
        </div>
      </header>

      {/* Calendar */}
      <section className="space-y-4">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-3 md:p-5">
            <AgendaMonthView
              selectedDate={selectedDate}
              events={events}
              mode="read"
              onDaySelect={setSelectedDate}
            />
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-3 md:p-5 space-y-3">
            <p className="text-sm font-semibold capitalize">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
            <AgendaDayView date={selectedDate} events={events} mode="read" />
          </CardContent>
        </Card>
      </section>

      {/* Appointments */}
      <section className="space-y-3">
        <h2 className="text-base font-bold flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-primary" /> Compromissos
        </h2>

        {appointmentRows.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-muted/30 p-10 rounded-2xl text-center border border-dashed border-border font-medium">
            Nenhum compromisso no período.
          </p>
        ) : (
          <div className="space-y-3">
            {appointmentRows.map(apt => (
              <Card key={apt.id} className="bg-card border border-border hover:border-primary/40 transition-colors">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 space-y-0.5">
                      <h3 className="font-semibold text-sm">{apt.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {formatDateBR(apt.date)} · {apt.start_time}–{apt.end_time}
                      </p>
                    </div>
                    <Badge variant="outline" className={STATUS_CLASSES[apt.status]}>
                      {STATUS_LABELS[apt.status]}
                    </Badge>
                  </div>

                  {apt.notes && apt.notes.trim() && (
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap border-l-2 border-border pl-3">
                      {apt.notes}
                    </p>
                  )}

                  {/* COLAB-06 / COLAB-07: actions exist only while pending. */}
                  {apt.status === 'pending' && (
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <Button
                        size="sm"
                        className="gap-1.5 h-8 text-xs"
                        onClick={() => { void respondTo('confirm', apt.id); }}
                        disabled={respond.isPending}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-8 text-xs"
                        onClick={() => { void respondTo('cancel', apt.id); }}
                        disabled={respond.isPending}
                      >
                        <Ban className="w-3.5 h-3.5" /> Cancelar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Declared unavailability */}
      <section className="space-y-3">
        <h2 className="text-base font-bold flex items-center gap-2">
          <CalendarOff className="w-5 h-5 text-primary" /> Indisponibilidades
        </h2>

        {availabilityRows.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-muted/30 p-8 rounded-2xl text-center border border-dashed border-border font-medium">
            Nenhuma indisponibilidade declarada neste mês.
          </p>
        ) : (
          <div className="space-y-2">
            {availabilityRows.map(row => {
              const label = row.reason && row.reason.trim() ? row.reason : 'Indisponível';
              return (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/50 bg-muted/30"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateBR(row.start_date)}
                      {row.start_date !== row.end_date && ` – ${formatDateBR(row.end_date)}`}
                      {row.start_time && ` · ${row.start_time}–${row.end_time}`}
                    </p>
                  </div>

                  {/* AVAIL-09: removing the row re-renders the calendar in place. */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Remover indisponibilidade: ${label}`}
                    disabled={removeAvailability.isPending}
                    onClick={() => removeAvailability.mutate(row.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
