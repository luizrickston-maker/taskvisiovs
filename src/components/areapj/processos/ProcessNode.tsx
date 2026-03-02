import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Play, Square, GitBranch, CheckSquare, Flag, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

const nodeConfig: Record<string, { icon: React.ElementType; defaultColor: string; label: string }> = {
  start: { icon: Play, defaultColor: 'emerald', label: 'Início' },
  end: { icon: Square, defaultColor: 'red', label: 'Fim' },
  decision: { icon: GitBranch, defaultColor: 'amber', label: 'Decisão' },
  task: { icon: CheckSquare, defaultColor: 'blue', label: 'Tarefa' },
  milestone: { icon: Flag, defaultColor: 'purple', label: 'Marco' },
  default: { icon: Circle, defaultColor: 'slate', label: 'Etapa' },
};

const colorMap: Record<string, { bg: string; border: string; text: string; handle: string }> = {
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', text: 'text-emerald-400', handle: '#10b981' },
  red: { bg: 'bg-red-500/10', border: 'border-red-500/40', text: 'text-red-400', handle: '#ef4444' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/40', text: 'text-amber-400', handle: '#f59e0b' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/40', text: 'text-blue-400', handle: '#3b82f6' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/40', text: 'text-purple-400', handle: '#8b5cf6' },
  slate: { bg: 'bg-muted/50', border: 'border-border', text: 'text-muted-foreground', handle: '#64748b' },
  pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/40', text: 'text-pink-400', handle: '#ec4899' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/40', text: 'text-cyan-400', handle: '#06b6d4' },
};

export interface ProcessNodeData {
  title: string;
  description?: string;
  node_type: string;
  color_scheme?: string;
  icon?: string;
  estimated_time?: string;
  responsible_role?: string;
  stepId: string;
  [key: string]: unknown;
}

function ProcessNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ProcessNodeData;
  const nodeType = nodeData.node_type || 'default';
  const config = nodeConfig[nodeType] || nodeConfig.default;
  const colorKey = nodeData.color_scheme || config.defaultColor;
  const colors = colorMap[colorKey] || colorMap.slate;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'rounded-xl border-2 px-4 py-3 min-w-[160px] max-w-[240px] shadow-lg transition-all duration-200',
        colors.bg,
        colors.border,
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      {/* Handles */}
      {nodeType !== 'start' && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !border-2 !border-background"
          style={{ background: colors.handle }}
        />
      )}

      <div className="flex items-center gap-2">
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', colors.text, colors.bg)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">
            {nodeData.title || config.label}
          </p>
          {nodeData.estimated_time && (
            <p className="text-[10px] text-muted-foreground">⏱ {nodeData.estimated_time}</p>
          )}
        </div>
      </div>

      {nodeData.description && (
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{nodeData.description}</p>
      )}

      {nodeData.responsible_role && (
        <p className="text-[10px] text-muted-foreground mt-1 opacity-70">👤 {nodeData.responsible_role}</p>
      )}

      {nodeType !== 'end' && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !border-2 !border-background"
          style={{ background: colors.handle }}
        />
      )}
    </div>
  );
}

export const ProcessNode = memo(ProcessNodeComponent);

export const nodeTypes = {
  processNode: ProcessNode,
};
