import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Video, 
  User, 
  Calendar as CalendarIcon, 
  Target, 
  Clock, 
  Film, 
  Save, 
  Loader2,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useClientVideoSettings } from "@/hooks/useClientVideoSettings";
import { 
  VideoEditingBriefing, 
  useVideoEditingBriefing, 
  useCreateVideoEditingBriefing, 
  useUpdateVideoEditingBriefing 
} from "@/hooks/useVideoEditingBriefing";

interface VideoEditingBriefingFormProps {
  briefingId?: string;
  clientId?: string;
  taskId?: string;
  workspaceId?: string;
  onSuccess?: (id: string) => void;
  onCancel?: () => void;
}

export function VideoEditingBriefingForm({
  briefingId,
  clientId,
  taskId,
  workspaceId,
  onSuccess,
  onCancel
}: VideoEditingBriefingFormProps) {
  const { data: existingBriefing, isLoading: isLoadingBriefing } = useVideoEditingBriefing(briefingId || "");
  const { data: clientSettings } = useClientVideoSettings(clientId || existingBriefing?.client_id || "");
  
  const createMutation = useCreateVideoEditingBriefing();
  const updateMutation = useUpdateVideoEditingBriefing();

  const form = useForm<Partial<VideoEditingBriefing>>({
    defaultValues: {
      title: "",
      objective: "",
      target_duration: "60s",
      files_sent: "",
      preferred_take: "",
      ignore_takes: "",
      b_roll_included: false,
      b_roll_usage: "",
      status: "draft",
    }
  });

  const { register, handleSubmit, setValue, watch, reset } = form;
  const bRollIncluded = watch("b_roll_included");
  const deliveryDeadline = watch("delivery_deadline");

  // Pre-fill logic
  useEffect(() => {
    if (existingBriefing) {
      reset(existingBriefing);
    } else if (clientSettings && !briefingId) {
      // Smart pre-filling from client settings for new briefings
      setValue("music_override", clientSettings.default_music_style);
      setValue("typography_override", clientSettings.default_typography);
      setValue("color_style_override", clientSettings.default_color_style);
      setValue("format_override", clientSettings.default_format);
      setValue("cta_final", clientSettings.default_cta);
      setValue("delivery_drive_folder", clientSettings.default_drive_folder_link);
      setValue("final_file_naming", clientSettings.default_file_naming);
    }
  }, [existingBriefing, clientSettings, reset, setValue, briefingId]);

  const onSubmit = async (data: Partial<VideoEditingBriefing>) => {
    try {
      if (briefingId) {
        await updateMutation.mutateAsync({ ...data, id: briefingId } as any);
        onSuccess?.(briefingId);
      } else {
        const newBriefing = await createMutation.mutateAsync({
          ...data,
          client_id: clientId,
          project_task_id: taskId,
          workspace_id: workspaceId,
        });
        onSuccess?.(newBriefing.id);
      }
    } catch (error) {
      console.error("Error saving briefing:", error);
    }
  };

  if (isLoadingBriefing && briefingId) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header Info */}
      <Card className="border-primary/10 shadow-sm overflow-hidden">
        <div className="h-1.5 gradient-primary" />
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Video className="w-5 h-5 text-primary" />
            Detalhes Básicos
          </CardTitle>
          <CardDescription>
            Informações essenciais para identificação do vídeo e prazo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium flex items-center gap-1.5">
              📁 Título do Vídeo
            </Label>
            <Input 
              id="title" 
              placeholder="Ex: Reels de Lançamento - Coleção Verão" 
              {...register("title", { required: true })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              📅 Prazo de Entrega
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !deliveryDeadline && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deliveryDeadline ? (
                    format(new Date(deliveryDeadline), "PPP", { locale: ptBR })
                  ) : (
                    <span>Selecione uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deliveryDeadline ? new Date(deliveryDeadline) : undefined}
                  onSelect={(date) => setValue("delivery_deadline", date?.toISOString())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Objetivo */}
      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" />
            🎯 OBJETIVO DO VÍDEO
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea 
            placeholder="Qual o objetivo principal deste vídeo? O que o espectador deve sentir ou fazer?"
            className="min-h-[100px] resize-none"
            {...register("objective")}
          />
        </CardContent>
      </Card>

      {/* Duração */}
      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-primary" />
            ⏱️ DURAÇÃO ALVO
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            defaultValue="60s" 
            className="flex flex-wrap gap-4"
            value={watch("target_duration") || ""}
            onValueChange={(val) => setValue("target_duration", val)}
          >
            {["Até 15s", "Até 30s", "Até 60s", "Até 90s", "Livre"].map((opt) => (
              <div key={opt} className="flex items-center space-x-2 bg-muted/30 px-4 py-2 rounded-lg border border-transparent hover:border-primary/20 transition-colors">
                <RadioGroupItem value={opt} id={`duration-${opt}`} />
                <Label htmlFor={`duration-${opt}`} className="cursor-pointer">{opt}</Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Takes */}
      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Film className="w-5 h-5 text-primary" />
            🎞️ TAKES E ARQUIVOS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="files_sent" className="text-sm font-medium">
              Link dos arquivos brutos
            </Label>
            <Input 
              id="files_sent" 
              placeholder="Ex: Link do Drive, Dropbox ou WeTransfer" 
              {...register("files_sent")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preferred_take" className="text-sm font-medium text-green-600 dark:text-green-400">
                Take preferido / Momentos chave
              </Label>
              <Input 
                id="preferred_take" 
                placeholder="Ex: Take 02 é o melhor, usar final do 05" 
                {...register("preferred_take")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ignore_takes" className="text-sm font-medium text-red-600 dark:text-red-400">
                Ignorar / Erros
              </Label>
              <Input 
                id="ignore_takes" 
                placeholder="Ex: Ignorar take 01 e 03 (erros de fala)" 
                {...register("ignore_takes")}
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center space-x-2 bg-primary/5 p-3 rounded-lg border border-primary/10">
              <Checkbox 
                id="b_roll_included" 
                checked={bRollIncluded}
                onCheckedChange={(checked) => setValue("b_roll_included", checked === true)}
              />
              <Label htmlFor="b_roll_included" className="text-sm font-medium cursor-pointer">
                Possui B-roll (imagens de cobertura) incluso?
              </Label>
            </div>

            {bRollIncluded && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label htmlFor="b_roll_usage" className="text-sm font-medium">
                  Como e quando usar o b-roll?
                </Label>
                <Input 
                  id="b_roll_usage" 
                  placeholder="Ex: Usar b-roll sobre a fala de 'benefícios'" 
                  {...register("b_roll_usage")}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={isSaving}
          className="gradient-primary glow-primary font-bold min-w-[150px]"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {briefingId ? "Salvar Alterações" : "Criar Briefing"}
        </Button>
      </div>
    </form>
  );
}
