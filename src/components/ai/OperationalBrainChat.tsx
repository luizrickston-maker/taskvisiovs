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
  const [shouldResetOnOpen, setShouldResetOnOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: string;
    id: string;
    name: string;
    messageIndex: number;
  } | null>(null);
  
  const { data: agents, isLoading: isAgentsLoading } = useAiAgents();
  const { data: conversations, isLoading: isHistoryLoading } = useAIConversations();
  const { data: historyMessages } = useAIMessages(activeConversationId);
  const createConversation = useCreateConversation();
  const addMessage = useAddMessage();
  const deleteConversation = useDeleteConversation();
  
  const { 
    addCorporateInvestment, 
    deleteTask, 
    deleteProject, 
    deleteProspect, 
    deleteCorporateInvestment,
    deleteEditorialCalendarItem,
    deleteScript
  } = useAppStore();

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
          deleteCorporateInvestment(id);
          success = true;
          break;

        case 'task':
        case 'tarefa':
          const { error: taskError } = await supabase.from('tasks').delete().eq('id', id);
          if (taskError) throw taskError;
          deleteTask(id);
          success = true;
          break;
        
        case 'project':
        case 'projeto':
          const { error: projectError } = await supabase.from('projects').delete().eq('id', id);
          if (projectError) throw projectError;
          deleteProject(id);
          success = true;
          break;

        case 'prospect':
        case 'oportunidade':
          const { error: prospectError } = await supabase.from('prospects').delete().eq('id', id);
          if (prospectError) throw prospectError;
          deleteProspect(id);
          success = true;
          break;

        case 'editorial_item':
        case 'editorial':
        case 'conteudo':
          const { error: edError } = await supabase.from('editorial_calendar_items').delete().eq('id', id);
          if (edError) throw edError;
          deleteEditorialCalendarItem(id);
          success = true;
          break;

        case 'briefing':
        case 'roteiro':
        case 'script':
          const { error: scriptError } = await supabase.from('scripts').delete().eq('id', id);
          if (scriptError) throw scriptError;
          deleteScript(id);
          success = true;
          break;

        default:
          toast.error(`Ação para o tipo "${type}" ainda não implementada.`);
          break;
      }

      if (success) {
        toast.success(`"${name}" removido com sucesso.`);
        setPendingAction(null);
        
        const confirmContent = `✅ Confirmado! O item "${name}" foi removido com sucesso das suas operações.`;
        
        setMessages(prev => [
          ...prev,
          { id: crypto.randomUUID(), role: 'assistant', content: confirmContent, timestamp: new Date() }
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

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setShowHistory(false);
  };

  const handleDownloadHistory = () => {
    if (messages.length === 0) return;
    
    const content = messages.map(m => `[${m.role.toUpperCase()} - ${format(m.timestamp, 'dd/MM/yy HH:mm')}]\n${m.content}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historico-ia-${format(new Date(), 'yyyy-MM-dd-HHmm')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Histórico baixado com sucesso!');
  };

  const handleDeleteConversation = async (id: string) => {
    if (window.confirm('Tem certeza que deseja apagar este histórico?')) {
      await deleteConversation.mutateAsync(id);
      if (activeConversationId === id) {
        startNewChat();
      }
      toast.success('Histórico removido');
    }
  };


  return (
    <>
      {/* Floating Trigger Icon - Only visible when NOT open */}
      {!isOpen && (
        <button
          className="fixed z-50 bottom-20 right-4 w-12 h-12 md:bottom-6 md:right-6 md:w-14 md:h-14 rounded-full gradient-primary flex items-center justify-center text-primary-foreground shadow-lg hover:scale-110 active:scale-95 transition-all duration-300"
          onClick={() => {
            if (shouldResetOnOpen) {
              startNewChat();
              setShouldResetOnOpen(false);
            }
            setIsOpen(true);
          }}
        >
          <Brain className="h-6 w-6 md:h-7 md:w-7" />
        </button>
      )}

      {/* Main Chat Interface - Only visible when open */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-50 bg-card/95 backdrop-blur-md border border-border/50 rounded-xl shadow-2xl transition-all duration-300 flex flex-col overflow-hidden",
            isMinimized
              ? "bottom-20 right-4 w-64 h-14 md:bottom-6 md:right-6 md:w-72"
              : "bottom-20 right-4 left-4 h-[70vh] md:bottom-6 md:right-6 md:left-auto md:w-[450px] md:h-[650px] md:max-h-[85vh]"
          )}
        >
          <div className="flex items-center justify-between p-3 border-b border-border/50 shrink-0">
            <div className="flex items-center gap-2 overflow-hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto hover:bg-transparent overflow-hidden">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                  <Brain className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex items-center gap-1 ml-2 text-left overflow-hidden">
                  <div className="overflow-hidden">
                    <h3 className="font-semibold text-sm leading-tight truncate">
                      {selectedAgent?.name || "Cérebro Operacional"}
                    </h3>
                    {!isMinimized && (
                      <p className="text-[10px] text-muted-foreground leading-tight truncate">
                        {activeConversationId ? "Conversa em andamento" : "Nova conversa"}
                      </p>
                    )}
                  </div>
                  {!isMinimized && <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />}
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
                        startNewChat();
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
          {!isMinimized && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowHistory(!showHistory)}
                title="Histórico de conversas"
              >
                <History className={cn("h-4 w-4", showHistory && "text-primary")} />
              </Button>
              {messages.length > 0 && !showHistory && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleDownloadHistory}
                    title="Baixar conversa"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={startNewChat}
                    title="Nova conversa"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </>
              )}
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              setShouldResetOnOpen(true);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {showHistory ? (
            /* History List */
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Suas Conversas Recentes
                </h4>
                {isHistoryLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : conversations && conversations.length > 0 ? (
                  conversations.map((conv) => (
                    <div 
                      key={conv.id}
                      className={cn(
                        "group flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer",
                        activeConversationId === conv.id 
                          ? "bg-primary/5 border-primary/30" 
                          : "border-transparent hover:bg-accent/50 hover:border-border"
                      )}
                      onClick={() => {
                        setActiveConversationId(conv.id);
                        setShowHistory(false);
                      }}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <MessageSquare className={cn("h-4 w-4 shrink-0", activeConversationId === conv.id ? "text-primary" : "text-muted-foreground")} />
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium truncate">{conv.title || 'Conversa sem título'}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(conv.updated_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conv.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <History className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma conversa encontrada.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            /* Main Chat Area */
            <>
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
                          <p className="text-sm text-muted-foreground px-4">
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
                    {messages.map((msg, index) => (
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
                              <ReactMarkdown>
                                  {msg.content
                                    .replace(/\[REQUEST_DELETE:\s*type=.+?,\s*id=.+?,\s*name=".+?"\]/g, '')
                                    .replace(/\[DELETE_SUGGESTION:\s*type=(.+?),\s*id=(.+?),\s*name="(.+?)"\]/g, '$3')
                                    .replace(/\| (.*?) \| R\$ (.*?) \| (.*?) \| (.*?) \|/g, '| $1 | R$ $2 | $3 |')
                                    .trim()}
                              </ReactMarkdown>
                              
                              {!isLoading && msg.content.includes('[DELETE_SUGGESTION:') && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {Array.from(msg.content.matchAll(/\[DELETE_SUGGESTION:\s*type=(.+?),\s*id=(.+?),\s*name="(.+?)"\]/g)).map((match, idx) => (
                                    <Button
                                      key={idx}
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-[10px] border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-1 px-2"
                                      onClick={() => {
                                        setPendingAction({
                                          type: match[1].trim(),
                                          id: match[2].trim(),
                                          name: match[3].trim(),
                                          messageIndex: index
                                        });
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Apagar "{match[3].trim()}"
                                    </Button>
                                  ))}
                                </div>
                              )}

                              {pendingAction?.messageIndex === index && (
                                <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 space-y-2">
                                  <p className="text-[11px] font-semibold text-destructive flex items-center gap-1.5">
                                    <Trash2 className="h-3 w-3" />
                                    Confirmar exclusão de "{pendingAction.name}"?
                                  </p>
                                  <div className="flex gap-2 justify-end">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => setPendingAction(null)}
                                      className="h-7 px-2 text-[10px]"
                                    >
                                      Cancelar
                                    </Button>
                                    <Button 
                                      variant="destructive" 
                                      size="sm" 
                                      onClick={handleConfirmAction}
                                      className="h-7 px-2 text-[10px]"
                                    >
                                      Confirmar
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          )}
                        </div>
                      </div>
                    ))}

                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted/50 border border-border/50 rounded-xl px-3 py-2 flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Processando...</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Input Area */}
              <div className="p-3 border-t border-border/50 shrink-0">
                <form onSubmit={(e) => { e.preventDefault(); if (input.trim() && !isLoading) streamChat(input.trim()); }} className="flex gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (input.trim() && !isLoading) streamChat(input.trim());
                      }
                    }}
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
                </form>
              </div>
            </>
          )}
        </>
      )}
        </div>
      )}
    </>
  );
}
