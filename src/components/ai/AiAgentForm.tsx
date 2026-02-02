import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, GripVertical, X } from 'lucide-react';
import type { AIAgent, AIAgentCreate } from '@/types/ai';
import { AI_MODEL_OPTIONS, CONTEXT_PRIORITY_OPTIONS } from '@/types/ai';
import { useAiApiKeys } from '@/hooks/useAiApiKeys';

interface AiAgentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: AIAgent | null;
  onSubmit: (data: AIAgentCreate) => void;
  isLoading?: boolean;
}

const DEFAULT_SYSTEM_PROMPT = `Você é um assistente de IA inteligente e prestativo. 

## Suas Capacidades:
- Análise de dados e informações do sistema
- Geração de insights e recomendações
- Auxílio na tomada de decisões

## Como Responder:
- Seja conciso e direto
- Use formatação markdown quando apropriado
- Responda sempre em português brasileiro`;

export function AiAgentForm({ 
  open, 
  onOpenChange, 
  agent, 
  onSubmit, 
  isLoading 
}: AiAgentFormProps) {
  const { data: apiKeys } = useAiApiKeys();
  const activeApiKeys = apiKeys?.filter(k => k.is_active) ?? [];

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [modelName, setModelName] = useState('google/gemini-3-flash-preview');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [contextPriority, setContextPriority] = useState<string[]>([]);
  const [apiKeyId, setApiKeyId] = useState<string | null>(null);

  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setDescription(agent.description ?? '');
      setModelName(agent.model_name);
      setSystemPrompt(agent.system_prompt);
      setTemperature(agent.temperature);
      setMaxTokens(agent.max_tokens);
      setContextPriority(agent.context_priority ?? []);
      setApiKeyId(agent.api_key_id ?? null);
    } else {
      setName('');
      setDescription('');
      setModelName('google/gemini-3-flash-preview');
      setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
      setTemperature(0.7);
      setMaxTokens(4096);
      setContextPriority([]);
      setApiKeyId(null);
    }
  }, [agent, open]);

  const handleAddContext = (value: string) => {
    if (!contextPriority.includes(value)) {
      setContextPriority([...contextPriority, value]);
    }
  };

  const handleRemoveContext = (value: string) => {
    setContextPriority(contextPriority.filter(c => c !== value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description: description || null,
      model_name: modelName,
      system_prompt: systemPrompt,
      temperature,
      max_tokens: maxTokens,
      context_priority: contextPriority.length > 0 ? contextPriority : undefined,
      api_key_id: apiKeyId,
    });
  };

  const availableContextOptions = CONTEXT_PRIORITY_OPTIONS.filter(
    opt => !contextPriority.includes(opt.value)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {agent ? 'Editar Agente de IA' : 'Novo Agente de IA'}
          </DialogTitle>
          <DialogDescription>
            Configure as propriedades e comportamento do agente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Agente *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Agente Financeiro"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="model">Modelo de IA *</Label>
              <Select value={modelName} onValueChange={setModelName}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_MODEL_OPTIONS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      <div className="flex flex-col">
                        <span>{model.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {model.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição do propósito do agente"
            />
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">Instrução do Sistema (System Prompt) *</Label>
            <Textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Defina o comportamento e personalidade do agente..."
              className="min-h-[200px] font-mono text-sm"
              required
            />
            <p className="text-xs text-muted-foreground">
              Define como o agente deve se comportar e responder.
            </p>
          </div>

          {/* Temperature & Max Tokens */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Temperatura</Label>
                <span className="text-sm font-mono text-muted-foreground">
                  {temperature.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[temperature]}
                onValueChange={([val]) => setTemperature(val)}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                0 = mais focado, 1 = mais criativo
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value) || 4096)}
                min={256}
                max={32000}
              />
              <p className="text-xs text-muted-foreground">
                Limite de tokens na resposta
              </p>
            </div>
          </div>

          {/* Context Priority */}
          <div className="space-y-3">
            <Label>Prioridade de Contexto</Label>
            <p className="text-xs text-muted-foreground">
              Defina a ordem de importância dos módulos de dados para este agente.
            </p>
            
            {contextPriority.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                {contextPriority.map((ctx, index) => {
                  const option = CONTEXT_PRIORITY_OPTIONS.find(o => o.value === ctx);
                  return (
                    <Badge 
                      key={ctx} 
                      variant="secondary"
                      className="pl-2 pr-1 py-1 gap-1"
                    >
                      <GripVertical className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-medium mr-1">{index + 1}.</span>
                      {option?.label ?? ctx}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1 hover:bg-destructive/20"
                        onClick={() => handleRemoveContext(ctx)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {availableContextOptions.length > 0 && (
              <Select onValueChange={handleAddContext}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Adicionar módulo de contexto..." />
                </SelectTrigger>
                <SelectContent>
                  {availableContextOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* API Key Selection */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">Chave de API (Opcional)</Label>
            <Select 
              value={apiKeyId ?? 'system'} 
              onValueChange={(val) => setApiKeyId(val === 'system' ? null : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Usar chave do sistema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">
                  🔑 Usar chave do sistema (Lovable AI)
                </SelectItem>
                {activeApiKeys.map((key) => (
                  <SelectItem key={key.id} value={key.id}>
                    {key.label ?? key.provider} ({key.provider})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Selecione uma chave personalizada ou use a chave padrão do sistema.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !name || !systemPrompt}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {agent ? 'Salvar Alterações' : 'Criar Agente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
