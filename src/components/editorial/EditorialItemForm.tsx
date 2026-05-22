import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAddEditorialCalendarItem, useUpdateEditorialCalendarItem } from '@/hooks/useEditorialCalendar';
import { useAppStore } from '@/stores/useAppStore';
import { 
  contentPlatformConfig, 
  contentStatusLabels, 
  contentTypeLabels,
  type ContentPlatform,
  type ContentStatus,
  type ContentTypeEnum,
} from '@/types/editorial';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const formSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  content_link: z.string().url('URL inválida').optional().or(z.literal('')),
  due_date: z.date().refine((val) => val !== null, { message: "Data é obrigatória" }),
  platform: z.enum(['instagram', 'tiktok', 'linkedin', 'blog', 'youtube']),
  content_type: z.enum(['post', 'reel', 'story', 'article', 'video']),
  status: z.enum(['idea', 'draft', 'review', 'approved', 'published']),
  assigned_to: z.string().optional(),
});





type FormData = z.infer<typeof formSchema>;

interface EditingItem {
  id: string;
  title: string;
  platform: string;
  content_type: string;
  status: string | null;
  due_date: string;
  description: string | null;
  content_link: string | null;
  [key: string]: unknown;
}

interface EditorialItemFormProps {
  onSuccess?: () => void;
  defaultValues?: Partial<FormData>;
  clientId?: string | null;
  editingItem?: EditingItem | null;
}

export function EditorialItemForm({ onSuccess, defaultValues, clientId, editingItem }: EditorialItemFormProps) {
  const addItem = useAddEditorialCalendarItem();
  const updateItem = useUpdateEditorialCalendarItem();
  const { corporateTeam } = useAppStore();
  const activeTeamMembers = corporateTeam.filter(m => m.is_active);

  const isEditing = !!editingItem;

  const getDefaultValues = (): Partial<FormData> => {
    if (editingItem) {
      return {
        title: editingItem.title,
        description: editingItem.description ?? '',
        content_link: editingItem.content_link ?? '',
        due_date: new Date(editingItem.due_date),
        platform: editingItem.platform as ContentPlatform,
        content_type: editingItem.content_type as ContentTypeEnum,
        status: (editingItem.status ?? 'idea') as ContentStatus,
      };
    }
    return {
      title: '',
      description: '',
      content_link: '',
      platform: 'instagram',
      content_type: 'post',
      status: 'idea',
      ...defaultValues,
    };
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: getDefaultValues(),
  });

  // Reset form when editingItem changes
  useEffect(() => {
    form.reset(getDefaultValues());
  }, [editingItem?.id]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && editingItem) {
        await updateItem.mutateAsync({
          id: editingItem.id,
          updates: {
            title: data.title,
            description: data.description || null,
            content_link: data.content_link || null,
            due_date: data.due_date.toISOString(),
            platform: data.platform as ContentPlatform,
            content_type: data.content_type as ContentTypeEnum,
            status: data.status as ContentStatus,
            assigned_to: data.assigned_to || null,
          } as any,
        });
        toast.success('Conteúdo atualizado com sucesso!');
      } else {
        await addItem.mutateAsync({
          title: data.title,
          description: data.description || null,
          content_link: data.content_link || null,
          due_date: data.due_date.toISOString(),
          platform: data.platform as ContentPlatform,
          content_type: data.content_type as ContentTypeEnum,
          status: data.status as ContentStatus,
          assigned_to: data.assigned_to || null,
          project_id: null,
          client_id: clientId || null,
        });
        toast.success('Conteúdo adicionado com sucesso!');
      }
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error(isEditing ? 'Erro ao atualizar conteúdo' : 'Erro ao adicionar conteúdo');
      console.error(error);
    }
  };

  const isPending = addItem.isPending || updateItem.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-1">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Post sobre novidades" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descreva o conteúdo..." 
                  className="resize-none"
                  rows={3}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content_link"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link do conteúdo <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
              <FormControl>
                <Input placeholder="https://drive.google.com/..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="platform"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plataforma</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(contentPlatformConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="content_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(contentTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy")
                        ) : (
                          <span>Selecione</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(contentStatusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {activeTeamMembers.length > 0 && (
          <FormField
            control={form.control}
            name="assigned_to"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Responsável</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {activeTeamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} - {member.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEditing ? 'Salvar alterações' : 'Adicionar Conteúdo'}
        </Button>
      </form>
    </Form>
  );
}
