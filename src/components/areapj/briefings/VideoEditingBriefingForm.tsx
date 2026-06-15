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
import { Switch } from "@/components/ui/switch";
import {
  Video,
  Calendar as CalendarIcon,
  Target,
  Clock,
  Film,
  Save,
  Loader2,
  Palette,
  Type,
  Music,
  AlertCircle,
  Send,
  FolderOpen
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useClientVideoSettings } from "@/hooks/useClientVideoSettings";
import {
  VideoEditingBriefing,
  useVideoEditingBriefing,
  useCreateVideoEditingBriefing,
  useUpdateVideoEditingBriefing,
  useGenerateVideoBriefingMagicLink
} from "@/hooks/useVideoEditingBriefing";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

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

  const [clients, setClients] = useState<{ id: string; name: string; company_name: string | null }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(clientId || "");

  useEffect(() => {
    if (clientId || briefingId) return;
    supabase
      .from("clients")
      .select("id, name, company_name")
      .order("name", { ascending: true })
      .then(({ data }) => { if (data) setClients(data); });
  }, [clientId, briefingId]);

  const effectiveClientId = clientId || selectedClientId || existingBriefing?.client_id || "";
  const { data: clientSettings } = useClientVideoSettings(effectiveClientId);

  const createMutation = useCreateVideoEditingBriefing();
  const updateMutation = useUpdateVideoEditingBriefing();
  const magicLinkMutation = useGenerateVideoBriefingMagicLink();

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
      use_client_profile: true,
      notify_on_completion: true,
    }
  });

  const { register, handleSubmit, setValue, watch, reset } = form;
  const bRollIncluded = watch("b_roll_included");
  const deliveryDeadline = watch("delivery_deadline");
  const useClientProfile = watch("use_client_profile");

  // Pre-fill logic
  useEffect(() => {
    if (existingBriefing) {
      reset(existingBriefing);
    } else if (clientSettings && !briefingId) {
      setValue("use_client_profile", true);
      setValue("music_override", clientSettings.default_music_style);
      setValue("typography_override", clientSettings.default_typography);
      setValue("color_style_override", clientSettings.default_color_style);
      setValue("format_override", clientSettings.default_format);
      setValue("cta_final", clientSettings.default_cta);
      setValue("delivery_drive_folder", clientSettings.default_drive_folder_link);
      setValue("final_file_naming", clientSettings.default_file_naming);
    }
  }, [existingBriefing, clientSettings, reset, setValue, briefingId]);

  const onSubmit = async (data: Partial<VideoEditingBriefing>, action: 'save' | 'send' = 'save') => {
    try {
      let currentId = briefingId;
      const status = action === 'send' ? 'pending' : (data.status || 'draft');
      
      if (briefingId) {
        await updateMutation.mutateAsync({ ...data, id: briefingId, status } as any);
      } else {
        const newBriefing = await createMutation.mutateAsync({
          ...data,
          client_id: effectiveClientId || undefined,
          project_task_id: taskId,
          workspace_id: workspaceId,
          status,
        });
        currentId = newBriefing.id;
      }

      if (action === 'send' && currentId) {
        await magicLinkMutation.mutateAsync(currentId);
      }

      if (currentId) onSuccess?.(currentId);
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

  const isSaving = createMutation.isPending || updateMutation.isPending || magicLinkMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Client selector — shown only when creating a new briefing without a pre-set client */}
      {!clientId && !briefingId && (
        <Card className="border-primary/10 shadow-sm overflow-hidden">
          <div className="h-1.5 gradient-primary" />
          <CardContent className="pt-4 pb-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                Cliente <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name ? `${c.name} — ${c.company_name}` : c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Perfil do Cliente */}
      <Card className="border-primary/10 shadow-sm bg-primary/5">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="w-5 h-5 text-primary" />
              🎨 PERFIL DE EDIÇÃO
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="use_client_profile" className="text-sm cursor-pointer font-medium">
                Seguir Perfil Padrão do Cliente
              </Label>
              <Switch 
                id="use_client_profile" 
                checked={useClientProfile}
                onCheckedChange={(checked) => setValue("use_client_profile", checked)}
              />
            </div>
          </div>
          <CardDescription>
            Defina se este vídeo deve seguir as diretrizes visuais padrão do cliente ou terá exceções.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Music className="w-4 h-4" /> Música diferente?
              </Label>
              <Input 
                disabled={useClientProfile}
                placeholder={useClientProfile ? clientSettings?.default_music_style || "Padrão" : "Descreva o estilo ou nome da música"}
                {...register("music_override")}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Type className="w-4 h-4" /> Tipografia diferente?
              </Label>
              <Input 
                disabled={useClientProfile}
                placeholder={useClientProfile ? clientSettings?.default_typography || "Padrão" : "Ex: Legendas dinâmicas estilo Alex Hormozi"}
                {...register("typography_override")}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Palette className="w-4 h-4" /> Cor/estilo diferente?
              </Label>
              <Input 
                disabled={useClientProfile}
                placeholder={useClientProfile ? clientSettings?.default_color_style || "Padrão" : "Ex: PB com detalhes em dourado"}
                {...register("color_style_override")}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Film className="w-4 h-4" /> Formato diferente?
              </Label>
              <Input 
                disabled={useClientProfile}
                placeholder={useClientProfile ? clientSettings?.default_format || "Vertical (9:16)" : "Ex: Horizontal (16:9) para YouTube"}
                {...register("format_override")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo Específico */}
      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Type className="w-5 h-5 text-primary" />
            📝 TEXTO / LEGENDA ESPECIAL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Texto de abertura (Hook/Gancho)</Label>
            <Textarea 
              placeholder="O que deve aparecer escrito nos primeiros segundos?"
              className="min-h-[80px]"
              {...register("opening_hook")}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">CTA Final Específico</Label>
            <Input 
              placeholder="Ex: Clique no link da bio para se inscrever"
              {...register("cta_final")}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Legenda personalizada (se houver)</Label>
            <Textarea 
              placeholder="Caso precise de legendas específicas em momentos determinados"
              className="min-h-[80px]"
              {...register("custom_caption")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Música Específica */}
      {!useClientProfile && (
        <Card className="border-primary/10 shadow-sm animate-in fade-in slide-in-from-top-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Music className="w-5 h-5 text-primary" />
              🎵 DETALHES DA MÚSICA
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Música Específica (Nome/Link)</Label>
              <Input 
                placeholder="Ex: 'Midnight City' ou link do Artlist"
                {...register("specific_music")}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Referência de vídeo com a música</Label>
              <Input 
                placeholder="Ex: Link de um Reels com este áudio"
                {...register("music_reference_video")}
              />
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Entrega e Observações */}
      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FolderOpen className="w-5 h-5 text-primary" />
            📤 ENTREGA E OBSERVAÇÕES
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Pasta de Entrega (Drive)</Label>
              <Input 
                placeholder="Link da pasta onde o editor deve subir"
                {...register("delivery_drive_folder")}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nomenclatura do arquivo final</Label>
              <Input 
                placeholder="Ex: [NOME_CLIENTE] - Reels - 01"
                {...register("final_file_naming")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500" /> ⚠️ OBSERVAÇÕES / ATENÇÃO
            </Label>
            <Textarea 
              placeholder="Algum detalhe crucial que o editor não pode esquecer?"
              className="min-h-[80px]"
              {...register("observations")}
            />
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox 
              id="notify_on_completion" 
              {...register("notify_on_completion")}
            />
            <Label htmlFor="notify_on_completion" className="text-sm font-medium cursor-pointer">
              Me avisar quando o editor concluir a edição
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button 
          type="button"
          variant="outline"
          disabled={isSaving}
          onClick={handleSubmit((data) => onSubmit(data, 'save'))}
          className="font-semibold"
        >
          <Save className="w-4 h-4 mr-2" />
          Salvar Rascunho
        </Button>
        <Button 
          type="button"
          disabled={isSaving}
          onClick={handleSubmit((data) => onSubmit(data, 'send'))}
          className="gradient-primary glow-primary font-bold min-w-[200px]"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          Enviar para Editor
        </Button>
      </div>
    </div>
  );
}
