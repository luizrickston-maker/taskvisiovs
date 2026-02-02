import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Edit2, Trash2, MoreHorizontal, Star, StarOff, 
  Power, PowerOff, Bot, Sparkles 
} from 'lucide-react';
import type { AIAgent } from '@/types/ai';
import { AI_MODEL_OPTIONS } from '@/types/ai';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AiAgentCardProps {
  agent: AIAgent;
  onEdit: (agent: AIAgent) => void;
  onDelete: (id: string) => void;
  onToggleActive: (agent: AIAgent) => void;
  onSetDefault: (id: string) => void;
}

function getModelLabel(modelName: string): string {
  const model = AI_MODEL_OPTIONS.find(m => m.value === modelName);
  return model?.label ?? modelName;
}

export function AiAgentCard({ 
  agent, 
  onEdit, 
  onDelete, 
  onToggleActive, 
  onSetDefault 
}: AiAgentCardProps) {
  const contextPriority = agent.context_priority ?? [];
  
  return (
    <Card className={`glass-card p-5 transition-all duration-200 hover:shadow-lg ${!agent.is_active ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{agent.name}</h3>
              {agent.is_default && (
                <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Padrão
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {getModelLabel(agent.model_name)}
            </p>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border-border">
            <DropdownMenuItem onClick={() => onEdit(agent)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            {!agent.is_default && (
              <DropdownMenuItem onClick={() => onSetDefault(agent.id)}>
                <Star className="w-4 h-4 mr-2" />
                Definir como Padrão
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onToggleActive(agent)}>
              {agent.is_active ? (
                <>
                  <PowerOff className="w-4 h-4 mr-2" />
                  Desativar
                </>
              ) : (
                <>
                  <Power className="w-4 h-4 mr-2" />
                  Ativar
                </>
              )}
            </DropdownMenuItem>
            {!agent.is_default && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(agent.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {agent.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {agent.description}
        </p>
      )}

      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Temperatura:</span>
          <Badge variant="secondary" className="font-mono">
            {agent.temperature.toFixed(1)}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Max Tokens:</span>
          <span className="font-medium">{agent.max_tokens.toLocaleString()}</span>
        </div>

        {contextPriority.length > 0 && (
          <div className="pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground mb-2 block">Prioridade de Contexto:</span>
            <div className="flex flex-wrap gap-1">
              {contextPriority.slice(0, 3).map((ctx, index) => (
                <Badge key={ctx} variant="outline" className="text-xs capitalize">
                  {index + 1}. {ctx.replace('_', ' ')}
                </Badge>
              ))}
              {contextPriority.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{contextPriority.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {!agent.is_active && (
          <Badge variant="secondary" className="w-full justify-center mt-2">
            Inativo
          </Badge>
        )}
      </div>
    </Card>
  );
}
