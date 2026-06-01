import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Clock, PlayCircle, ClipboardList } from 'lucide-react';

interface TeamMemberStatsProps {
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
}

export function TeamMemberStats({ stats }: TeamMemberStatsProps) {
  const items = [
    {
      label: 'Total',
      value: stats.total,
      icon: ClipboardList,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'A Fazer',
      value: stats.pending,
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Em Andamento',
      value: stats.inProgress,
      icon: PlayCircle,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Concluído',
      value: stats.completed,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.label} className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${item.bgColor}`}>
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-xl font-bold">{item.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
