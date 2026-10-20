import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useCreateAvailability, type AvailabilityInput } from '@/hooks/useCollaboratorAvailability';
import { parseDateOnly } from '@/lib/schedule';

// =====================================================
// Dialog for the five unavailability granularities, carrying the three AVAIL
// validation rules as the exact messages the spec names. The database CHECKs
// are the backstop; this is the feedback the collaborator sees first.
// =====================================================

export const AVAIL_DATE_ORDER_ERROR = 'A data final deve ser igual ou posterior à data inicial.';
export const AVAIL_SINGLE_DAY_ERROR = 'Horários só podem ser usados em um único dia.';
export const AVAIL_TIME_ORDER_ERROR = 'O horário final deve ser posterior ao inicial.';

export type Granularity = 'hora' | 'meio-dia' | 'dia' | 'intervalo' | 'mes';

export const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: 'hora', label: 'Hora específica' },
  { value: 'meio-dia', label: 'Meio período' },
  { value: 'dia', label: 'Dia inteiro' },
  { value: 'intervalo', label: 'Intervalo de dias' },
  { value: 'mes', label: 'Mês inteiro' },
];

/** Half-day presets — the spec defines the granularity, not the clock bounds. */
export const HALF_DAY_PERIODS = {
  manha: { label: 'Manhã', start: '08:00', end: '12:00' },
  tarde: { label: 'Tarde', start: '13:00', end: '18:00' },
} as const;

export const formSchema = z
  .object({
    granularity: z.enum(['hora', 'meio-dia', 'dia', 'intervalo', 'mes']),
    /** YYYY-MM-DD, except `mes`, where it is YYYY-MM. */
    startDate: z.string().min(1, 'Informe a data.'),
    /** Only `intervalo` collects its own end date; the other modes end where they start. */
    endDate: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    period: z.enum(['manha', 'tarde']).optional(),
    reason: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    // AVAIL-04: end_date < start_date is rejected before any network call.
    if (values.granularity === 'intervalo') {
      if (!values.endDate) {
        ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Informe a data final.' });
      } else if (values.endDate < values.startDate) {
        ctx.addIssue({ code: 'custom', path: ['endDate'], message: AVAIL_DATE_ORDER_ERROR });
      }
    }

    // AVAIL-05: times may only be used on a single day.
    if (
      (values.startTime || values.endTime) &&
      values.granularity !== 'mes' &&
      values.startDate !== effectiveEndDate(values)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['endTime'],
        message: AVAIL_SINGLE_DAY_ERROR,
      });
    }

    // AVAIL-06: start_time < end_time.
    if (
      values.startTime &&
      values.endTime &&
      values.startTime >= values.endTime
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['endTime'],
        message: AVAIL_TIME_ORDER_ERROR,
      });
    }
  });

export type AvailabilityFormValues = z.infer<typeof formSchema>;

/** Every mode except `intervalo` ends on the day it starts. */
function effectiveEndDate(values: Pick<AvailabilityFormValues, 'granularity' | 'startDate' | 'endDate'>): string {
  return values.granularity === 'intervalo' ? values.endDate ?? '' : values.startDate;
}

/** Granularity + form values -> the row the T10 hook persists. */
export function buildAvailabilityInput(values: AvailabilityFormValues): AvailabilityInput {
  const reason = values.reason?.trim() ? values.reason.trim() : null;

  switch (values.granularity) {
    case 'hora':
      return {
        start_date: values.startDate,
        end_date: effectiveEndDate(values),
        start_time: values.startTime ?? null,
        end_time: values.endTime ?? null,
        reason,
      };
    case 'meio-dia': {
      const period = HALF_DAY_PERIODS[values.period ?? 'manha'];
      return {
        start_date: values.startDate,
        end_date: effectiveEndDate(values),
        start_time: period.start,
        end_time: period.end,
        reason,
      };
    }
    case 'dia':
      return { start_date: values.startDate, end_date: effectiveEndDate(values), reason };
    case 'intervalo':
      return { start_date: values.startDate, end_date: effectiveEndDate(values), reason };
    case 'mes': {
      const first = parseDateOnly(`${values.startDate}-01`);
      return {
        start_date: format(first, 'yyyy-MM-dd'),
        end_date: format(new Date(first.getFullYear(), first.getMonth() + 1, 0), 'yyyy-MM-dd'),
        reason,
      };
    }
  }
}

export interface AvailabilityFormProps {
  open: boolean;
  initialValues?: Partial<AvailabilityFormValues>;
  /** Called after the row has been created through the availability hook. */
  onSubmit?: (values: AvailabilityInput) => void;
  onCancel: () => void;
}

export function AvailabilityForm({ open, initialValues, onSubmit, onCancel }: AvailabilityFormProps) {
  const createMut = useCreateAvailability();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AvailabilityFormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: {
      granularity: 'hora',
      startDate: '',
      endDate: '',
      startTime: '09:00',
      endTime: '10:00',
      period: 'manha',
      reason: '',
      ...initialValues,
    },
  });

  useEffect(() => {
    if (open) reset({ granularity: 'hora', startDate: '', endDate: '', startTime: '09:00', endTime: '10:00', period: 'manha', reason: '', ...initialValues });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const granularity = watch('granularity');
  const usesTimes = granularity === 'hora' || granularity === 'meio-dia';
  const usesSingleDate = granularity === 'hora' || granularity === 'meio-dia' || granularity === 'dia';
  const usesMonth = granularity === 'mes';

  const errorMessages = useMemo(() => {
    const list: string[] = [];
    for (const e of Object.values(errors)) {
      const m = e?.message;
      if (m && !list.includes(m)) list.push(m);
    }
    return list;
  }, [errors]);

  const submit = handleSubmit(async (values) => {
    const input = buildAvailabilityInput(values);
    await createMut.mutateAsync(input);
    onSubmit?.(input);
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Marcar indisponibilidade</DialogTitle>
          <DialogDescription>
            Escolha o período em que você não poderá atender compromissos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="av-granularity">Período</Label>
            <Select
              value={granularity}
              onValueChange={(v) => setValue('granularity', v as Granularity)}
            >
              <SelectTrigger id="av-granularity" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRANULARITIES.map(g => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {usesMonth ? (
            <div className="space-y-1.5">
              <Label htmlFor="av-month">Mês</Label>
              <Input id="av-month" type="month" {...register('startDate')} />
              {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
            </div>
          ) : (
            <>
              <div className={usesSingleDate ? 'space-y-1.5' : 'grid grid-cols-2 gap-3'}>
                <div className="space-y-1.5">
                  <Label htmlFor="av-start-date">{usesSingleDate ? 'Data' : 'De'}</Label>
                  <Input id="av-start-date" type="date" {...register('startDate')} />
                  {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
                </div>
                {!usesSingleDate && (
                  <div className="space-y-1.5">
                    <Label htmlFor="av-end-date">Até</Label>
                    <Input id="av-end-date" type="date" {...register('endDate')} />
                    {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
                  </div>
                )}
              </div>

              {granularity === 'meio-dia' && (
                <div className="space-y-1.5">
                  <Label htmlFor="av-period">Período do dia</Label>
                  <Select
                    value={watch('period')}
                    onValueChange={(v) => setValue('period', v as 'manha' | 'tarde')}
                  >
                    <SelectTrigger id="av-period" className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manha">Manhã (08:00 – 12:00)</SelectItem>
                      <SelectItem value="tarde">Tarde (13:00 – 18:00)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {usesTimes && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="av-start-time">Início</Label>
                    <Input id="av-start-time" type="time" {...register('startTime')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="av-end-time">Fim</Label>
                    <Input id="av-end-time" type="time" {...register('endTime')} />
                    {errors.endTime && (
                      <p className="text-xs text-destructive" role="alert">{errors.endTime.message}</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {usesSingleDate && errors.endDate && (
            <p className="text-xs text-destructive" role="alert">{errors.endDate.message}</p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="av-reason">Motivo (opcional)</Label>
            <Textarea id="av-reason" rows={2} placeholder="Ex: consulta médica" {...register('reason')} />
          </div>

          {errorMessages.length > 0 && (
            <ul className="text-xs text-destructive space-y-1" role="alert">
              {errorMessages.map(m => <li key={m}>{m}</li>)}
            </ul>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={createMut.isPending}>Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
