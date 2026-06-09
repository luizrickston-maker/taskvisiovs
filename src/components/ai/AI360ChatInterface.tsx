import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  AlertCircle, 
  Lightbulb, 
  RefreshCw, 
  ExternalLink, 
  Settings2,
  Trash2,
  Check,
  X as XIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAskAI360Agent } from '@/hooks/useAI360Agent';
import { useAiAgents, useDefaultAiAgent } from '@/hooks/useAiAgents';
import { useAppStore } from '@/stores/useAppStore';
import { useRemoveEditorialCalendarItem } from '@/hooks/useEditorialCalendar';
import { useBriefings } from '@/hooks/useBriefings';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { ChatMessage, AIConversation, AIMessage } from '@/types/ai';
import ReactMarkdown from 'react-markdown';
import { useAIConversations, useAIMessages, useCreateConversation, useAddMessage, useDeleteConversation } from '@/hooks/useAiHistory';
import { useAiActionDispatcher } from '@/hooks/useAiActionDispatcher';


import { useQuery } from '@tanstack/react-query';

interface AI360ChatInterfaceProps {
  agentId?: string;
}

// Module link patterns for TaskVision PRO
const MODULE_LINKS: Record<string, { path: string; label: string; color: string }> = {
  projetos: { path: '/pj/projetos', label: 'Projetos', color: 'bg-blue-500/10 text-blue-500' },
  projeto: { path: '/pj/projetos', label: 'Projetos', color: 'bg-blue-500/10 text-blue-500' },
  tarefas: { path: '/foco', label: 'Foco', color: 'bg-amber-500/10 text-amber-500' },
  tarefa: { path: '/foco', label: 'Foco', color: 'bg-amber-500/10 text-amber-500' },
  vendas: { path: '/comercial', label: 'Comercial', color: 'bg-emerald-500/10 text-emerald-500' },
  pipeline: { path: '/comercial', label: 'Comercial', color: 'bg-emerald-500/10 text-emerald-500' },
  prospects: { path: '/comercial', label: 'Comercial', color: 'bg-emerald-500/10 text-emerald-500' },
  prospect: { path: '/comercial', label: 'Comercial', color: 'bg-emerald-500/10 text-emerald-500' },
  agenda: { path: '/foco', label: 'Foco', color: 'bg-violet-500/10 text-violet-500' },
  compromissos: { path: '/foco', label: 'Foco', color: 'bg-violet-500/10 text-violet-500' },
  editorial: { path: '/pj/calendario-editorial', label: 'Editorial', color: 'bg-pink-500/10 text-pink-500' },
  conteúdos: { path: '/pj/calendario-editorial', label: 'Editorial', color: 'bg-pink-500/10 text-pink-500' },
  conteudo: { path: '/pj/calendario-editorial', label: 'Editorial', color: 'bg-pink-500/10 text-pink-500' },
  equipe: { path: '/pj/time', label: 'Time', color: 'bg-cyan-500/10 text-cyan-500' },
  time: { path: '/pj/time', label: 'Time', color: 'bg-cyan-500/10 text-cyan-500' },
  financeiro: { path: '/pj/financeiro', label: 'Financeiro', color: 'bg-green-500/10 text-green-500' },
  finanças: { path: '/financas', label: 'Finanças', color: 'bg-green-500/10 text-green-500' },
  caixa: { path: '/caixa', label: 'Caixa', color: 'bg-indigo-500/10 text-indigo-500' },
  metas: { path: '/comercial', label: 'Comercial', color: 'bg-emerald-500/10 text-emerald-500' },
};

const QUICK_PROMPTS = [
  { label: '📊 Resumo do dia', prompt: 'Me dê um resumo executivo do meu dia: tarefas prioritárias, compromissos e oportunidades de vendas.' },
  { label: '⚠️ Pendências críticas', prompt: 'Quais são as pendências mais críticas que preciso resolver hoje? Liste por prioridade.' },
  { label: '💰 Status de vendas', prompt: 'Qual é o status atual do meu pipeline de vendas? Destaque oportunidades quentes e em risco.' },
  { label: '📅 Próximas 48h', prompt: 'O que tenho planejado para as próximas 48 horas? Inclua compromissos, tarefas e prazos.' },
];

export function AI360ChatInterface({ agentId: propAgentId }: AI360ChatInterfaceProps) {
  const navigate = useNavigate();
  const { data: agents, isLoading: agentsLoading } = useAiAgents();
  const { data: defaultAgent } = useDefaultAiAgent();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(propAgentId);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: string;
    id: string;
    name: string;
    messageIndex: number;
    amount?: number;
    category?: string;
    notes?: string;
  } | null>(null);

  const { data: historyMessages } = useAIMessages(activeConversationId);
  const createConversation = useCreateConversation();
  const addMessage = useAddMessage();
  const deleteConversation = useDeleteConversation();

  // Load history when conversation changes
  useEffect(() => {
    if (activeConversationId && historyMessages) {
      setMessages(historyMessages.map(m => ({
        role: m.role as any,
        content: m.content
      })));
    } else if (!activeConversationId) {
      setMessages([]);
    }
  }, [activeConversationId, historyMessages]);

  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Hooks for deletion
  const { deleteTask } = useAppStore();
  const { deleteProject } = useAppStore();
  const { deleteProspect } = useAppStore();
  const removeEditorialItem = useRemoveEditorialCalendarItem();

  const {
    processAiResponse,
    pendingAction: dispatcherPendingAction,
    confirmAction: dispatcherConfirmAction,
    cancelAction: dispatcherCancelAction,
    isConfirming: isDispatcherConfirming,
  } = useAiActionDispatcher();
  
  // Briefings need a workspace ID, let's try to get it
  const { data: workspaceId } = useQuery({
    queryKey: ['user-workspace-id'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_user_workspace_id');
      return data;
    }
  });
  const { deleteBriefing } = useBriefings(workspaceId);

  const { mutate: askAgent, isPending } = useAskAI360Agent();

  // Set default agent when loaded
  useEffect(() => {
    if (!selectedAgentId && defaultAgent) {
      setSelectedAgentId(defaultAgent.id);
    }
  }, [defaultAgent, selectedAgentId]);

  // Get selected agent info for display
  const selectedAgent = useMemo(() => {
    if (!selectedAgentId || !agents) return null;
    return agents.find(a => a.id === selectedAgentId) ?? null;
  }, [selectedAgentId, agents]);

  // Filter only active agents for selection
  const activeAgents = useMemo(() => {
    return agents?.filter(a => a.is_active) ?? [];
  }, [agents]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleSend = useCallback(async (customPrompt?: string) => {
    const messageContent = customPrompt ?? input.trim();
    
    if (!messageContent || isPending) return;

    setError(null);
    setInput('');
    setStreamingContent('');

    let currentConvId = activeConversationId;
    
    try {
      // 1. Ensure we have a conversation
      if (!currentConvId) {
        const newConv = await createConversation.mutateAsync({
          agentId: selectedAgentId,
          title: messageContent.slice(0, 40) + (messageContent.length > 40 ? '...' : ''),
        });
        currentConvId = newConv.id;
        setActiveConversationId(newConv.id);
      }

      const userMessage: ChatMessage = { role: 'user', content: messageContent };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);

      // Save user message to DB
      await addMessage.mutateAsync({
        conversationId: currentConvId,
        role: 'user',
        content: messageContent,
      });

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      askAgent(
        {
          messages: newMessages,
          agentId: selectedAgentId,
          signal: abortControllerRef.current.signal,
          onChunk: (chunk) => {
            setStreamingContent((prev) => prev + chunk);
          },
        },
        {
        onSuccess: async (fullContent) => {
          const newAssistantMessage: ChatMessage = { role: 'assistant', content: fullContent };
          setMessages((prev) => [
            ...prev,
            newAssistantMessage,
          ]);
          setStreamingContent('');

          // Save assistant message to DB
          await addMessage.mutateAsync({
            conversationId: currentConvId!,
            role: 'assistant',
            content: fullContent,
          });

          // Handle all action tokens via central dispatcher
          await processAiResponse(fullContent);

          // Legacy: also check REQUEST_DELETE for inline confirm UI
          const deleteMatch = fullContent.match(/\[REQUEST_DELETE: type=(.+), id=(.+), name="(.+)"\]/);
          if (deleteMatch) {
            setPendingAction({
              type: deleteMatch[1].trim(),
              id: deleteMatch[2].trim(),
              name: deleteMatch[3].trim(),
              messageIndex: newMessages.length
            });
          }
        },

          onError: (err) => {
            setError(err.message);
            setStreamingContent('');
          },
        }
      );
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao iniciar conversa');
    }
  }, [input, messages, selectedAgentId, isPending, askAgent, activeConversationId, createConversation, addMessage, processAiResponse]);


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
    setStreamingContent('');
    setError(null);
    setPendingAction(null);
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    const { type, id, name } = pendingAction;
    let success = false;

    // UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.error('ID inválido detectado:', id);
      toast.error(`Erro: A IA forneceu um identificador inválido (${id}). Por favor, tente listar os itens novamente.`);
      setPendingAction(null);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      console.log(`Executando exclusão de ${type} com ID: ${id}`);

      switch (type.toLowerCase()) {
        case 'investment':
        case 'investimento':
          const { error: invError } = await supabase.from('corporate_investments').delete().eq('id', id);
          if (invError) throw invError;
          const { deleteCorporateInvestment } = useAppStore.getState();
          deleteCorporateInvestment(id);
          success = true;
          break;

        case 'task':
        case 'tarefa':
          const { error: taskError } = await supabase.from('tasks').delete().eq('id', id);
          if (taskError) throw taskError;
          const { deleteTask } = useAppStore.getState();
          deleteTask(id);
          success = true;
          break;
        
        case 'project':
        case 'projeto':
          const { error: projectError } = await supabase.from('projects').delete().eq('id', id);
          if (projectError) throw projectError;
          const { deleteProject } = useAppStore.getState();
          deleteProject(id);
          success = true;
          break;

        case 'prospect':
        case 'oportunidade':
          const { error: prospectError } = await supabase.from('prospects').delete().eq('id', id);
          if (prospectError) throw prospectError;
          const { deleteProspect } = useAppStore.getState();
          deleteProspect(id);
          success = true;
          break;

        case 'editorial_item':
        case 'conteudo':
        case 'editorial':
          await removeEditorialItem.mutateAsync(id);
          success = true;
          break;

        case 'briefing':
        case 'roteiro':
        case 'script':
          await deleteBriefing.mutateAsync(id);
          success = true;
          break;

        default:
          toast.error(`Ação para o tipo "${type}" ainda não implementada.`);
          break;
      }

      if (success) {
        toast.success(`"${name}" removido com sucesso.`);
        setPendingAction(null);
        
        const confirmContent = `✅ Confirmado! O item "${name}" foi removido com sucesso.`;
        
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: confirmContent }
        ]);

        if (activeConversationId) {
          await addMessage.mutateAsync({
            conversationId: activeConversationId,
            role: 'assistant',
            content: confirmContent
          });
        }
      }
    } catch (err: any) {
      console.error('Error executing action:', err);
      toast.error(`Erro ao executar exclusão: ${err.message || 'Erro desconhecido'}`);
    }
  };



  const handleCancelAction = () => {
    setPendingAction(null);
    setMessages(prev => [
      ...prev,
      { role: 'assistant', content: `❌ Ação de exclusão cancelada.` }
    ]);
  };

  return (
    <Card className="glass-card flex flex-col" style={{ minHeight: '500px' }}>
      <CardHeader className="border-b pb-4 space-y-3">
        <div className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Chat com o Agente</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="mr-1 h-4 w-4" />
                Limpar
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/pj/agentes-ia')}
              className="h-8 w-8"
              title="Gerenciar Agentes"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Agent Selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground shrink-0">Agente:</span>
          <Select
            value={selectedAgentId ?? ''}
            onValueChange={setSelectedAgentId}
            disabled={agentsLoading || isPending}
          >
            <SelectTrigger className="w-full max-w-xs h-8 text-sm">
              <SelectValue placeholder="Selecione um agente..." />
            </SelectTrigger>
            <SelectContent>
              {activeAgents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center gap-2">
                    <span>{agent.name}</span>
                    {agent.is_default && (
                      <Badge variant="outline" className="text-xs py-0 px-1">
                        Padrão
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedAgent && (
            <Badge variant="secondary" className="text-xs shrink-0">
              {selectedAgent.model_name.split('/').pop()}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 p-4">
        {/* Quick Prompts - Show when no messages */}
        {messages.length === 0 && !isPending && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lightbulb className="h-5 w-5" />
              <span className="text-sm font-medium">Sugestões rápidas</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {QUICK_PROMPTS.map((item) => (
                <Button
                  key={item.label}
                  variant="outline"
                  className="h-auto justify-start whitespace-normal py-3 text-left"
                  onClick={() => handleSend(item.prompt)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {(messages.length > 0 || isPending) && (
          <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <MessageBubble 
                  key={index} 
                  message={message} 
                  isActionPending={pendingAction?.messageIndex === index}
                  actionDetails={pendingAction?.messageIndex === index ? {
                    type: pendingAction.type,
                    id: pendingAction.id,
                    name: pendingAction.name
                  } : undefined}
                  onConfirmAction={handleConfirmAction}
                  onCancelAction={handleCancelAction}
                  onSuggestDelete={(type, id, name) => {
                    setPendingAction({
                      type,
                      id,
                      name,
                      messageIndex: index
                    });
                  }}
                />
              ))}

              {/* Streaming content */}
              {streamingContent && (
                <MessageBubble
                  message={{ role: 'assistant', content: streamingContent }}
                  isStreaming
                />
              )}

              {/* Loading indicator */}
              {isPending && !streamingContent && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Analisando seus dados...</span>
                </div>
              )}
            </div>
          </ScrollArea>
        )}


        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Dispatcher pending confirmation banner */}
        {dispatcherPendingAction && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 space-y-2">
            <p className="text-sm font-semibold text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Confirmar exclusão de &quot;{dispatcherPendingAction.name}&quot;?
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={dispatcherCancelAction}
                disabled={isDispatcherConfirming}
                className="h-8 gap-1"
              >
                <XIcon className="h-3.5 w-3.5" />
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={dispatcherConfirmAction}
                disabled={isDispatcherConfirming}
                className="h-8 gap-1"
              >
                {isDispatcherConfirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5" /> Confirmar</>}
              </Button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte algo sobre suas operações..."
            className="min-h-[44px] flex-1 resize-none"
            rows={1}
            disabled={isPending}
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isPending}
            size="icon"
            className="shrink-0"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// Message Bubble Component
// =====================================================

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  onConfirmAction?: () => void;
  onCancelAction?: () => void;
  isActionPending?: boolean;
  actionDetails?: { type: string; id: string; name: string };
  onSuggestDelete?: (type: string, id: string, name: string) => void;
}

function MessageBubble({ 
  message, 
  isStreaming, 
  onConfirmAction, 
  onCancelAction,
  isActionPending,
  actionDetails,
  onSuggestDelete
}: MessageBubbleProps) {

  const isUser = message.role === 'user';
  const navigate = useNavigate();

  // Clean content from internal tags
  const cleanContent = useMemo(() => {
    return message.content
      .replace(/\[REQUEST_DELETE: type=.+, id=.+, name=".+"\]/g, '')
      .replace(/\[DELETE_SUGGESTION: type=(.+), id=(.+), name="(.+)"\]/g, '$3')
      .replace(/\| (.*?) \| R\$ (.*?) \| (.*?) \| (.*?) \|/g, '| $1 | R$ $2 | $3 |')
      .trim();
  }, [message.content]);


  // Extract module references from the message
  const moduleLinks = useMemo(() => {
    if (isUser) return [];
    
    const foundModules = new Set<string>();
    const content = message.content.toLowerCase();
    
    Object.keys(MODULE_LINKS).forEach((keyword) => {
      if (content.includes(keyword)) {
        foundModules.add(keyword);
      }
    });

    // Deduplicate by path
    const uniquePaths = new Map<string, { path: string; label: string; color: string }>();
    foundModules.forEach((keyword) => {
      const link = MODULE_LINKS[keyword];
      if (!uniquePaths.has(link.path)) {
        uniquePaths.set(link.path, link);
      }
    });

    return Array.from(uniquePaths.values());
  }, [message.content, isUser]);

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="max-w-[85%] space-y-2">
        <div
          className={`rounded-lg px-4 py-2 ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-foreground'
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground">
              <ReactMarkdown
                components={{
                  // Custom link rendering
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {children}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ),
                  // Better table styling
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-2">
                      <table className="min-w-full text-sm border-collapse">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border-b border-border px-2 py-1 text-left font-medium">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border-b border-border/50 px-2 py-1">
                      {children}
                    </td>
                  ),
                }}
              >
                {cleanContent}
              </ReactMarkdown>

              {!isUser && !isStreaming && message.content.includes('[DELETE_SUGGESTION:') && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {Array.from(message.content.matchAll(/\[DELETE_SUGGESTION: type=(.+?), id=(.+?), name="(.+?)"\]/g)).map((match, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="h-8 border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-1.5"
                      onClick={() => onSuggestDelete?.(match[1].trim(), match[2].trim(), match[3].trim())}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Apagar "{match[3].trim()}"
                    </Button>
                  ))}
                </div>
              )}

              
              {isActionPending && actionDetails && (
                <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-3">
                    <Trash2 className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <p className="font-semibold text-destructive">Confirmação de Exclusão</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Você deseja excluir permanentemente: <span className="font-bold text-foreground">"{actionDetails.name}"</span>?
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={onCancelAction}
                      className="h-8 gap-1"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                      Cancelar
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={onConfirmAction}
                      className="h-8 gap-1"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Aprovar Exclusão
                    </Button>
                  </div>
                </div>
              )}

              {isStreaming && (
                <span className="inline-block h-4 w-1 animate-pulse bg-primary ml-1" />
              )}
            </div>
          )}
        </div>

        {/* Module Quick Links */}
        {!isUser && moduleLinks.length > 0 && !isStreaming && (
          <div className="flex flex-wrap gap-1.5 pl-1">
            {moduleLinks.map((link) => (
              <Badge
                key={link.path}
                variant="outline"
                className={`cursor-pointer hover:opacity-80 transition-opacity ${link.color}`}
                onClick={() => navigate(link.path)}
              >
                {link.label}
                <ExternalLink className="ml-1 h-3 w-3" />
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
