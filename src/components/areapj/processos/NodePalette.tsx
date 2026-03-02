import { Play, Square, GitBranch, CheckSquare, Flag } from 'lucide-react';

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: string, label: string) => void;
}

const paletteItems = [
  { type: 'start', label: 'Início', icon: Play, color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  { type: 'task', label: 'Tarefa', icon: CheckSquare, color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { type: 'decision', label: 'Decisão', icon: GitBranch, color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { type: 'milestone', label: 'Marco', icon: Flag, color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  { type: 'end', label: 'Fim', icon: Square, color: 'bg-red-500/15 text-red-400 border-red-500/30' },
];

export function NodePalette({ onDragStart }: NodePaletteProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
        Componentes
      </h3>
      <div className="space-y-1.5">
        {paletteItems.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => onDragStart(e, item.type, item.label)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] ${item.color}`}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
