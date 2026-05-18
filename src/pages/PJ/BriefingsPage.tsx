import { useState, useEffect } from "react";
import { useBriefings } from "@/hooks/useBriefings";
import { useAppContext } from "@/hooks/useAppContext";
import { useAuthContextSafe } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Send, CheckCircle2, Clock, Archive } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function BriefingsPage() {
  const { mode } = useAppContext();
  const authContext = useAuthContextSafe();
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchWorkspace = async () => {
      const { data } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', authContext?.user?.id)
        .limit(1)
        .maybeSingle();
      
      if (data) setWorkspaceId(data.workspace_id);
    };

    if (authContext?.user?.id) {
      fetchWorkspace();
    }
  }, [authContext?.user?.id]);

  const { templates, responses } = useBriefings(workspaceId);
  const [activeTab, setActiveTab] = useState("responses");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">Aprovado</Badge>;
      case 'pending': return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20">Pendente</Badge>;
      case 'review': return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">Em Revisão</Badge>;
      case 'draft': return <Badge variant="outline">Rascunho</Badge>;
      case 'archived': return <Badge variant="secondary">Arquivado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            Briefings Dinâmicos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie modelos e colete informações estratégicas para seus projetos.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Plus className="w-4 h-4" /> Novo Modelo
          </Button>
          <Button className="gap-2 gradient-primary glow-primary">
            <Send className="w-4 h-4" /> Enviar Briefing
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
          <TabsTrigger value="responses" className="gap-2">
            <CheckCircle2 className="w-4 h-4" /> Respostas
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="w-4 h-4" /> Modelos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="responses" className="space-y-6">
          {responses.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : responses.data?.length === 0 ? (
            <Card className="border-dashed bg-muted/30">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Send className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Nenhum briefing enviado</h3>
                <p className="text-muted-foreground max-w-sm mt-2">
                  Comece enviando um briefing para um colaborador ou freelancer para coletar informações.
                </p>
                <Button className="mt-6 gradient-primary">Enviar meu primeiro briefing</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {responses.data?.map((response: any) => (
                <Card key={response.id} className="glass-card overflow-hidden hover:shadow-xl transition-all duration-300 border-primary/10 group">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      {getStatusBadge(response.status)}
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Clock className="w-4 h-4" />
                      </Button>
                    </div>
                    <CardTitle className="mt-2 line-clamp-1">{response.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      {response.projects?.project || "Sem projeto vinculado"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground flex justify-between items-center">
                        <span>Respondente:</span>
                        <span className="font-medium text-foreground">{response.respondent_name || "Pendente"}</span>
                      </div>
                      <div className="text-sm text-muted-foreground flex justify-between items-center">
                        <span>Data:</span>
                        <span>{format(new Date(response.created_at), "dd 'de' MMM", { locale: ptBR })}</span>
                      </div>
                      <Button className="w-full mt-4 variant-outline group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        Ver Detalhes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          {templates.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Predefined Template: Briefing Completo (6 Blocos) */}
              <Card className="glass-card border-primary/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2">
                  <Badge className="bg-primary text-primary-foreground">Padrão</Badge>
                </div>
                <CardHeader>
                  <CardTitle>Briefing Mestre TaskVision</CardTitle>
                  <CardDescription>
                    O modelo original com 6 blocos: Identificação, Objetivo, Vídeos, Identidade, Restrições e Fechamento.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary" className="text-[10px]">Identificação</Badge>
                    <Badge variant="secondary" className="text-[10px]">Objetivo</Badge>
                    <Badge variant="secondary" className="text-[10px]">+4 blocos</Badge>
                  </div>
                  <Button className="w-full">Usar este modelo</Button>
                </CardContent>
              </Card>

              {templates.data?.map((template: any) => (
                <Card key={template.id} className="glass-card group">
                  <CardHeader>
                    <CardTitle>{template.title}</CardTitle>
                    <CardDescription>{template.description || "Sem descrição"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-xs text-muted-foreground">
                        Criado em {format(new Date(template.created_at), "dd/MM/yyyy")}
                      </span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Archive className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">Editar</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
