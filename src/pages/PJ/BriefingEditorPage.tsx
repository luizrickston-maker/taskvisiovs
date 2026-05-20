import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useBriefingEditor, useGenerateMagicLink } from "@/hooks/useBriefingEditor";
import { useAuthContextSafe } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Accordion } from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Save, 
  Send, 
  Loader2,
  Copy,
  Users
} from "lucide-react";
import { toast } from "sonner";
import { BriefingStatus, BriefingWithDetails, BriefingType, EditingDetails } from "@/types/briefing";
import { BriefingHeader } from "@/components/briefings/BriefingHeader";
import { BriefingBlockWrapper } from "@/components/briefings/BriefingBlockWrapper";
import { BriefingBlock1 } from "@/components/briefings/BriefingBlock1";
import { BriefingBlock2 } from "@/components/briefings/BriefingBlock2";
import { BriefingBlock3 } from "@/components/briefings/BriefingBlock3";
import { BriefingBlock4 } from "@/components/briefings/BriefingBlock4";
import { BriefingBlock5 } from "@/components/briefings/BriefingBlock5";
import { BriefingBlock6 } from "@/components/briefings/BriefingBlock6";
import { BriefingEditingBlock } from "@/components/briefings/BriefingEditingBlock";
import { FileText, Video as VideoIcon, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BriefingEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const authContext = useAuthContextSafe();
  const queryClient = useQueryClient();
  const isNew = !id;
  
  const { briefing, updateBriefing, updateResponse, manageVideoItems } = useBriefingEditor(id);
  const generateMagicLink = useGenerateMagicLink();
  
  const [title, setTitle] = useState("");
  const [briefingType, setBriefingType] = useState<BriefingType>("creative");
  const [clientId, setClientId] = useState<string>("");
  const [clients, setClients] = useState<any[]>([]);
  const [assignedUserId, setAssignedUserId] = useState<string>("");
  const [workspaceUsers, setWorkspaceUsers] = useState<any[]>([]);
  const [externalEmail, setExternalEmail] = useState("");
  
  // States for blocks
  const [block1, setBlock1] = useState<any>({});
  const [block2, setBlock2] = useState<any>({});
  const [videoItems, setVideoItems] = useState<any[]>([]);
  const [block4, setBlock4] = useState<any>({});
  const [block5, setBlock5] = useState<any>({});
  const [block6, setBlock6] = useState<any>({});
  const [editingDetails, setEditingDetails] = useState<EditingDetails>({});

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadWorkspaceData = async () => {
      if (!authContext?.user?.id) return;
      
      const { data: memberData } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', authContext.user.id)
        .limit(1)
        .maybeSingle();
        
      if (memberData?.workspace_id) {
        // Fetch clients
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, name, default_editing_profile, video_management_enabled')
          .eq('workspace_id', memberData.workspace_id);
        if (clientsData) setClients(clientsData);

        // Fetch workspace users for assignment
        const { data: usersData } = await supabase
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', memberData.workspace_id);
        if (usersData) setWorkspaceUsers(usersData);
      }
    };
    loadWorkspaceData();
  }, [authContext?.user?.id]);

  useEffect(() => {
    if (briefing.data) {
      const data = briefing.data as BriefingWithDetails;
      setTitle(data.title);
      setClientId(data.client_id || "");
      setAssignedUserId(data.assigned_to_user_id || "");
      setExternalEmail(data.external_filler_email || "");
      
      data.responses.forEach((resp) => {
        const blockData = resp.response_data;
        if (resp.block_name === 'identificacao') setBlock1(blockData);
        if (resp.block_name === 'estrutura') setBlock2(blockData);
        if (resp.block_name === 'referencias') setBlock4(blockData);
        if (resp.block_name === 'distribuicao') setBlock5(blockData);
        if (resp.block_name === 'prazos') setBlock6(blockData);
      });
      
      setVideoItems(data.video_items.sort((a, b) => a.item_index - b.item_index));
    }
  }, [briefing.data]);

  const handleSave = async (status: BriefingStatus = 'draft') => {
    if (!title) {
      toast.error("Por favor, informe o título do briefing.");
      return;
    }

    setIsSaving(true);
    try {
      let currentId = id;
      
      if (isNew) {
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
            client_id: clientId && clientId !== "none" ? clientId : null,
            assigned_to_user_id: assignedUserId && assignedUserId !== "none" ? assignedUserId : null,
            external_filler_email: externalEmail || null,
            workspace_id: memberData.workspace_id,
            created_by_user_id: authContext?.user?.id,
            status
          }])
          .select()
          .single();
        
        if (error) throw error;
        currentId = newBriefing.id;
        await queryClient.invalidateQueries({ queryKey: ['briefings'] });
        toast.success("Briefing criado com sucesso!");
        navigate(`/pj/briefings/${currentId}/editar`, { replace: true });
      } else {
        await updateBriefing.mutateAsync({
          title,
          client_id: clientId && clientId !== "none" ? clientId : null,
          assigned_to_user_id: assignedUserId && assignedUserId !== "none" ? assignedUserId : null,
          external_filler_email: externalEmail || null,
          status
        });
      }

      // Save blocks in parallel
      const blockPromises = [
        updateResponse.mutateAsync({ block_name: 'identificacao', response_data: block1, briefingId: currentId! }),
        updateResponse.mutateAsync({ block_name: 'estrutura', response_data: block2, briefingId: currentId! }),
        updateResponse.mutateAsync({ block_name: 'referencias', response_data: block4, briefingId: currentId! }),
        updateResponse.mutateAsync({ block_name: 'distribuicao', response_data: block5, briefingId: currentId! }),
        updateResponse.mutateAsync({ block_name: 'prazos', response_data: block6, briefingId: currentId! }),
        manageVideoItems.mutateAsync({ items: videoItems, briefingId: currentId! })
      ];

      await Promise.all(blockPromises);
      await queryClient.invalidateQueries({ queryKey: ['briefings'] });

      if (status === 'pending_fill') {
        const result = await generateMagicLink.mutateAsync(currentId!);
        if (result?.magicLink) {
          navigator.clipboard.writeText(result.magicLink);
          toast.success("Link de preenchimento gerado e copiado para a área de transferência!");
        }
      } else if (!isNew) {
        toast.success("Briefing atualizado com sucesso!");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const copyMagicLink = async () => {
    if (!id) return;
    try {
      const result = await generateMagicLink.mutateAsync(id);
      if (result?.magicLink) {
        navigator.clipboard.writeText(result.magicLink);
        toast.success("Link copiado!");
      }
    } catch (error) {
      toast.error("Erro ao gerar link.");
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
    <div className="container mx-auto p-6 max-w-5xl space-y-8 animate-in fade-in duration-500">
      <BriefingHeader 
        title={isNew ? "Novo Briefing" : "Editar Briefing"}
        subtitle="Configure a estrutura e os responsáveis pelo preenchimento"
        status={briefing.data?.status}
        backPath="/pj/briefings"
      >
        {!isNew && briefing.data?.status === 'pending_fill' && (
          <Button variant="outline" size="sm" onClick={copyMagicLink} disabled={generateMagicLink.isPending}>
            <Copy className="w-4 h-4 mr-2" /> Copiar Link Mágico
          </Button>
        )}
        <Button variant="outline" onClick={() => handleSave('draft')} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Rascunho
        </Button>
        <Button className="gradient-primary" onClick={() => handleSave('pending_fill')} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
          Enviar para Preenchimento
        </Button>
      </BriefingHeader>

      <Card className="glass-card overflow-hidden border-primary/10">
        <CardHeader className="bg-primary/5">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <div>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>Defina o cliente e quem será o responsável por responder este briefing.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
          <div className="space-y-2">
            <Label>Título do Briefing</Label>
            <Input 
              placeholder="Ex: Conteúdo de Maio - Cliente X" 
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
            <Label>Responsável (Interno)</Label>
            <Select value={assignedUserId} onValueChange={setAssignedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um membro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum (Usar Externo)</SelectItem>
                {workspaceUsers.map(u => (
                  <SelectItem key={u.user_id} value={u.user_id}>
                    {u.user_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 lg:col-span-3">
            <Label>Email do Freelancer Externo (Opcional)</Label>
            <Input 
              type="email" 
              placeholder="exemplo@freelancer.com" 
              value={externalEmail} 
              onChange={(e) => setExternalEmail(e.target.value)} 
            />
            <p className="text-[10px] text-muted-foreground italic">
              Se preenchido, um link mágico será gerado para este email quando você clicar em "Enviar para Preenchimento".
            </p>
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={["b1", "b2", "b3"]} className="space-y-4">
        <BriefingBlockWrapper value="b1" number={1} title="Detalhes do Cliente e Projeto">
          <BriefingBlock1 data={block1} onChange={setBlock1} />
        </BriefingBlockWrapper>

        <BriefingBlockWrapper value="b2" number={2} title="Estrutura e Formato">
          <BriefingBlock2 data={block2} onChange={setBlock2} />
        </BriefingBlockWrapper>

        <BriefingBlockWrapper value="b3" number={3} title="Planejamento dos Vídeos (Temas)">
          <BriefingBlock3 items={videoItems} onChange={setVideoItems} />
        </BriefingBlockWrapper>

        <BriefingBlockWrapper value="b4" number={4} title="Referências e Identidade Visual">
          <BriefingBlock4 data={block4} onChange={setBlock4} />
        </BriefingBlockWrapper>

        <BriefingBlockWrapper value="b5" number={5} title="Distribuição e Canais">
          <BriefingBlock5 data={block5} onChange={setBlock5} />
        </BriefingBlockWrapper>

        <BriefingBlockWrapper value="b6" number={6} title="Prazos e Orçamento">
          <BriefingBlock6 data={block6} onChange={setBlock6} />
        </BriefingBlockWrapper>
      </Accordion>
    </div>
  );
}
