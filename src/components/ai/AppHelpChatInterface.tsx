import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, HelpCircle, User, Loader2, AlertCircle, Lightbulb, RefreshCw, BookOpen } from 'lucide-react';
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
import { useAskHelpAssistant } from '@/hooks/useHelpAssistant';
import { useAiAgents, useDefaultAiAgent } from '@/hooks/useAiAgents';
import type { ChatMessage } from '@/types/ai';
import ReactMarkdown from 'react-markdown';

interface AppHelpChatInterfaceProps {
  agentId?: string;
}

const HELP_QUICK_PROMPTS = [
  { label: '🚀 Como começar?', prompt: 'Sou novo no app, como devo começar a usar o TaskVision PRO? Me dê um passo a passo.' },
  { label: '💰 Gestão financeira', prompt: 'Explique como funciona a gestão financeira do app: Caixa, Finanças, e como registrar receitas e despesas.' },
  { label: '📊 Modo PJ vs Pessoal', prompt: 'Qual a diferença entre o modo Pessoal e o modo Empresarial (PJ)? Quando usar cada um?' },
  { label: '🤖 Como usar a IA?', prompt: 'Como funciona o Cérebro Operacional (IA)? Como posso tirar melhor proveito dele?' },
  { label: '📅 Organizar meu dia', prompt: 'Como usar a tela "Meu Dia" para organizar minhas tarefas e compromissos?' },
  { label: '💼 Pipeline de vendas', prompt: 'Como funciona o pipeline de vendas no modo empresarial? Como cadastrar e acompanhar prospects?' },
];

export function AppHelpChatInterface({ agentId: propAgentId }: AppHelpChatInterfaceProps) {
  const { data: agents, isLoading: agentsLoading } = useAiAgents();
  const { data: defaultAgent } = useDefaultAiAgent();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(propAgentId);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { mutate: askHelp, isPending } = useAskHelpAssistant();

  // Set default agent when loaded
  useEffect(() => {
    if (!selectedAgentId && defaultAgent) {
      setSelectedAgentId(defaultAgent.id);
    }
  }, [defaultAgent, selectedAgentId]);

  // Get selected agent info
  const selectedAgent = useMemo(() => {
    if (!selectedAgentId || !agents) return null;
    return agents.find(a => a.id === selectedAgentId) ?? null;
  }, [selectedAgentId, agents]);

  // Filter active agents
  const activeAgents = useMemo(() => {
    return agents?.filter(a => a.is_active) ?? [];
  }, [agents]);

  // Auto-scroll
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

    abortControllerRef.current = new AbortController();

    askHelp(
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
  }, [input, messages, selectedAgentId, isPending, askHelp]);

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
      <CardHeader className="border-b pb-4 space-y-3">
        <div className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Central de Ajuda</CardTitle>
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
          </div>
        </div>
        
        {/* Agent Selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground shrink-0">Modelo:</span>
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
        
        <p className="text-xs text-muted-foreground">
          Tire suas dúvidas sobre qualquer funcionalidade do TaskVision PRO
        </p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 p-4">
        {/* Quick Prompts */}
        {messages.length === 0 && !isPending && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lightbulb className="h-5 w-5" />
              <span className="text-sm font-medium">Dúvidas frequentes</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {HELP_QUICK_PROMPTS.map((item) => (
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
                <HelpMessageBubble key={index} message={message} />
              ))}

              {streamingContent && (
                <HelpMessageBubble
                  message={{ role: 'assistant', content: streamingContent }}
                  isStreaming
                />
              )}

              {isPending && !streamingContent && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Buscando informações...</span>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre qualquer funcionalidade do app..."
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

// Message Bubble
interface HelpMessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

function HelpMessageBubble({ message, isStreaming }: HelpMessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-emerald-500/20 text-emerald-500'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
      </div>
      <div className="max-w-[85%]">
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
              <ReactMarkdown>
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block h-4 w-1 animate-pulse bg-primary ml-1" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
