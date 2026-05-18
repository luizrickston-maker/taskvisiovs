import { useState, useRef, useEffect, useCallback } from 'react';
import { Brain, Send, X, Minimize2, Maximize2, Loader2, Sparkles, Trash2, ChevronDown, User, Bot } from 'lucide-react';
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
import type { AIAgent } from '@/types/ai';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = useCallback(async (userMessage: string) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setInput('');

    let assistantContent = '';
    const assistantId = crypto.randomUUID();

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!resp.ok || !resp.body) {
        const errorData = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || `HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      // Add empty assistant message
      setMessages(prev => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
      ]);

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

      // Handle any remaining buffer
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
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
          } catch { /* ignore */ }
        }
      }
    } catch (error) {
      console.error('[OperationalBrain] Error:', error);
      setMessages(prev => [
        ...prev.filter(m => m.id !== assistantId),
        {
          id: assistantId,
          role: 'assistant',
          content: `❌ Erro: ${error instanceof Error ? error.message : 'Falha ao processar mensagem'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

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
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Brain className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Cérebro Operacional</h3>
            {!isMinimized && (
              <p className="text-[10px] text-muted-foreground">Visão 360° do seu negócio</p>
            )}
          </div>
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
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h4 className="font-semibold mb-1">Olá! Sou seu Cérebro Operacional 🧠</h4>
                  <p className="text-sm text-muted-foreground">
                    Posso analisar seus projetos, vendas, agenda e conteúdos para te dar insights personalizados.
                  </p>
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
                      "flex",
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
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
