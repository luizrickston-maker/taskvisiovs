import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBriefingEditor } from "@/hooks/useBriefingEditor";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  ChevronLeft, 
  CheckCircle2, 
  RotateCcw, 
  Loader2,
  FileText,
  Calendar,
  User,
  ExternalLink,
  MessageSquare,
  Plus,
  Rocket
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

export default function BriefingReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { briefing, updateBriefing } = useBriefingEditor(id);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projects, setProjects] = useState<any[]>([]);
  const [isProcessingTasks, setIsProcessingTasks] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      const briefingData = briefing.data as any;
      if (briefingData?.workspace_id) {
        const { data } = await supabase
          .from('projects')
          .select('id, project')
          .eq('workspace_id', briefingData.workspace_id);
        if (data) setProjects(data);
      }
    };
    fetchProjects();
  }, [briefing.data]);

  if (briefing.isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const briefingData = briefing.data as any;
  if (!briefingData) return null;

  const responsesMap = briefingData.responses.reduce((acc: any, curr: any) => {
    acc[curr.block_name] = curr.response_data;
    return acc;
  }, {});

  const handleApprove = async () => {
    try {
      await updateBriefing.mutateAsync({ status: 'approved' });
      toast.success("Briefing aprovado com sucesso!");
    } catch (error) {
      toast.error("Erro ao aprovar briefing");
    }
  };

  const handleReject = async () => {
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
      const briefingData = briefing.data as any;
      const videoItems = briefingData.video_items;

      if (!videoItems || videoItems.length === 0) {
        toast.warning("Não há itens de vídeo para gerar tarefas.");
        setIsProcessingTasks(false);
        return;
      }

      const taskPromises = videoItems.map((item: any) => {
        return supabase
          .from('project_tasks')
          .insert([{
            project_id: selectedProjectId,
            workspace_id: briefingData.workspace_id,
            user_id: briefingData.created_by_user_id,
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

  const renderBlockData = (blockName: string, title: string, index: number) => {
    const data = responsesMap[blockName];
    if (!data) return null;

    return (
      <AccordionItem value={blockName} key={blockName} className="glass-card px-6 border rounded-xl overflow-hidden mb-4">
        <AccordionTrigger className="hover:no-underline py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{index}</div>
            <span className="font-semibold text-lg">{title}</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(data).map(([key, value]: [string, any]) => (
              <div key={key} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{key.replace(/_/g, ' ')}</p>
                <div className="text-sm bg-muted/30 p-2 rounded border">
                  {Array.isArray(value) ? value.join(', ') : (value?.toString() || '-')}
                </div>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/pj/briefings")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Revisar: {briefingData.title}</h1>
              <Badge variant={briefingData.status === 'approved' ? 'default' : 'secondary'} className={cn(
                briefingData.status === 'approved' && "bg-green-500 hover:bg-green-600",
                briefingData.status === 'in_review' && "bg-blue-500 hover:bg-blue-600",
              )}>
                {briefingData.status}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">Analise as respostas e tome uma ação para o projeto.</p>
          </div>
        </div>

        <div className="flex gap-2">
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
                    <Button variant="destructive" onClick={handleReject}>Enviar para Ajuste</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button className="gradient-primary glow-primary gap-2" onClick={handleApprove}>
                <CheckCircle2 className="w-4 h-4" /> Aprovar Briefing
              </Button>
            </>
          )}
          
          {briefingData.status === 'approved' && (
            <Dialog open={isGeneratingTasks} onOpenChange={setIsGeneratingTasks}>
              <DialogTrigger asChild>
                <Button className="gradient-primary glow-primary gap-2">
                  <Rocket className="w-4 h-4" /> Gerar Tarefas
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
                  <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground">
                    <p>Serão criadas {briefingData.video_items?.length || 0} tarefas baseadas no planejamento de vídeos.</p>
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Accordion type="multiple" defaultValue={["identificacao", "objetivo_mes", "video_items"]} className="w-full">
            {renderBlockData('identificacao', '1. Identificação', 1)}
            {renderBlockData('objetivo_mes', '2. Objetivo do Mês', 2)}
            
            <AccordionItem value="video_items" className="glass-card px-6 border rounded-xl overflow-hidden mb-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">3</div>
                  <span className="font-semibold text-lg">3. Planejamento dos Vídeos</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-6 pt-2">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tema</TableHead>
                        <TableHead>Formato</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Prioridade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {briefingData.video_items.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.theme}</TableCell>
                          <TableCell><Badge variant="outline">{item.format}</Badge></TableCell>
                          <TableCell>{item.recording_date ? format(new Date(item.recording_date), "dd/MM/yyyy") : '-'}</TableCell>
                          <TableCell>
                            <Badge className={item.priority === 'Urgente' ? "bg-red-500" : "bg-blue-500"}>
                              {item.priority}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>

            {renderBlockData('referencias', '4. Referências & Identidade', 4)}
            {renderBlockData('restricoes', '5. Restrições & Combinados', 5)}
            {renderBlockData('fechamento', '6. Fechamento', 6)}
          </Accordion>
        </div>

        <div className="space-y-6">
          <Card className="glass-card border-primary/10">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" /> Detalhes do Briefing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Cliente</Label>
                <div className="flex items-center gap-2 font-medium">
                  <Badge variant="outline" className="px-1"><User className="w-3 h-3" /></Badge>
                  {briefingData.clients?.name || "Não vinculado"}
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                <Label className="text-xs">Data de Criação</Label>
                <div className="flex items-center gap-2 font-medium">
                  <Badge variant="outline" className="px-1"><Calendar className="w-3 h-3" /></Badge>
                  {format(new Date(briefingData.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                </div>
              </div>
              {briefingData.external_filler_email && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <Label className="text-xs">Preenchedor Externo</Label>
                    <div className="flex items-center gap-2 font-medium break-all">
                      <Badge variant="outline" className="px-1"><MessageSquare className="w-3 h-3" /></Badge>
                      {briefingData.external_filler_email}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {briefingData.review_notes && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-amber-800 uppercase flex items-center gap-2">
                  <RotateCcw className="w-3 h-3" /> Última Solicitação de Ajuste
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-900 italic">"{briefingData.review_notes}"</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
