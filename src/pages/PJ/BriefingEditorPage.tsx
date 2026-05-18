import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBriefingEditor } from "@/hooks/useBriefingEditor";
import { useAuthContextSafe } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
  Save, 
  Send, 
  Plus, 
  Trash2, 
  Loader2,
  Calendar as CalendarIcon
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function BriefingEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const authContext = useAuthContextSafe();
  const isNew = !id;
  
  const { briefing, updateBriefing, updateResponse, manageVideoItems } = useBriefingEditor(id);
  
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [clients, setClients] = useState<any[]>([]);
  const [assignedUserId, setAssignedUserId] = useState<string>("");
  const [externalEmail, setExternalEmail] = useState("");
  
  // States for blocks
  const [block1, setBlock1] = useState<any>({ plano: [] });
  const [block2, setBlock2] = useState<any>({ objetivos: [] });
  const [videoItems, setVideoItems] = useState<any[]>([]);
  const [block4, setBlock4] = useState<any>({ tons: [] });
  const [block5, setBlock5] = useState<any>({});
  const [block6, setBlock6] = useState<any>({});

  useEffect(() => {
    const loadData = async () => {
      let activeWorkspaceId;
      
      if (authContext?.user?.id) {
        const { data: memberData } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', authContext.user.id)
          .limit(1)
          .maybeSingle();
        activeWorkspaceId = memberData?.workspace_id;
      }

      if (activeWorkspaceId) {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, name')
          .eq('workspace_id', activeWorkspaceId);
        if (clientsData) setClients(clientsData);
      }
    };
    loadData();
  }, [authContext?.user?.id]);

  useEffect(() => {
    if (briefing.data) {
      setTitle(briefing.data.title);
      setClientId(briefing.data.client_id || "");
      setAssignedUserId(briefing.data.assigned_to_user_id || "");
      setExternalEmail(briefing.data.external_filler_email || "");
      
      // Map responses to blocks
      briefing.data.responses.forEach((resp: any) => {
        if (resp.block_name === 'identificacao') setBlock1(resp.response_data);
        if (resp.block_name === 'objetivo_mes') setBlock2(resp.response_data);
        if (resp.block_name === 'referencias') setBlock4(resp.response_data);
        if (resp.block_name === 'restricoes') setBlock5(resp.response_data);
        if (resp.block_name === 'fechamento') setBlock6(resp.response_data);
      });
      
      setVideoItems(briefing.data.video_items.sort((a: any, b: any) => a.item_index - b.item_index));
    }
  }, [briefing.data]);

  const addVideoRow = () => {
    setVideoItems([...videoItems, { 
      item_index: videoItems.length + 1, 
      theme: "", 
      format: "Reel", 
      priority: "Normal" 
    }]);
  };

  const removeVideoRow = (index: number) => {
    const newItems = videoItems.filter((_, i) => i !== index).map((item, i) => ({ ...item, item_index: i + 1 }));
    setVideoItems(newItems);
  };

  const handleSave = async (status: string = 'draft') => {
    try {
      let currentId = id;
      
      if (isNew) {
        // Obter workspace_id
        const { data: memberData } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', authContext?.user?.id)
          .limit(1)
          .maybeSingle();
          
        if (!memberData) throw new Error("Workspace não encontrado");

        const { data: newBriefing, error } = await supabase
          .from('briefings')
          .insert([{
            title,
            client_id: clientId || null,
            assigned_to_user_id: assignedUserId || null,
            external_filler_email: externalEmail || null,
            workspace_id: memberData.workspace_id,
            created_by_user_id: authContext?.user?.id,
            status
          }])
          .select()
          .single();
        
        if (error) throw error;
        currentId = newBriefing.id;
        toast.success("Briefing criado!");
        navigate(`/pj/briefings/${currentId}/editar`, { replace: true });
      } else {
        await updateBriefing.mutateAsync({
          title,
          client_id: clientId || null,
          assigned_to_user_id: assignedUserId || null,
          external_filler_email: externalEmail || null,
          status
        });
        toast.success("Briefing atualizado!");
      }

      // Save blocks
      const blockPromises = [
        updateResponse.mutateAsync({ block_name: 'identificacao', response_data: block1 }),
        updateResponse.mutateAsync({ block_name: 'objetivo_mes', response_data: block2 }),
        updateResponse.mutateAsync({ block_name: 'referencias', response_data: block4 }),
        updateResponse.mutateAsync({ block_name: 'restricoes', response_data: block5 }),
        updateResponse.mutateAsync({ block_name: 'fechamento', response_data: block6 }),
        manageVideoItems.mutateAsync(videoItems.map(item => ({ ...item, briefing_id: currentId })))
      ];

      await Promise.all(blockPromises);

      if (status === 'pending_fill') {
        const { data } = await supabase.functions.invoke('generate-briefing-magic-link', {
          body: { briefing_id: currentId }
        });
        if (data?.magicLink) {
          navigator.clipboard.writeText(data.magicLink);
          toast.info("Link de preenchimento gerado e copiado!");
        }
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  if (briefing.isLoading && !isNew) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/pj/briefings")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">{isNew ? "Novo Briefing" : "Editar Briefing"}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave('draft')}>
            <Save className="w-4 h-4 mr-2" /> Salvar Rascunho
          </Button>
          <Button className="gradient-primary" onClick={() => handleSave('pending_fill')}>
            <Send className="w-4 h-4 mr-2" /> Enviar p/ Preenchimento
          </Button>
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Configurações Gerais</CardTitle>
          <CardDescription>Defina quem será o responsável por preencher este briefing.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>Título do Briefing</Label>
            <Input 
              placeholder="Ex: Briefing de Maio - Cliente X" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Email do Freelancer Externo</Label>
            <Input 
              type="email" 
              placeholder="exemplo@freelancer.com" 
              value={externalEmail} 
              onChange={(e) => setExternalEmail(e.target.value)} 
            />
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={["b1"]} className="space-y-4">
        {/* Bloco 1 */}
        <AccordionItem value="b1" className="glass-card px-6 border rounded-xl overflow-hidden">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">1</div>
              <span className="font-semibold text-lg text-left">Identificação</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 pt-2 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Responsável pelo Cliente</Label>
                <Input value={block1.responsavel || ""} onChange={(e) => setBlock1({...block1, responsavel: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Mês de Referência</Label>
                <Input value={block1.mes || ""} onChange={(e) => setBlock1({...block1, mes: e.target.value})} />
              </div>
            </div>
            <div className="space-y-3">
              <Label>Plano Contratado</Label>
              <div className="flex flex-wrap gap-4">
                {["Plano A", "Plano B", "Plano C"].map(p => (
                  <div key={p} className="flex items-center gap-2">
                    <Checkbox 
                      checked={block1.plano?.includes(p)} 
                      onCheckedChange={(checked) => {
                        const newPlano = checked 
                          ? [...(block1.plano || []), p] 
                          : (block1.plano || []).filter((i: string) => i !== p);
                        setBlock1({...block1, plano: newPlano});
                      }}
                    />
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Bloco 2 */}
        <AccordionItem value="b2" className="glass-card px-6 border rounded-xl overflow-hidden">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">2</div>
              <span className="font-semibold text-lg text-left">Objetivo do Mês</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 pt-2 space-y-4">
            <div className="space-y-3">
              <Label>Objetivo Principal</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {["Vendas", "Brand Awareness", "Engajamento", "Autoridade"].map(o => (
                  <div key={o} className="flex items-center gap-2">
                    <Checkbox 
                      checked={block2.objetivos?.includes(o)} 
                      onCheckedChange={(checked) => {
                        const newObjs = checked 
                          ? [...(block2.objetivos || []), o] 
                          : (block2.objetivos || []).filter((i: string) => i !== o);
                        setBlock2({...block2, objetivos: newObjs});
                      }}
                    />
                    <span>{o}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Detalhe o objetivo</Label>
              <Textarea 
                placeholder="Descreva o que se espera alcançar..." 
                value={block2.detalhes || ""}
                onChange={(e) => setBlock2({...block2, detalhes: e.target.value})}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Bloco 3 */}
        <AccordionItem value="b3" className="glass-card px-6 border rounded-xl overflow-hidden">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">3</div>
              <span className="font-semibold text-lg text-left">Planejamento dos Vídeos</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 pt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Tema / Ideia</TableHead>
                  <TableHead className="w-[150px]">Formato</TableHead>
                  <TableHead className="w-[150px]">Gravação</TableHead>
                  <TableHead className="w-[120px]">Prioridade</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videoItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.item_index}</TableCell>
                    <TableCell>
                      <Input value={item.theme} onChange={(e) => {
                        const newItems = [...videoItems];
                        newItems[index].theme = e.target.value;
                        setVideoItems(newItems);
                      }} />
                    </TableCell>
                    <TableCell>
                      <Select value={item.format} onValueChange={(val) => {
                        const newItems = [...videoItems];
                        newItems[index].format = val;
                        setVideoItems(newItems);
                      }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Reel">Reel</SelectItem>
                          <SelectItem value="Talk">Talk</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input type="date" value={item.recording_date || ""} onChange={(e) => {
                        const newItems = [...videoItems];
                        newItems[index].recording_date = e.target.value;
                        setVideoItems(newItems);
                      }} />
                    </TableCell>
                    <TableCell>
                      <Select value={item.priority} onValueChange={(val) => {
                        const newItems = [...videoItems];
                        newItems[index].priority = val;
                        setVideoItems(newItems);
                      }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Normal">Normal</SelectItem>
                          <SelectItem value="Urgente">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeVideoRow(index)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button variant="outline" className="mt-4 w-full border-dashed" onClick={addVideoRow}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar Vídeo
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* Bloco 4 */}
        <AccordionItem value="b4" className="glass-card px-6 border rounded-xl overflow-hidden">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">4</div>
              <span className="font-semibold text-lg text-left">Referências & Identidade</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 pt-2 space-y-6">
            <div className="space-y-3">
              <Label>Tom de Comunicação</Label>
              <div className="flex flex-wrap gap-4">
                {["Descontraído", "Formal", "Didático", "Vendedor"].map(t => (
                  <div key={t} className="flex items-center gap-2">
                    <Checkbox 
                      checked={block4.tons?.includes(t)} 
                      onCheckedChange={(checked) => {
                        const newTons = checked 
                          ? [...(block4.tons || []), t] 
                          : (block4.tons || []).filter((i: string) => i !== t);
                        setBlock4({...block4, tons: newTons});
                      }}
                    />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Referências de vídeos</Label>
              <Textarea 
                placeholder="Links ou descrições de referências..." 
                value={block4.referencias || ""}
                onChange={(e) => setBlock4({...block4, referencias: e.target.value})}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
