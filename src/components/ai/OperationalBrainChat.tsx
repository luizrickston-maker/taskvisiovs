import { useState, useRef, useEffect, useCallback } from 'react';
import { Brain, Send, X, Minimize2, Maximize2, Loader2, Sparkles, Trash2, ChevronDown, User, Bot, History, Download, Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { useAiAgents } from '@/hooks/useAiAgents';
import { supabase } from '@/integrations/supabase/client';
import type { AIAgent, AIMessage, AIConversation } from '@/types/ai';
import { useAIConversations, useAIMessages, useCreateConversation, useAddMessage, useDeleteConversation } from '@/hooks/useAiHistory';
import { useAppStore } from '@/stores/useAppStore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';


interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-360-agent`;

const QUICK_PROMPTS = [
  { label: '📊 Resumo do dia', prompt: 'Me dê um resumo completo do meu dia hoje, incluindo compromissos, tarefas pendentes e prioridades.' },
  { label: '⚠️ Pendências críticas', prompt: 'Quais são as pendências críticas que preciso resolver urgentemente? Considere prazos, tarefas atrasadas e prospects importantes.' },
  { label: '💰 Status de vendas', prompt: 'Como está meu pipeline de vendas? Mostre o progresso das metas e oportunidades em negociação.' },
  { label: '📅 Próxima semana', prompt: 'O que tenho planejado para a próxima semana? Mostre compromissos, prazos de projetos e conteúdos a publicar.' },
];

export function OperationalBrainChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  const { data: agents, isLoading: isAgentsLoading } = useAiAgents();
  const { data: conversations, isLoading: isHistoryLoading } = useAIConversations();
  const { data: historyMessages } = useAIMessages(activeConversationId);
  const createConversation = useCreateConversation();
  const addMessage = useAddMessage();
  const deleteConversation = useDeleteConversation();
  
  const { addCorporateInvestment } = useAppStore();
  const activeAgents = agents?.filter(a => a.is_active) ?? [];

  useEffect(() => {
    if (activeAgents.length > 0 && !selectedAgent) {
      const defaultAgent = activeAgents.find(a => a.is_default) || activeAgents[0];
      setSelectedAgent(defaultAgent);
    }
  }, [activeAgents, selectedAgent]);

  // Load messages when conversation changes
  useEffect(() => {
    if (activeConversationId && historyMessages) {
      setMessages(historyMessages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at),
      })));
    } else if (!activeConversationId) {
      setMessages([]);
    }
  }, [activeConversationId, historyMessages]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);


  const handleInvestmentRequest = useCallback(async (content: string) => {
    const investmentRegex = /\[REQUEST_ADD_INVESTMENT:\s*item_name="([^"]+)",\s*amount=([\d.]+),\s*category="([^"]+)",\s*notes="([^"]*)"\]/g;
    let match;
    while ((match = investmentRegex.exec(content)) !== null) {
      const [_, item_name, amountStr, category, notes] = match;
      const amount = parseFloat(amountStr);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) continue;

        const { data: newData, error } = await supabase
          .from('corporate_investments')
          .insert({
            user_id: user.id,
            item_name,
            amount,
            category: category.toLowerCase(),
            notes,
            purchase_date: new Date().toISOString().split('T')[0],
          })
          .select()
          .single();

        if (error) throw error;
        addCorporateInvestment(newData as any);
        toast.success(`Investimento adicionado: ${item_name}`);
      } catch (err) {
        console.error('Erro ao adicionar investimento via IA:', err);
        toast.error(`Falha ao adicionar investimento: ${item_name}`);
      }
    }
  }, [addCorporateInvestment]);

  const streamChat = useCallback(async (userMessage: string) => {
    setIsLoading(true);
    setInput('');

    let currentConvId = activeConversationId;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }

      // 1. Ensure we have a conversation
      if (!currentConvId) {
        const newConv = await createConversation.mutateAsync({
          agentId: selectedAgent?.id,
          title: userMessage.slice(0, 40) + (userMessage.length > 40 ? '...' : ''),
        });
        currentConvId = newConv.id;
        setActiveConversationId(newConv.id);
      }

      // 2. Add user message to UI and DB
      const userMsg = {
        id: crypto.randomUUID(),
        role: 'user' as const,
        content: userMessage,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg]);
      
      await addMessage.mutateAsync({
        conversationId: currentConvId,
        role: 'user',
        content: userMessage,
      });

      // 3. Prepare for assistant response
      let assistantContent = '';
      const assistantId = crypto.randomUUID();
      setMessages(prev => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
      ]);

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.content,
          })),
          agent_id: selectedAgent?.id,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errorData = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || `HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId ? { ...m, content: assistantContent } : m
                )
              );
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // 4. Finalize assistant message
      await addMessage.mutateAsync({
        conversationId: currentConvId,
        role: 'assistant',
        content: assistantContent,
      });

      // 5. Handle action requests in assistant content
      if (assistantContent.includes('[REQUEST_ADD_INVESTMENT:')) {
        await handleInvestmentRequest(assistantContent);
      }
      
      // Handle delete requests (existing functionality)
      if (assistantContent.includes('[REQUEST_DELETE:')) {
        // ... (The previous code didn't seem to have a frontend handler for this, but I should probably add one or keep it as is if it's handled elsewhere)
        // For now, I'll just focus on the investment request as requested by the user.
      }

    } catch (error) {
      console.error('[OperationalBrain] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Falha ao processar mensagem';
      toast.error(errorMessage);
      
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `❌ Erro: ${errorMessage}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, selectedAgent, isLoading, activeConversationId, createConversation, addMessage, handleInvestmentRequest]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    streamChat(input.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg gradient-primary glow-primary hover:scale-105 transition-transform md:bottom-6 md:right-6"
        size="icon"
      >
        <Brain className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "fixed z-50 bg-card/95 backdrop-blur-md border border-border/50 rounded-xl shadow-2xl transition-all duration-300 flex flex-col",
        isMinimized
          ? "bottom-20 right-4 w-64 h-14 md:bottom-6 md:right-6 md:w-72"
          : "bottom-20 right-4 left-4 h-[70vh] md:bottom-6 md:right-6 md:left-auto md:w-[400px] md:h-[600px] md:max-h-[80vh]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                  <Brain className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex items-center gap-1 ml-2 text-left">
                  <div>
                    <h3 className="font-semibold text-sm leading-tight">
                      {selectedAgent?.name || "Cérebro Operacional"}
                    </h3>
                    {!isMinimized && (
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        {selectedAgent ? "Agente selecionado" : "Visão 360° do seu negócio"}
                      </p>
                    )}
                  </div>
                  {!isMinimized && <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                </div>
              </Button>
            </DropdownMenuTrigger>
            {!isMinimized && (
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Escolher Agente</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {activeAgents.length > 0 ? (
                  activeAgents.map((agent) => (
                    <DropdownMenuItem 
                      key={agent.id}
                      onClick={() => {
                        setSelectedAgent(agent);
                        if (messages.length > 0) {
                          // Clear chat if switching agent to keep context clean
                          setMessages([]);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-2",
                        selectedAgent?.id === agent.id && "bg-accent"
                      )}
                    >
                      <Bot className="h-4 w-4" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{agent.name}</span>
                        {agent.is_default && (
                          <span className="text-[10px] text-primary">Padrão</span>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>Nenhum agente ativo</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            )}
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-1">
          {!isMinimized && messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={clearChat}
              title="Limpar conversa"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-3" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-6">
                  {isAgentsLoading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                      <p className="text-xs text-muted-foreground">Carregando agentes...</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <Sparkles className="h-8 w-8 text-primary" />
                      </div>
                      <h4 className="font-semibold mb-1">Olá! Sou {selectedAgent?.name || "seu Cérebro Operacional"} 🧠</h4>
                      <p className="text-sm text-muted-foreground">
                        Posso analisar seus projetos, vendas, agenda e conteúdos para te dar insights personalizados.
                      </p>
                    </>
                  )}
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Comece com uma sugestão:
                  </p>
                  <div className="grid gap-2">
                    {QUICK_PROMPTS.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => streamChat(item.prompt)}
                        disabled={isLoading}
                        className="text-left p-2.5 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors text-sm disabled:opacity-50"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex items-start gap-2",
                      msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1",
                      msg.role === 'user' ? "bg-primary/20" : "bg-muted"
                    )}>
                      {msg.role === 'user' ? (
                        <User className="h-3 w-3 text-primary" />
                      ) : (
                        <Bot className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/50 border border-border/50'
                      )}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{msg.content || '...'}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex justify-start">
                    <div className="bg-muted/50 border border-border/50 rounded-xl px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-border/50 shrink-0">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte sobre seus projetos, vendas, agenda..."
                className="min-h-[44px] max-h-[100px] resize-none text-sm"
                disabled={isLoading}
                rows={1}
              />
              <Button
                type="submit"
                size="icon"
                className="shrink-0 h-[44px] w-[44px]"
                disabled={!input.trim() || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
