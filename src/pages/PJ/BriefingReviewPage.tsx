import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBriefingEditor, useUpdateBriefingStatus } from "@/hooks/useBriefingEditor";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Accordion } from "@/components/ui/accordion";
import { 
  CheckCircle2, 
  RotateCcw, 
  Loader2,
  FileText,
  Calendar,
  User,
  MessageSquare,
  Rocket
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { BriefingHeader } from "@/components/briefings/BriefingHeader";
import { BriefingBlockWrapper } from "@/components/briefings/BriefingBlockWrapper";
import { BriefingBlock1 } from "@/components/briefings/BriefingBlock1";
import { BriefingBlock2 } from "@/components/briefings/BriefingBlock2";
import { BriefingBlock3 } from "@/components/briefings/BriefingBlock3";
import { BriefingBlock4 } from "@/components/briefings/BriefingBlock4";
import { BriefingBlock5 } from "@/components/briefings/BriefingBlock5";
import { BriefingBlock6 } from "@/components/briefings/BriefingBlock6";
import { 
  BriefingWithDetails, 
  BriefingVideoItem,
  BriefingResponseBlock1,
  BriefingResponseBlock2,
  BriefingResponseBlock4,
  BriefingResponseBlock5,
  BriefingResponseBlock6
} from "@/types/briefing";
import { Project } from "@/types/database";

export default function BriefingReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { briefing } = useBriefingEditor(id);
  const updateStatus = useUpdateBriefingStatus();
  const { updateBriefing } = useBriefingEditor(id);
  
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [isProcessingTasks, setIsProcessingTasks] = useState(false);

  // Form states (read-only data)
  const [block1, setBlock1] = useState<Partial<BriefingResponseBlock1>>({});
  const [block2, setBlock2] = useState<Partial<BriefingResponseBlock2>>({});
  const [videoItems, setVideoItems] = useState<BriefingVideoItem[]>([]);
  const [block4, setBlock4] = useState<Partial<BriefingResponseBlock4>>({});
  const [block5, setBlock5] = useState<Partial<BriefingResponseBlock5>>({});
  const [block6, setBlock6] = useState<Partial<BriefingResponseBlock6>>({});

  useEffect(() => {
    if (briefing.data) {
      const data = briefing.data as BriefingWithDetails;
      
      data.responses.forEach((resp) => {
        const blockData = resp.response_data as any;
        if (resp.block_name === 'identificacao') setBlock1(blockData);
        if (resp.block_name === 'estrutura') setBlock2(blockData);
        if (resp.block_name === 'referencias') setBlock4(blockData);
        if (resp.block_name === 'distribuicao') setBlock5(blockData);
        if (resp.block_name === 'prazos') setBlock6(blockData);
      });
      
      setVideoItems(data.video_items.sort((a, b) => a.item_index - b.item_index));

      const fetchProjects = async () => {
        const { data: projectsData } = await supabase
          .from('projects')
          .select('id, project')
          .eq('workspace_id', data.workspace_id);
        if (projectsData) setProjects(projectsData as Project[]);
      };
      fetchProjects();
    }
  }, [briefing.data]);

  if (briefing.isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const briefingData = briefing.data as BriefingWithDetails;
  if (!briefingData) return null;

  const handleApprove = async () => {
    try {
      await updateStatus.mutateAsync({ id: briefingData.id, status: 'approved' });
      toast.success("Briefing aprovado com sucesso!");
    } catch (error) {
      toast.error("Erro ao aprovar briefing");
    }
  };

  const handleReject = async () => {
    if (!rejectNotes) {
      toast.error("Por favor, informe os ajustes necessários.");
      return;
    }

    try {
      await updateBriefing.mutateAsync({ 
        status: 'pending_fill',
        review_notes: rejectNotes 
      });
      toast.success("Solicitação de ajuste enviada.");
      setIsRejecting(false);
    } catch (error) {
      toast.error("Erro ao enviar solicitação");
    }
  };

  const handleGenerateTasks = async () => {
    if (!selectedProjectId) {
      toast.error("Selecione um projeto para vincular as tarefas.");
      return;
    }

    setIsProcessingTasks(true);
    try {
      if (!videoItems || videoItems.length === 0) {
        toast.warning("Não há itens de vídeo para gerar tarefas.");
        setIsProcessingTasks(false);
        return;
      }

      const taskPromises = videoItems.map((item: BriefingVideoItem) => {
        return supabase
          .from('project_tasks')
          .insert([{
            project_id: selectedProjectId,
            workspace_id: briefingData.workspace_id,
            user_id: briefingData.assigned_to_user_id || briefingData.workspace_id, // Fallback if no assignee
            title: item.theme || "Vídeo sem tema",
            description: `Gerado automaticamente do Briefing: ${briefingData.title}\nID do Briefing: ${briefingData.id}`,
            status: 'todo',
            priority: item.priority === 'Urgente' ? 1 : 2,
            deadline: item.recording_date || null
          }]);
      });

      await Promise.all(taskPromises);
      toast.success(`${videoItems.length} tarefas geradas no projeto com sucesso!`);
      setIsGeneratingTasks(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar tarefas.");
    } finally {
      setIsProcessingTasks(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-8 animate-in fade-in duration-500">
      <BriefingHeader 
        title={`Revisar: ${briefingData.title}`}
        subtitle="Analise as respostas e aprove ou solicite ajustes"
        status={briefingData.status}
        backPath="/pj/briefings"
      >
        {briefingData.status !== 'approved' && (
          <>
            <Dialog open={isRejecting} onOpenChange={setIsRejecting}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <RotateCcw className="w-4 h-4" /> Solicitar Ajustes
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Solicitar Ajustes</DialogTitle>
                  <DialogDescription>
                    Explique o que precisa ser alterado para que o colaborador possa corrigir.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-4">
                  <Label>Instruções de Ajuste</Label>
                  <Textarea 
                    placeholder="Ex: Por favor, adicione mais referências no bloco 4..." 
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsRejecting(false)}>Cancelar</Button>
                  <Button variant="destructive" onClick={handleReject} disabled={updateBriefing.isPending}>
                    {updateBriefing.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                    Enviar para Ajuste
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button className="gradient-primary glow-primary gap-2" onClick={handleApprove} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4" />}
              Aprovar Briefing
            </Button>
          </>
        )}
        
        {briefingData.status === 'approved' && (
          <Dialog open={isGeneratingTasks} onOpenChange={setIsGeneratingTasks}>
            <DialogTrigger asChild>
              <Button className="gradient-primary glow-primary gap-2 font-bold">
                <Rocket className="w-4 h-4" /> Gerar Tarefas do Projeto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gerar Tarefas do Projeto</DialogTitle>
                <DialogDescription>
                  Selecione o projeto onde as tarefas de vídeo serão criadas automaticamente.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Projeto de Destino</Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.project}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-muted/50 p-4 rounded-xl text-xs text-muted-foreground border">
                  <p className="font-semibold text-primary mb-1">Informações:</p>
                  <p>• Serão criadas {videoItems.length} tarefas.</p>
                  <p>• Títulos baseados nos temas planejados.</p>
                  <p>• Datas vinculadas aos prazos do briefing.</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsGeneratingTasks(false)}>Cancelar</Button>
                <Button 
                  className="gradient-primary" 
                  onClick={handleGenerateTasks}
                  disabled={isProcessingTasks || !selectedProjectId}
                >
                  {isProcessingTasks ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Rocket className="w-4 h-4 mr-2" />}
                  Criar Tarefas Agora
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </BriefingHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <Accordion type="multiple" defaultValue={["b1", "b2", "b3"]} className="w-full">
            <BriefingBlockWrapper value="b1" number={1} title="Detalhes do Cliente e Projeto">
              <BriefingBlock1 data={block1} onChange={() => {}} readOnly />
            </BriefingBlockWrapper>

            <BriefingBlockWrapper value="b2" number={2} title="Estrutura e Formato">
              <BriefingBlock2 data={block2} onChange={() => {}} readOnly />
            </BriefingBlockWrapper>

            <BriefingBlockWrapper value="b3" number={3} title="Planejamento dos Vídeos (Temas)">
              <BriefingBlock3 items={videoItems} onChange={() => {}} readOnly />
            </BriefingBlockWrapper>

            <BriefingBlockWrapper value="b4" number={4} title="Referências e Identidade Visual">
              <BriefingBlock4 data={block4} onChange={() => {}} readOnly />
            </BriefingBlockWrapper>

            <BriefingBlockWrapper value="b5" number={5} title="Distribuição e Canais">
              <BriefingBlock5 data={block5} onChange={() => {}} readOnly />
            </BriefingBlockWrapper>

            <BriefingBlockWrapper value="b6" number={6} title="Prazos e Orçamento">
              <BriefingBlock6 data={block6} onChange={() => {}} readOnly />
            </BriefingBlockWrapper>
          </Accordion>
        </div>

        <div className="space-y-6">
          <Card className="glass-card border-primary/10 shadow-lg">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <FileText className="w-4 h-4" /> Resumo do Briefing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase">Cliente</Label>
                <div className="flex items-center gap-2 font-semibold">
                  <div className="bg-primary/10 p-1.5 rounded-lg">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  {briefingData.client?.name || "Não vinculado"}
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase">Data de Criação</Label>
                <div className="flex items-center gap-2 font-semibold">
                  <div className="bg-primary/10 p-1.5 rounded-lg">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  {format(new Date(briefingData.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                </div>
              </div>
              {briefingData.external_filler_email && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase">Preenchedor Externo</Label>
                    <div className="flex items-center gap-2 font-semibold break-all">
                      <div className="bg-primary/10 p-1.5 rounded-lg">
                        <MessageSquare className="w-4 h-4 text-primary" />
                      </div>
                      {briefingData.external_filler_email}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {briefingData.review_notes && (
            <Card className="border-amber-200 bg-amber-50/50 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-amber-800 uppercase flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" /> Último Comentário de Revisão
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-900 leading-relaxed italic">"{briefingData.review_notes}"</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
