import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Bot, User, Loader2, AlertCircle, Lightbulb, RefreshCw, ExternalLink, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAskPersonalAI360Agent } from '@/hooks/usePersonalAI360Agent';
import { useAiAgents, useDefaultAiAgent } from '@/hooks/useAiAgents';
import type { ChatMessage, AIConversation, AIMessage } from '@/types/ai';
import ReactMarkdown from 'react-markdown';
import { useAIConversations, useAIMessages, useCreateConversation, useAddMessage, useDeleteConversation } from '@/hooks/useAiHistory';
import { toast } from 'sonner';


// Module link patterns for Personal context
const MODULE_LINKS: Record<string, { path: string; label: string; color: string }> = {
  finanças: { path: '/financas', label: 'Finanças', color: 'bg-emerald-500/10 text-emerald-500' },
  financas: { path: '/financas', label: 'Finanças', color: 'bg-emerald-500/10 text-emerald-500' },
  receitas: { path: '/financas', label: 'Finanças', color: 'bg-emerald-500/10 text-emerald-500' },
  despesas: { path: '/financas', label: 'Finanças', color: 'bg-emerald-500/10 text-emerald-500' },
  poupança: { path: '/financas', label: 'Finanças', color: 'bg-emerald-500/10 text-emerald-500' },
  dívidas: { path: '/caixa', label: 'Caixa', color: 'bg-rose-500/10 text-rose-500' },
  contas: { path: '/caixa', label: 'Caixa', color: 'bg-rose-500/10 text-rose-500' },
  tarefas: { path: '/foco', label: 'Foco', color: 'bg-amber-500/10 text-amber-500' },
  inbox: { path: '/foco', label: 'Foco', color: 'bg-amber-500/10 text-amber-500' },
  agenda: { path: '/foco', label: 'Foco', color: 'bg-violet-500/10 text-violet-500' },
  compromissos: { path: '/foco', label: 'Foco', color: 'bg-violet-500/10 text-violet-500' },
  metas: { path: '/planejamento', label: 'Planejamento', color: 'bg-blue-500/10 text-blue-500' },
  compras: { path: '/planejamento', label: 'Planejamento', color: 'bg-blue-500/10 text-blue-500' },
  projetos: { path: '/projetos', label: 'Projetos', color: 'bg-cyan-500/10 text-cyan-500' },
  roteiros: { path: '/roteiros', label: 'Roteiros', color: 'bg-pink-500/10 text-pink-500' },
  scripts: { path: '/roteiros', label: 'Roteiros', color: 'bg-pink-500/10 text-pink-500' },
  conteúdos: { path: '/conteudos', label: 'Conteúdos', color: 'bg-purple-500/10 text-purple-500' },
};

const QUICK_PROMPTS = [
  { label: '💰 Resumo financeiro', prompt: 'Me dê um resumo financeiro do mês: receitas, despesas, saldo e dívidas pendentes.' },
  { label: '✅ Tarefas do dia', prompt: 'Quais são minhas tarefas prioritárias para hoje? Inclua as atrasadas também.' },
  { label: '🎯 Progresso das metas', prompt: 'Como está o progresso das minhas metas pessoais? Destaque as que precisam de atenção.' },
  { label: '📅 Próximas 48h', prompt: 'O que tenho planejado para as próximas 48 horas? Compromissos, tarefas e prazos.' },
  { label: '⚠️ Contas a pagar', prompt: 'Quais contas vencem essa semana? Liste por urgência e valor.' },
  { label: '🛒 Planos de compra', prompt: 'Como estão meus planos de compra? Qual o progresso de cada um?' },
];

interface AI360PersonalChatInterfaceProps {
  agentId?: string;
}

export function AI360PersonalChatInterface({ agentId: initialAgentId }: AI360PersonalChatInterfaceProps) {
  const navigate = useNavigate();
  
  // Agent selection
  const { data: agents, isLoading: isLoadingAgents } = useAiAgents();
  const { data: defaultAgent } = useDefaultAiAgent();
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(initialAgentId);
  
  // Set default agent when loaded
  useEffect(() => {
    if (!selectedAgentId && defaultAgent) {
      setSelectedAgentId(defaultAgent.id);
    }
  }, [defaultAgent, selectedAgentId]);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const { data: historyMessages } = useAIMessages(activeConversationId);
  const createConversation = useCreateConversation();
  const addMessage = useAddMessage();

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

  const { mutate: askAgent, isPending } = useAskPersonalAI360Agent();

  // Get active agents only
  const activeAgents = useMemo(() => 
    agents?.filter(a => a.is_active) ?? [], 
    [agents]
  );

  // Get selected agent name for display
  const selectedAgentName = useMemo(() => 
    activeAgents.find(a => a.id === selectedAgentId)?.name ?? 'Agente Padrão',
    [activeAgents, selectedAgentId]
  );

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

    const userMessage: ChatMessage = { role: 'user', content: messageContent };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

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
        onSuccess: (fullContent) => {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: fullContent },
          ]);
          setStreamingContent('');
        },
        onError: (err) => {
          setError(err.message);
          setStreamingContent('');
        },
      }
    );
  }, [input, messages, isPending, askAgent, selectedAgentId]);

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
  };

  return (
    <Card className="glass-card flex flex-col" style={{ minHeight: '500px' }}>
      <CardHeader className="border-b pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Assistente Pessoal 360°</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {/* Agent Selector */}
            <Select
              value={selectedAgentId}
              onValueChange={setSelectedAgentId}
              disabled={isLoadingAgents || isPending}
            >
              <SelectTrigger className="w-[180px] h-8 text-sm">
                <SelectValue placeholder="Selecionar agente">
                  {selectedAgentName}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {activeAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <div className="flex items-center gap-2">
                      <span>{agent.name}</span>
                      {agent.is_default && (
                        <Badge variant="secondary" className="text-xs">Padrão</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
                {activeAgents.length === 0 && (
                  <SelectItem value="none" disabled>
                    Nenhum agente disponível
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            
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
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Seu assistente para finanças, tarefas, metas e produtividade pessoal
        </p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 p-4">
        {/* Quick Prompts - Show when no messages */}
        {messages.length === 0 && !isPending && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lightbulb className="h-5 w-5" />
              <span className="text-sm font-medium">Sugestões rápidas</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {QUICK_PROMPTS.map((item) => (
                <Button
                  key={item.label}
                  variant="outline"
                  className="h-auto justify-start whitespace-normal py-3 text-left text-sm"
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
                <MessageBubble key={index} message={message} />
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
                  <span className="text-sm">Analisando seus dados pessoais...</span>
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

        {/* Input Area */}
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre suas finanças, tarefas ou metas..."
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
}

function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const navigate = useNavigate();

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
          isUser ? 'bg-primary text-primary-foreground' : 'bg-primary/10'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary" />}
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
                {message.content}
              </ReactMarkdown>
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
