import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Pencil, Trash2, Building2, User, ChevronDown, Repeat, CreditCard, FileText } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Prospect, ProspectStatus } from '@/types/database';

const statusConfig: Record<ProspectStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  novo: { label: 'Novo', variant: 'outline' },
  em_negociacao: { label: 'Em Negociação', variant: 'secondary' },
  proposta_enviada: { label: 'Proposta Enviada', variant: 'default' },
  fechado: { label: 'Fechado', variant: 'default' },
  perdido: { label: 'Perdido', variant: 'destructive' },
};

interface ProspectListProps {
  onAddProspect: () => void;
  onEditProspect: (prospect: Prospect) => void;
  onViewProspect: (prospect: Prospect) => void;
}

export function ProspectList({ onAddProspect, onEditProspect, onViewProspect }: ProspectListProps) {
  const { prospects, projects, deleteProspect, updateProspect } = useAppStore();
  const [statusFilter, setStatusFilter] = useState<ProspectStatus | 'all'>('all');

  const filteredProspects = useMemo(() => {
    if (statusFilter === 'all') return prospects;
    return prospects.filter(p => p.status === statusFilter);
  }, [prospects, statusFilter]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return '-';
    const project = projects.find(p => p.id === projectId);
    return project?.project || '-';
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('prospects').delete().eq('id', id);
      if (error) throw error;
      deleteProspect(id);
      toast.success('Prospect excluído!');
    } catch (error) {
      console.error('Error deleting prospect:', error);
      toast.error('Erro ao excluir prospect');
    }
  };

  const handleStatusChange = async (id: string, newStatus: ProspectStatus) => {
    try {
      const { error } = await supabase
        .from('prospects')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;
      updateProspect(id, { status: newStatus });
      toast.success('Status atualizado!');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  return (
    <Card className="glass-card">
      {/* Header - Stack vertical on mobile */}
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between space-y-0 pb-4">
        <CardTitle className="text-base md:text-lg font-semibold">Pipeline de Prospecção</CardTitle>
        <div className="flex flex-col gap-2 w-full md:flex-row md:w-auto md:items-center">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ProspectStatus | 'all')}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              {Object.entries(statusConfig).map(([value, config]) => (
                <SelectItem key={value} value={value}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={onAddProspect} size="sm" className="w-full md:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Nova Prospecção
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {filteredProspects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Building2 className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              {statusFilter === 'all' 
                ? 'Nenhuma prospecção cadastrada' 
                : 'Nenhuma prospecção com este status'}
            </p>
            <Button onClick={onAddProspect} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Prospecção
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile: Cards */}
            <div className="md:hidden space-y-3">
              {filteredProspects.map((prospect) => {
                const config = statusConfig[prospect.status];
                return (
                  <Card 
                    key={prospect.id} 
                    className="p-4 animate-fade-in cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onViewProspect(prospect)}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                        <p className="font-semibold truncate">{prospect.client_name}</p>
                        <p className="text-sm text-muted-foreground truncate">{prospect.company_name || '-'}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full cursor-pointer ${
                              prospect.status === 'novo' ? 'border border-input bg-background text-foreground' :
                              prospect.status === 'em_negociacao' ? 'bg-secondary text-secondary-foreground' :
                              prospect.status === 'proposta_enviada' ? 'bg-primary text-primary-foreground' :
                              prospect.status === 'fechado' ? 'bg-success text-success-foreground' :
                              prospect.status === 'perdido' ? 'bg-destructive text-destructive-foreground' : ''
                            }`}
                          >
                            {config.label}
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {Object.entries(statusConfig).map(([value, cfg]) => (
                            <DropdownMenuItem 
                              key={value} 
                              onClick={() => handleStatusChange(prospect.id, value as ProspectStatus)}
                            >
                              {cfg.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Data</span>
                        <p>{format(parseISO(prospect.prospection_date), 'dd/MM/yy', { locale: ptBR })}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Valor</span>
                        <p className="font-medium">{formatCurrency(prospect.estimated_value)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Projeto</span>
                        <p className="truncate">{prospect.project_type || getProjectName(prospect.project_id)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Pagamento</span>
                        <p className="flex items-center gap-1">
                          {prospect.payment_type ? (
                            <>
                              {prospect.payment_type === 'recorrente' ? (
                                <Repeat className="w-3 h-3 text-primary" />
                              ) : (
                                <CreditCard className="w-3 h-3 text-muted-foreground" />
                              )}
                              {prospect.payment_type === 'recorrente' 
                                ? `${prospect.contract_duration || '?'}m` 
                                : `${prospect.payment_installments || 1}x`}
                            </>
                          ) : '-'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onViewProspect(prospect)}
                        className="mr-auto"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        Anexos
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onEditProspect(prospect)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" />
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(prospect.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
            
            {/* Desktop: Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead className="text-right">Valor Estimado</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProspects.map((prospect) => {
                    const config = statusConfig[prospect.status];
                    return (
                      <TableRow 
                        key={prospect.id} 
                        className="animate-fade-in cursor-pointer hover:bg-muted/50"
                        onClick={() => onViewProspect(prospect)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{prospect.client_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {prospect.company_name || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(parseISO(prospect.prospection_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full cursor-pointer transition-all hover:opacity-80 hover:ring-2 ring-offset-1 ring-offset-background ring-primary/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                                  prospect.status === 'novo' ? 'border border-input bg-background text-foreground' :
                                  prospect.status === 'em_negociacao' ? 'bg-secondary text-secondary-foreground' :
                                  prospect.status === 'proposta_enviada' ? 'bg-primary text-primary-foreground' :
                                  prospect.status === 'fechado' ? 'bg-success text-success-foreground' :
                                  prospect.status === 'perdido' ? 'bg-destructive text-destructive-foreground' : ''
                                }`}
                              >
                                {config.label}
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {Object.entries(statusConfig).map(([value, cfg]) => (
                                <DropdownMenuItem 
                                  key={value} 
                                  onClick={() => handleStatusChange(prospect.id, value as ProspectStatus)}
                                >
                                  {cfg.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell>
                          {prospect.payment_type ? (
                            <div className="flex items-center gap-1.5">
                              {prospect.payment_type === 'recorrente' ? (
                                <Repeat className="w-3.5 h-3.5 text-primary" />
                              ) : (
                                <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                              <span className="text-sm">
                                {prospect.payment_type === 'recorrente' 
                                  ? `${prospect.contract_duration || '?'}m` 
                                  : `${prospect.payment_installments || 1}x`}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {prospect.project_type || getProjectName(prospect.project_id)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(prospect.estimated_value)}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onViewProspect(prospect)}>
                                <FileText className="w-4 h-4 mr-2" />
                                Ver Detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onEditProspect(prospect)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(prospect.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
