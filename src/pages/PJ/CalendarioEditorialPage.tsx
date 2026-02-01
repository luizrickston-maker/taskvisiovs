import { Calendar, Plus, Filter } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EditorialCalendar } from '@/components/editorial/EditorialCalendar';
import { EditorialItemForm } from '@/components/editorial/EditorialItemForm';
import { useEditorialCalendarItems } from '@/hooks/useEditorialCalendar';
import { useAppStore } from '@/stores/useAppStore';
import { 
  contentStatusLabels, 
  contentPlatformConfig,
  type ContentStatus,
  type ContentPlatform 
} from '@/types/editorial';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function CalendarioEditorialPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState<ContentPlatform | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ContentStatus | 'all'>('all');
  
  const { editorialCalendarItems } = useAppStore();
  
  // Calculate stats
  const stats = {
    total: editorialCalendarItems.length,
    byStatus: {
      idea: editorialCalendarItems.filter(i => i.status === 'idea').length,
      draft: editorialCalendarItems.filter(i => i.status === 'draft').length,
      review: editorialCalendarItems.filter(i => i.status === 'review').length,
      approved: editorialCalendarItems.filter(i => i.status === 'approved').length,
      published: editorialCalendarItems.filter(i => i.status === 'published').length,
    },
  };

  // Filter items
  const filteredItems = editorialCalendarItems.filter(item => {
    if (filterPlatform !== 'all' && item.platform !== filterPlatform) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold">Calendário Editorial</h1>
            <p className="text-sm text-muted-foreground">Planeje e gerencie seu conteúdo</p>
          </div>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Conteúdo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-visible">
            <DialogHeader className="shrink-0">
              <DialogTitle>Novo Item de Conteúdo</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <EditorialItemForm onSuccess={() => setIsFormOpen(false)} />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.byStatus.idea}</p>
                <p className="text-xs text-muted-foreground">Ideias</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <Calendar className="w-4 h-4 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.byStatus.draft}</p>
                <p className="text-xs text-muted-foreground">Rascunhos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.byStatus.review}</p>
                <p className="text-xs text-muted-foreground">Em Revisão</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <Calendar className="w-4 h-4 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.byStatus.approved}</p>
                <p className="text-xs text-muted-foreground">Aprovados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card col-span-2 md:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent">
                <Calendar className="w-4 h-4 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.byStatus.published}</p>
                <p className="text-xs text-muted-foreground">Publicados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            <Select value={filterPlatform} onValueChange={(v) => setFilterPlatform(v as ContentPlatform | 'all')}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Plataforma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(contentPlatformConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as ContentStatus | 'all')}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(contentStatusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(filterPlatform !== 'all' || filterStatus !== 'all') && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setFilterPlatform('all');
                  setFilterStatus('all');
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      <EditorialCalendar 
        items={filteredItems} 
        onItemClick={(item) => console.log('Item clicked:', item)}
      />
    </div>
  );
}
