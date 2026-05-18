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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Loader2, GripVertical, X, Zap, Brain, Activity, Bot } from 'lucide-react';
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

const DEFAULT_SYSTEM_PROMPT = `Você é um assistente de IA inteligente e prestativo, o "Cérebro Global" do sistema.

## Suas Capacidades:
- Análise de dados e informações de todos os módulos (Tarefas, Projetos, Vendas, Financeiro, etc.)
- Geração de insights, recomendações e auxílio na tomada de decisões
- Capacidade de solicitar ações no sistema (Inserir, Apagar, Atualizar)

## Regras Importantes:
- Quando desejar apagar uma informação, você DEVE solicitar usando o formato: [REQUEST_DELETE: type=TIPO, id=ID, name="NOME"]
- Exemplo: [REQUEST_DELETE: type=task, id=123, name="Enviar contrato"]
- Aguarde a confirmação humana para que a ação seja executada.

## Como Responder:
- Seja conciso, estratégico e proativo.
- Responda sempre em português brasileiro.`;

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
  const [modelName, setModelName] = useState('google/gemini-flash-1.5');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [contextPriority, setContextPriority] = useState<string[]>([]);
  const [apiKeyId, setApiKeyId] = useState<string | null>(null);
  const [routingEnabled, setRoutingEnabled] = useState(false);
  const [modelSimple, setModelSimple] = useState('google/gemini-flash-1.5');
  const [modelStandard, setModelStandard] = useState('google/gemini-flash-1.5');
  const [modelComplex, setModelComplex] = useState('google/gemini-pro-1.5');
  const [apiKeySimple, setApiKeySimple] = useState<string | null>(null);
  const [apiKeyStandard, setApiKeyStandard] = useState<string | null>(null);
  const [apiKeyComplex, setApiKeyComplex] = useState<string | null>(null);

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
      setRoutingEnabled(agent.routing_enabled ?? false);
      setModelSimple(agent.model_name_simple || 'google/gemini-flash-1.5');
      setModelStandard(agent.model_name_standard || 'google/gemini-flash-1.5');
      setModelComplex(agent.model_name_complex || 'google/gemini-pro-1.5');
      setApiKeySimple(agent.api_key_id_simple ?? null);
      setApiKeyStandard(agent.api_key_id_standard ?? null);
      setApiKeyComplex(agent.api_key_id_complex ?? null);
    } else {
      setName('');
      setDescription('');
      setModelName('google/gemini-flash-1.5');
      setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
      setTemperature(0.7);
      setMaxTokens(4096);
      setContextPriority([]);
      setApiKeyId(null);
      setRoutingEnabled(false);
      setModelSimple('google/gemini-flash-1.5');
      setModelStandard('google/gemini-flash-1.5');
      setModelComplex('google/gemini-pro-1.5');
      setApiKeySimple(null);
      setApiKeyStandard(null);
      setApiKeyComplex(null);
    }
  }, [agent, open]);

  const handleAddContext = (value: string) => {
    if (value === 'all') {
      const allValues = CONTEXT_PRIORITY_OPTIONS.map(opt => opt.value);
      setContextPriority(allValues);
      return;
    }
    if (!contextPriority.includes(value)) {
      setContextPriority([...contextPriority, value]);
    }
  };

  const handleSelectAllContexts = () => {
    const allValues = CONTEXT_PRIORITY_OPTIONS.map(opt => opt.value);
    setContextPriority(allValues);
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
      routing_enabled: routingEnabled,
      model_name_simple: modelSimple,
      model_name_standard: modelStandard,
      model_name_complex: modelComplex,
      api_key_id_simple: apiKeySimple,
      api_key_id_standard: apiKeyStandard,
      api_key_id_complex: apiKeyComplex,
    });
  };

  const getFilteredModels = (selectedApiKeyId: string | null) => {
    if (!selectedApiKeyId || selectedApiKeyId === 'system') {
      // For system key, show a mix of top models
      return AI_MODEL_OPTIONS.filter(m => 
        ['google/gemini-flash-1.5', 'openai/gpt-4o-mini', 'google/gemini-pro-1.5'].includes(m.value)
      );
    }
    
    const selectedKey = activeApiKeys.find(k => k.id === selectedApiKeyId);
    if (!selectedKey) return AI_MODEL_OPTIONS;

    return AI_MODEL_OPTIONS.filter(m => m.provider === selectedKey.provider || selectedKey.provider === 'openrouter');
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
              <Label htmlFor="apiKey">Chave de API Principal</Label>
              <Select 
                value={apiKeyId ?? 'system'} 
                onValueChange={(val) => setApiKeyId(val === 'system' ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sistema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">🔑 Sistema (Padrão)</SelectItem>
                  {activeApiKeys.map((key) => (
                    <SelectItem key={key.id} value={key.id}>
                      {key.label ?? key.provider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Modelo de IA Padrão *</Label>
              <Select value={modelName} onValueChange={setModelName} disabled={routingEnabled}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getFilteredModels(apiKeyId).map((model) => (
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
              {routingEnabled && (
                <p className="text-[10px] text-primary font-medium">
                  Roteamento inteligente ativo (modelo padrão ignorado)
                </p>
              )}
            </div>
          </div>

          {/* AI Routing Feature */}
          <div className="p-4 rounded-xl border-2 border-primary/20 bg-primary/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <Label className="text-base font-bold">Inteligência Rotativa</Label>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Pro</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Alterna automaticamente entre modelos baseado na complexidade da tarefa.
                </p>
              </div>
              <Switch 
                checked={routingEnabled} 
                onCheckedChange={setRoutingEnabled} 
              />
            </div>

            {routingEnabled && (
              <div className="grid gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <Separator className="bg-primary/10" />
                
                <div className="grid gap-6 sm:grid-cols-3">
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                      <Zap className="w-3 h-3 text-yellow-500" />
                      SIMPLES
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase opacity-70">Modelo</Label>
                      <Select value={modelSimple} onValueChange={setModelSimple}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AI_MODEL_OPTIONS.map((model) => (
                            <SelectItem key={model.value} value={model.value} className="text-xs">
                              {model.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase opacity-70">Chave API</Label>
                      <Select 
                        value={apiKeySimple ?? 'system'} 
                        onValueChange={(val) => setApiKeySimple(val === 'system' ? null : val)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Sistema" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system" className="text-xs">🔑 Sistema</SelectItem>
                          {activeApiKeys.map((key) => (
                            <SelectItem key={key.id} value={key.id} className="text-xs">
                              {key.label ?? key.provider}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                      <Bot className="w-3 h-3 text-blue-500" />
                      PADRÃO
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase opacity-70">Modelo</Label>
                      <Select value={modelStandard} onValueChange={setModelStandard}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AI_MODEL_OPTIONS.map((model) => (
                            <SelectItem key={model.value} value={model.value} className="text-xs">
                              {model.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase opacity-70">Chave API</Label>
                      <Select 
                        value={apiKeyStandard ?? 'system'} 
                        onValueChange={(val) => setApiKeyStandard(val === 'system' ? null : val)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Sistema" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system" className="text-xs">🔑 Sistema</SelectItem>
                          {activeApiKeys.map((key) => (
                            <SelectItem key={key.id} value={key.id} className="text-xs">
                              {key.label ?? key.provider}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1">
                      <Brain className="w-3 h-3 text-purple-500" />
                      COMPLEXO
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase opacity-70">Modelo</Label>
                      <Select value={modelComplex} onValueChange={setModelComplex}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AI_MODEL_OPTIONS.map((model) => (
                            <SelectItem key={model.value} value={model.value} className="text-xs">
                              {model.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase opacity-70">Chave API</Label>
                      <Select 
                        value={apiKeyComplex ?? 'system'} 
                        onValueChange={(val) => setApiKeyComplex(val === 'system' ? null : val)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Sistema" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system" className="text-xs">🔑 Sistema</SelectItem>
                          {activeApiKeys.map((key) => (
                            <SelectItem key={key.id} value={key.id} className="text-xs">
                              {key.label ?? key.provider}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <p className="text-[10px] text-muted-foreground italic">
                  * Tarefas simples (saudações, comandos curtos) usam modelos econômicos. Tarefas analíticas usam modelos premium.
                </p>
              </div>
            )}
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
            <div className="flex items-center justify-between">
              <Label>Prioridade de Contexto</Label>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                className="h-8 text-xs text-primary hover:text-primary/80"
                onClick={handleSelectAllContexts}
                disabled={contextPriority.length === CONTEXT_PRIORITY_OPTIONS.length}
              >
                Selecionar Todos
              </Button>
            </div>
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
