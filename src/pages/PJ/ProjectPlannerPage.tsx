import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send, Bot, User, Loader2, AlertCircle, Sparkles,
  ClipboardCheck, Download, RefreshCw, FileText, Code,
  AlertTriangle, CheckCircle2, Calendar, Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjectPlannerChat, type PlannerChatMessage } from "@/hooks/useProjectPlannerChat";
import { useImportProjectPlan } from "@/hooks/useImportProjectPlan";
import { parseAndValidatePlan, type ParsedPlan } from "@/lib/projectPlanParser";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const EXAMPLE_PROMPT = `Cliente: Padaria Pão Quente.
Empresa: Pão Quente LTDA.
Entregáveis: 4 Reels para Instagram, 1 por semana.
Prazo: 30 dias a partir de hoje.
Sem briefing criativo fornecido (usar tom de padaria artesanal, cores quentes).`;

const QUICK_PROMPTS = [
  {
    label: "🥖 Padaria (exemplo)",
    text: EXAMPLE_PROMPT,
  },
  {
    label: "📹 Vídeo institucional",
    text: "Cliente quer 1 vídeo institucional de 60s sobre a empresa deles. Empresa: Clínica Sorriso. Prazo: 15 dias. Público: pacientes 30-60 anos. Tom: acolhedor.",
  },
  {
    label: "🎨 Pacote design mensal",
    text: "Pacote mensal de design: 20 posts para Instagram + 4 capas para stories + 2 banners para site. Cliente: Loja de Roupas X. Mensal recorrente, começar essa semana.",
  },
];

export function ProjectPlannerPage() {
  const navigate = useNavigate();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [agentId, setAgentId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { send, isSending, error } = useProjectPlannerChat();
  const { importPlan, isImporting } = useImportProjectPlan();

  // Garante que o agente "Planejamento de Projeto (IA)" existe para este usuário
  // (RPC ensure_planner_agent é idempotente e por-usuário)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("ensure_planner_agent");
      if (!cancelled) {
        if (error) {
          console.warn("[ProjectPlannerPage] ensure_planner_agent error:", error);
        } else if (data) {
          setAgentId(data as string);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-scroll para o fim do chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, streamingContent]);

  // Faz parse do último turno do assistente para preview
  const lastAssistant = useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      if (turns[i].role === "assistant") return turns[i].content;
    }
    return streamingContent || "";
  }, [turns, streamingContent]);

  const parsedPlan: ParsedPlan | null = useMemo(() => {
    if (!lastAssistant) return null;
    return parseAndValidatePlan(lastAssistant);
  }, [lastAssistant]);

  const handleSend = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isSending) return;

    const nextTurns: ChatTurn[] = [...turns, { role: "user", content }];
    setTurns(nextTurns);
    setInput("");
    setStreamingContent("");

    const apiMessages: PlannerChatMessage[] = nextTurns.map((t) => ({
      role: t.role,
      content: t.content,
    }));

    const result = await send({
      messages: apiMessages,
      agentId: agentId ?? undefined,
      onChunk: (_chunk, full) => setStreamingContent(full),
    });

    if (!result.ok) {
      toast.error(result.error || "Erro ao consultar o planejador");
      return;
    }

    setStreamingContent("");
    setTurns((prev) => [...prev, { role: "assistant", content: result.content }]);
  }, [turns, input, isSending, send]);

  const handleImport = useCallback(async () => {
    if (!parsedPlan) return;
    const result = await importPlan(parsedPlan.plan);
    if (result) {
      navigate(`/pj/projetos/${result.project_id}`);
    }
  }, [parsedPlan, importPlan, navigate]);

  const errorCount = parsedPlan?.warnings.filter((w) => w.severity === "error").length ?? 0;
  const warningCount = parsedPlan?.warnings.filter((w) => w.severity === "warning").length ?? 0;
  const canImport = parsedPlan && errorCount === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            Planejamento IA
          </h1>
          <p className="text-sm text-muted-foreground">
            Cole o contrato ou briefing — receba um plano completo de etapas, tarefas e cronograma.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { setTurns([]); setStreamingContent(""); }}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Nova conversa
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-hidden">
        {/* COLUNA ESQUERDA — CHAT */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="border-b py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="h-4 w-4 text-violet-500" />
              Conversa com o agente
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
              <div className="space-y-3">
                {turns.length === 0 && !streamingContent && (
                  <div className="space-y-3">
                    <Alert>
                      <Sparkles className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Cole um contrato, briefing ou descrição informal dos entregáveis.
                        O agente vai devolver um plano estruturado que pode ser importado direto em Projetos.
                      </AlertDescription>
                    </Alert>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_PROMPTS.map((qp) => (
                        <Button
                          key={qp.label}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleSend(qp.text)}
                          disabled={isSending}
                        >
                          {qp.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {turns.map((turn, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 ${turn.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {turn.role === "assistant" && (
                      <div className="h-7 w-7 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                    <div
                      className={`rounded-lg px-3 py-2 max-w-[85%] text-sm ${
                        turn.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {turn.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none [&>*]:my-1 [&_p]:my-1 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-xs [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_table]:text-xs">
                          <ReactMarkdown>{stripCodeFence(turn.content)}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{turn.content}</div>
                      )}
                    </div>
                    {turn.role === "user" && (
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}

                {streamingContent && (
                  <div className="flex gap-2 justify-start">
                    <div className="h-7 w-7 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="rounded-lg px-3 py-2 max-w-[85%] text-sm bg-muted">
                      <div className="prose prose-sm max-w-none [&>*]:my-1 [&_p]:my-1 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-xs [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_table]:text-xs">
                        <ReactMarkdown>{stripCodeFence(streamingContent)}</ReactMarkdown>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        gerando...
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </ScrollArea>

            <div className="border-t p-3 space-y-2">
              <Textarea
                placeholder="Cole aqui o contrato, briefing ou descreva a demanda..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={4}
                disabled={isSending}
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Ctrl+Enter para enviar
                </span>
                <Button onClick={() => handleSend()} disabled={!input.trim() || isSending} size="sm">
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      Enviar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* COLUNA DIREITA — PREVIEW */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="border-b py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-emerald-500" />
                Plano gerado
              </CardTitle>
              {parsedPlan && (
                <div className="flex items-center gap-2">
                  {errorCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {errorCount} erro{errorCount > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {warningCount > 0 && errorCount === 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {warningCount} aviso{warningCount > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {errorCount === 0 && warningCount === 0 && parsedPlan && (
                    <Badge variant="default" className="text-xs bg-emerald-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      OK
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
            {!parsedPlan && (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-6 text-center">
                O plano gerado pelo agente aparece aqui em formato Markdown + JSON,
                com botões para importar em Projetos quando válido.
              </div>
            )}

            {parsedPlan && (
              <Tabs defaultValue="summary" className="flex-1 flex flex-col">
                <TabsList className="m-2 self-start">
                  <TabsTrigger value="summary" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    Resumo
                  </TabsTrigger>
                  <TabsTrigger value="json" className="text-xs">
                    <Code className="h-3 w-3 mr-1" />
                    JSON
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="flex-1 overflow-auto px-4 pb-4 mt-0">
                  <PlanSummary parsed={parsedPlan} />
                </TabsContent>

                <TabsContent value="json" className="flex-1 overflow-auto px-4 pb-4 mt-0">
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(parsedPlan.plan, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>
            )}

            {parsedPlan && (
              <div className="border-t p-3 flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground truncate">
                  {parsedPlan.totalStages} etapas · {parsedPlan.totalTasks} tarefas · {parsedPlan.totalEstimatedHours.toFixed(1)}h
                </div>
                <Button
                  onClick={handleImport}
                  disabled={!canImport || isImporting}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-1" />
                      Importar no Projetos
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function stripCodeFence(text: string): string {
  // Remove o bloco ```json-project-plan ... ``` para que o ReactMarkdown
  // não renderize o JSON cru junto com o texto explicativo.
  return text.replace(/```json-project-plan[\s\S]*?```/g, "\n\n_(bloco de importação JSON detectado — veja a aba ao lado)_\n");
}

function PlanSummary({ parsed }: { parsed: ParsedPlan }) {
  const { plan, warnings } = parsed;
  const errors = warnings.filter((w) => w.severity === "error");
  const warns = warnings.filter((w) => w.severity === "warning");

  return (
    <div className="space-y-3 text-sm">
      {/* Cabeçalho do projeto */}
      <div className="rounded-md border p-3 space-y-1">
        <div className="font-semibold text-base">{plan.project.name}</div>
        <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {plan.project.client_name}
            {plan.project.company_name && ` (${plan.project.company_name})`}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Prazo: {plan.project.deadline}
          </span>
          {plan.project.category_name && (
            <Badge variant="outline" className="text-xs">{plan.project.category_name}</Badge>
          )}
          <Badge variant="outline" className="text-xs">P{plan.project.priority}</Badge>
        </div>
      </div>

      {/* Work calendar */}
      {plan.work_calendar && (
        <div className={`rounded-md border p-3 space-y-1 ${plan.work_calendar.feasible ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-amber-50 dark:bg-amber-950/20"}`}>
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium">
              {plan.work_calendar.feasible ? "✅ Factível" : "⚠️ Atenção"}
            </div>
            <div className="text-xs text-muted-foreground">
              {plan.work_calendar.estimated_effort_hours.toFixed(1)}h estimadas · {plan.work_calendar.available_capacity_hours.toFixed(1)}h disponíveis
            </div>
          </div>
          {plan.work_calendar.feasibility_note && (
            <div className="text-xs text-muted-foreground">
              {plan.work_calendar.feasibility_note}
            </div>
          )}
        </div>
      )}

      {/* Erros */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <div className="font-medium mb-1">Erros que impedem a importação:</div>
            <ul className="list-disc list-inside space-y-0.5">
              {errors.slice(0, 5).map((e, i) => (
                <li key={i}>{e.path}: {e.message}</li>
              ))}
              {errors.length > 5 && <li>... e mais {errors.length - 5}</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Avisos */}
      {warns.length > 0 && errors.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <div className="font-medium mb-1">Avisos:</div>
            <ul className="list-disc list-inside space-y-0.5">
              {warns.slice(0, 5).map((w, i) => (
                <li key={i}>{w.path}: {w.message}</li>
              ))}
              {warns.length > 5 && <li>... e mais {warns.length - 5}</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Etapas */}
      <div>
        <div className="font-medium text-xs mb-2 text-muted-foreground">ETAPAS ({plan.stages.length})</div>
        <div className="space-y-2">
          {plan.stages.map((stage, si) => (
            <div key={si} className="rounded-md border p-2">
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-sm">
                  {si + 1}. {stage.name}
                </div>
                <Badge variant="outline" className="text-xs">
                  {stage.deadline} · {stage.sla_days}d
                </Badge>
              </div>
              {stage.notes && (
                <div className="text-xs text-muted-foreground mb-1.5">{stage.notes}</div>
              )}
              <div className="space-y-1">
                {stage.tasks.map((task, ti) => (
                  <div key={ti} className="text-xs flex items-start gap-2 border-l-2 border-muted pl-2 py-0.5">
                    <span className="flex-1">
                      <span className="font-medium">{task.title}</span>
                      {task.assigned_to_name && (
                        <span className="text-muted-foreground"> · {task.assigned_to_name}</span>
                      )}
                    </span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {task.deadline} · {task.estimated_hours}h
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProjectPlannerPage;
