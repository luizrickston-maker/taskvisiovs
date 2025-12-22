import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Calendar, List, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContentCalendar } from '@/components/conteudos/ContentCalendar';
import { ContentTimeline } from '@/components/conteudos/ContentTimeline';
import { useAppStore } from '@/stores/useAppStore';
import type { Script } from '@/types/database';

export default function ConteudosDashboard() {
  const navigate = useNavigate();
  const { scripts } = useAppStore();
  const [view, setView] = useState<'calendar' | 'timeline'>('calendar');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleSelectScript = (script: Script) => {
    // Navigate to roteiros with script selected
    navigate('/roteiros', { state: { editScript: script } });
  };

  // Stats
  const totalScripts = scripts.length;
  const thisMonthScripts = scripts.filter(s => {
    const date = new Date(s.scheduled_date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  const scheduledCount = scripts.filter(s => s.status === 'scheduled').length;
  const publishedCount = scripts.filter(s => s.status === 'published').length;

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Conteúdos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visualize seus roteiros por data
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{totalScripts}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{thisMonthScripts}</p>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{scheduledCount}</p>
            <p className="text-xs text-muted-foreground">Agendados</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{publishedCount}</p>
            <p className="text-xs text-muted-foreground">Publicados</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Tabs value={view} onValueChange={(v) => setView(v as 'calendar' | 'timeline')}>
                <TabsList>
                  <TabsTrigger value="calendar" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span className="hidden sm:inline">Calendário</span>
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="flex items-center gap-2">
                    <List className="w-4 h-4" />
                    <span className="hidden sm:inline">Timeline</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue placeholder="Plataforma" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="youtube_shorts">Shorts</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="instagram_reels">Reels</SelectItem>
                  <SelectItem value="instagram_post">Post</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[110px] h-8">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {view === 'calendar' ? (
            <ContentCalendar 
              onSelectScript={handleSelectScript}
              platformFilter={platformFilter}
              statusFilter={statusFilter}
            />
          ) : (
            <ContentTimeline 
              onSelectScript={handleSelectScript}
              platformFilter={platformFilter}
              statusFilter={statusFilter}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
