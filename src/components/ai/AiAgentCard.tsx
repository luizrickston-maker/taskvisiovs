import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Edit2, Trash2, MoreHorizontal, Star, 
  Power, PowerOff, Bot 
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
    <Card className={`transition-all duration-200 hover:shadow-lg border-border/50 ${!agent.is_active ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground truncate text-sm">
                  {agent.name}
                </h3>
                {agent.is_default && (
                  <Badge className="bg-warning/10 text-warning border-warning/20 text-xs shrink-0">
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    Padrão
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {getModelLabel(agent.model_name)}
              </p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
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

        {/* Description */}
        {agent.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {agent.description}
          </p>
        )}

        {/* Stats */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/50">
            <span className="text-muted-foreground">Temperatura</span>
            <Badge variant="secondary" className="font-mono text-xs px-2 py-0">
              {agent.temperature.toFixed(1)}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/50">
            <span className="text-muted-foreground">Max Tokens</span>
            <span className="font-medium text-xs">{agent.max_tokens.toLocaleString()}</span>
          </div>

          {/* Context Priority */}
          {contextPriority.length > 0 && (
            <div className="pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground mb-1.5 block">
                Contexto:
              </span>
              <div className="flex flex-wrap gap-1">
                {contextPriority.slice(0, 2).map((ctx, index) => (
                  <Badge key={ctx} variant="outline" className="text-xs py-0 capitalize">
                    {index + 1}. {ctx.replace('_', ' ')}
                  </Badge>
                ))}
                {contextPriority.length > 2 && (
                  <Badge variant="outline" className="text-xs py-0">
                    +{contextPriority.length - 2}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Inactive Badge */}
          {!agent.is_active && (
            <Badge variant="secondary" className="w-full justify-center mt-2 text-xs">
              Inativo
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
