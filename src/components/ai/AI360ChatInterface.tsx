import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, AlertCircle, Lightbulb, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAskAI360Agent } from '@/hooks/useAI360Agent';
import type { ChatMessage } from '@/types/ai';
import ReactMarkdown from 'react-markdown';

interface AI360ChatInterfaceProps {
  agentId?: string;
}

const QUICK_PROMPTS = [
  { label: '📊 Resumo do dia', prompt: 'Me dê um resumo executivo do meu dia: tarefas prioritárias, compromissos e oportunidades de vendas.' },
  { label: '⚠️ Pendências críticas', prompt: 'Quais são as pendências mais críticas que preciso resolver hoje? Liste por prioridade.' },
  { label: '💰 Status de vendas', prompt: 'Qual é o status atual do meu pipeline de vendas? Destaque oportunidades quentes e em risco.' },
  { label: '📅 Próximas 48h', prompt: 'O que tenho planejado para as próximas 48 horas? Inclua compromissos, tarefas e prazos.' },
];

export function AI360ChatInterface({ agentId }: AI360ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { mutate: askAgent, isPending } = useAskAI360Agent();

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
        agentId,
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
  }, [input, messages, agentId, isPending, askAgent]);

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
      <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Chat com o Agente</CardTitle>
        </div>
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
                  <span className="text-sm">Pensando...</span>
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
}

function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted/50 text-foreground'
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {isStreaming && (
              <span className="inline-block h-4 w-1 animate-pulse bg-current" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
