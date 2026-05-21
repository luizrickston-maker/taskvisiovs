import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { 
  Video, 
  Calendar as CalendarIcon, 
  Target, 
  Clock, 
  Film, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Music,
  Palette,
  Type,
  FolderOpen,
  MessageSquare,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { VideoEditingBriefing, useVideoEditingBriefing, useUpdateVideoEditingBriefing } from "@/hooks/useVideoEditingBriefing";

export default function VideoBriefingViewPage() {
  const [searchParams] = useSearchParams();
  const { taskId } = useParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [briefing, setBriefing] = useState<VideoEditingBriefing | null>(null);
  const [revisionMessage, setRevisionMessage] = useState("");
  const [showRevisionForm, setShowRevisionForm] = useState(false);

  const updateMutation = useUpdateVideoEditingBriefing();

  useEffect(() => {
    const fetchBriefing = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from('video_editing_briefings')
          .select('*');

        if (token) {
          query = query.eq('magic_link_token', token);
          // Only check expiry if token is present
          const { data: tokenData, error: tokenError } = await query.maybeSingle();
          if (tokenError) throw tokenError;
          if (!tokenData) throw new Error("Briefing não encontrado");
          
          if (tokenData.magic_link_expires_at && new Date(tokenData.magic_link_expires_at) < new Date()) {
            throw new Error("Link de acesso expirado");
          }
          setBriefing(tokenData as VideoEditingBriefing);
        } else if (taskId) {
          query = query.eq('project_task_id', taskId);
          const { data, error } = await query.maybeSingle();
          if (error) throw error;
          if (!data) {
             // If no briefing exists for this task, we might want to redirect to create one
             // or show a specific UI. For now, let's keep the not found error.
             throw new Error("Nenhum briefing vinculado a esta tarefa");
          }
          setBriefing(data as VideoEditingBriefing);
        } else {
          throw new Error("Acesso não autorizado");
        }
      } catch (err: any) {
        console.error("Error fetching briefing:", err);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBriefing();
  }, [token, taskId]);

  const handleUpdateStatus = async (newStatus: string, observations?: string) => {
    if (!briefing?.id) return;
    setSubmitting(true);
    try {
      const updateData: any = { status: newStatus };
      if (observations) {
        updateData.observations = (briefing.observations || "") + "\n\n--- Mensagem do Editor ---\n" + (observations || "");
      }

      await updateMutation.mutateAsync({ ...updateData, id: briefing.id });
      setBriefing({ ...briefing, ...updateData });
      toast.success(`Status atualizado para ${newStatus}`);
      setShowRevisionForm(false);
      setRevisionMessage("");
    } catch (err: any) {
      toast.error("Erro ao atualizar status: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando briefing de edição...</p>
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-4">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold">Link Inválido ou Expirado</h1>
        <p className="text-muted-foreground max-w-md">Este link de acesso não é mais válido ou o briefing não foi encontrado.</p>
        <Button variant="outline" onClick={() => navigate("/")}>Voltar para o Início</Button>
      </div>
    );
  }

  const getStatusInfo = (status: string | undefined) => {
    switch (status) {
      case 'completed': return { label: 'Concluído', color: 'bg-green-500', progress: 100 };
      case 'review': return { label: 'Em Revisão', color: 'bg-amber-500', progress: 75 };
      case 'in_progress': return { label: 'Em Andamento', color: 'bg-blue-500', progress: 50 };
      case 'pending': return { label: 'Pendente', color: 'bg-slate-500', progress: 25 };
      default: return { label: 'Rascunho', color: 'bg-slate-400', progress: 10 };
    }
  };

  const statusInfo = getStatusInfo(briefing.status);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b shadow-sm">
        <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Video className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">{briefing.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={cn("text-[10px] uppercase", statusInfo.color)}>
                  {statusInfo.label}
                </Badge>
                {briefing.delivery_deadline && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    Entrega: {format(new Date(briefing.delivery_deadline), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex-1 md:w-48">
              <div className="flex justify-between text-[10px] mb-1 font-bold uppercase text-muted-foreground">
                <span>Progresso</span>
                <span>{statusInfo.progress}%</span>
              </div>
              <Progress value={statusInfo.progress} className="h-1.5" />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowRevisionForm(!showRevisionForm)}
                className="h-9 border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Dúvida / Revisão
              </Button>
              <Button 
                onClick={() => handleUpdateStatus('completed')} 
                disabled={submitting || briefing.status === 'completed'}
                size="sm"
                className="h-9 gradient-primary glow-primary font-bold"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Concluir Edição
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 pt-8 max-w-5xl space-y-6">
        {/* Revision Form Overlay-style card */}
        {showRevisionForm && (
          <Card className="border-amber-200 bg-amber-50 shadow-md animate-in slide-in-from-top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-4 h-4" /> Solicitar Informações ou Revisão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea 
                placeholder="Descreva sua dúvida ou o que precisa ser revisado no briefing..."
                value={revisionMessage}
                onChange={(e) => setRevisionMessage(e.target.value)}
                className="min-h-[100px] bg-white border-amber-200 focus-visible:ring-amber-500"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowRevisionForm(false)}>Cancelar</Button>
                <Button 
                  size="sm" 
                  disabled={!revisionMessage || submitting}
                  onClick={() => handleUpdateStatus('review', revisionMessage)}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Enviar Mensagem
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Objetivo e Duração */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-primary/10 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                    <Target className="w-4 h-4 text-primary" /> OBJETIVO
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 leading-relaxed italic">
                    {briefing.objective || "Não informado"}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/10 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                    <Clock className="w-4 h-4 text-primary" /> DURAÇÃO ALVO
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold text-primary">
                    {briefing.target_duration || "Livre"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Takes e Arquivos */}
            <Card className="border-primary/10 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                  <Film className="w-4 h-4 text-primary" /> ARQUIVOS E TAKES
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-100 p-3 rounded-lg flex items-center justify-between group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FolderOpen className="w-5 h-5 text-slate-500 flex-shrink-0" />
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-500 uppercase">Arquivos Brutos</p>
                      <p className="text-sm text-primary truncate font-medium">
                        {briefing.files_sent || "Nenhum link fornecido"}
                      </p>
                    </div>
                  </div>
                  {briefing.files_sent && (
                    <Button variant="ghost" size="icon" asChild>
                      <a href={briefing.files_sent} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-green-600 uppercase">Preferências / Key Moments</p>
                    <div className="p-3 bg-green-50 rounded-lg border border-green-100 min-h-[60px]">
                      <p className="text-sm text-green-900">{briefing.preferred_take || "Nenhuma preferência específica"}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-red-600 uppercase">Ignorar / Erros</p>
                    <div className="p-3 bg-red-50 rounded-lg border border-red-100 min-h-[60px]">
                      <p className="text-sm text-red-900">{briefing.ignore_takes || "Nenhum erro reportado"}</p>
                    </div>
                  </div>
                </div>

                {briefing.b_roll_included && (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-2 mb-2 text-blue-800 font-bold text-xs uppercase">
                      <Film className="w-3.5 h-3.5" /> Possui B-Roll para cobertura
                    </div>
                    <p className="text-sm text-blue-900">
                      <span className="font-semibold">Como usar:</span> {briefing.b_roll_usage || "Usar conforme sentir necessidade para dinamizar o vídeo."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Texto e Legendas */}
            <Card className="border-primary/10 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                  <Type className="w-4 h-4 text-primary" /> TEXTO E LEGENDAS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <div className="w-1.5 h-auto bg-primary rounded-full" />
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">Hook de Abertura (Gancho)</p>
                      <p className="text-base text-slate-800 font-medium mt-1">
                        {briefing.opening_hook || "Sem texto de abertura específico"}
                      </p>
                    </div>
                  </div>
                  
                  <Separator className="opacity-50" />

                  <div className="flex gap-4">
                    <div className="w-1.5 h-auto bg-amber-500 rounded-full" />
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">CTA Final (Call to Action)</p>
                      <p className="text-base text-slate-800 font-medium mt-1">
                        {briefing.cta_final || "Seguir padrão do cliente"}
                      </p>
                    </div>
                  </div>
                </div>

                {briefing.custom_caption && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Legendas / Observações de texto</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{briefing.custom_caption}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Style & Delivery */}
          <div className="space-y-6">
            {/* Identidade Visual */}
            <Card className="border-primary/10 shadow-sm overflow-hidden">
              <div className="h-1 gradient-primary" />
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                  <Palette className="w-4 h-4 text-primary" /> ESTILO E IDENTIDADE
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <Music className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Música</p>
                    <p className="text-sm font-medium">{briefing.music_override || briefing.specific_music || "Seguir Perfil Padrão"}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <Type className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Tipografia</p>
                    <p className="text-sm font-medium">{briefing.typography_override || "Seguir Perfil Padrão"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <Palette className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Cores/LUT</p>
                    <p className="text-sm font-medium">{briefing.color_style_override || "Seguir Perfil Padrão"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <Film className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Formato</p>
                    <p className="text-sm font-medium">{briefing.format_override || "Vertical (9:16)"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Entrega */}
            <Card className="border-primary/10 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                  <FolderOpen className="w-4 h-4 text-primary" /> ENTREGA FINAL
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Pasta de Destino</p>
                  <div className="p-3 bg-slate-50 rounded-lg border border-dashed border-slate-300 flex items-center gap-2 overflow-hidden">
                    <FolderOpen className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <p className="text-xs text-slate-600 truncate">{briefing.delivery_drive_folder || "Não especificado"}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Nome do Arquivo</p>
                  <div className="p-3 bg-slate-900 rounded-lg text-slate-100 text-xs font-mono">
                    {briefing.final_file_naming || "video_final.mp4"}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Observações */}
            {briefing.observations && (
              <Card className="border-amber-100 bg-amber-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold flex items-center gap-2 text-amber-800 uppercase">
                    <AlertCircle className="w-3.5 h-3.5" /> Notas Adicionais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-amber-900 whitespace-pre-wrap">{briefing.observations}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Completion Banner (only when completed) */}
      {briefing.status === 'completed' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10">
          <div className="bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold">Edição enviada e marcada como concluída!</span>
          </div>
        </div>
      )}
    </div>
  );
}
