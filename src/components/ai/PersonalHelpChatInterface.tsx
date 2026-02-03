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
import { useAskPersonalHelpAssistant } from '@/hooks/usePersonalHelpAssistant';
import { useAiAgents, useDefaultAiAgent } from '@/hooks/useAiAgents';
import type { ChatMessage } from '@/types/ai';
import ReactMarkdown from 'react-markdown';

const PERSONAL_QUICK_PROMPTS = [
  { label: '🚀 Como começar?', prompt: 'Sou novo no app, como começar no modo pessoal?' },
  { label: '💰 Registrar gastos', prompt: 'Como registro receitas e despesas no Caixa?' },
  { label: '📅 Organizar meu dia', prompt: 'Como usar a tela Meu Dia para organizar tarefas?' },
  { label: '🎯 Planos de compra', prompt: 'Como criar um plano de compra com meta?' },
  { label: '📊 Ver finanças', prompt: 'Como acompanho minhas finanças e dívidas?' },
  { label: '🤖 Usar o assistente', prompt: 'Como o assistente IA pode me ajudar?' },
];

export function PersonalHelpChatInterface() {
  const { data: agents, isLoading: agentsLoading } = useAiAgents();
  const { data: defaultAgent } = useDefaultAiAgent();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { mutate: askHelp, isPending } = useAskPersonalHelpAssistant();

  useEffect(() => {
    if (!selectedAgentId && defaultAgent) {
      setSelectedAgentId(defaultAgent.id);
    }
  }, [defaultAgent, selectedAgentId]);

  const selectedAgent = useMemo(() => {
    if (!selectedAgentId || !agents) return null;
    return agents.find(a => a.id === selectedAgentId) ?? null;
  }, [selectedAgentId, agents]);

  const activeAgents = useMemo(() => {
    return agents?.filter(a => a.is_active) ?? [];
  }, [agents]);

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
        onChunk: (chunk) => setStreamingContent((prev) => prev + chunk),
      },
      {
        onSuccess: (fullContent) => {
          setMessages((prev) => [...prev, { role: 'assistant', content: fullContent }]);
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
            <CardTitle className="text-lg">Ajuda Pessoal</CardTitle>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClear} className="text-muted-foreground">
              <RefreshCw className="mr-1 h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground shrink-0">Modelo:</span>
          <Select value={selectedAgentId ?? ''} onValueChange={setSelectedAgentId} disabled={agentsLoading || isPending}>
            <SelectTrigger className="w-full max-w-xs h-8 text-sm">
              <SelectValue placeholder="Selecione um agente..." />
            </SelectTrigger>
            <SelectContent>
              {activeAgents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center gap-2">
                    <span>{agent.name}</span>
                    {agent.is_default && <Badge variant="outline" className="text-xs py-0 px-1">Padrão</Badge>}
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
          Tire dúvidas sobre as funcionalidades do modo pessoal
        </p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 p-4">
        {messages.length === 0 && !isPending && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lightbulb className="h-5 w-5" />
              <span className="text-sm font-medium">Dúvidas frequentes</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {PERSONAL_QUICK_PROMPTS.map((item) => (
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

        {(messages.length > 0 || isPending) && (
          <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <MessageBubble key={index} message={message} />
              ))}
              {streamingContent && <MessageBubble message={{ role: 'assistant', content: streamingContent }} isStreaming />}
              {isPending && !streamingContent && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Buscando informações...</span>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre qualquer funcionalidade..."
            className="min-h-[44px] flex-1 resize-none"
            rows={1}
            disabled={isPending}
          />
          <Button onClick={() => handleSend()} disabled={!input.trim() || isPending} size="icon" className="shrink-0">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MessageBubble({ message, isStreaming }: { message: ChatMessage; isStreaming?: boolean }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isUser ? 'bg-primary text-primary-foreground' : 'bg-emerald-500/20 text-emerald-500'}`}>
        {isUser ? <User className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
      </div>
      <div className="max-w-[85%]">
        <div className={`rounded-lg px-4 py-2 ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-foreground'}`}>
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{message.content}</ReactMarkdown>
              {isStreaming && <span className="inline-block h-4 w-1 animate-pulse bg-primary ml-1" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
