import { useState, useMemo } from 'react';
import { Workflow, Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ProcessCard } from '@/components/areapj/processos/ProcessCard';
import {
  useBusinessProcesses,
  useDeleteBusinessProcess,
  useDuplicateBusinessProcess,
  useCreateBusinessProcess,
  BusinessProcess,
} from '@/hooks/useBusinessProcesses';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

function useWorkspaceId() {
  return useQuery({
    queryKey: ['my-workspace-id'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_workspace_id');
      if (error) throw error;
      return data as string;
    },
    staleTime: Infinity,
  });
}

export default function ProcessosPage() {
  const navigate = useNavigate();
  const { data: processes, isLoading } = useBusinessProcesses();
  const deleteMutation = useDeleteBusinessProcess();
  const duplicateMutation = useDuplicateBusinessProcess();
  const createMutation = useCreateBusinessProcess();
  const { data: workspaceId } = useWorkspaceId();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const filtered = useMemo(() => {
    if (!processes) return [];
    return processes.filter((p) => {
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        categoryFilter === 'all' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [processes, search, categoryFilter]);

  const categories = useMemo(() => {
    if (!processes) return [];
    const cats = new Set(processes.map((p) => p.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [processes]);

  const handleCreate = () => {
    if (!newName.trim() || !workspaceId) return;
    createMutation.mutate(
      {
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        category: newCategory || undefined,
        workspace_id: workspaceId,
      },
      {
        onSuccess: () => {
          setShowCreateDialog(false);
          setNewName('');
          setNewDescription('');
          setNewCategory('');
        },
      }
    );
  };

  const handleEdit = (process: BusinessProcess) => {
    // Future: navigate to canvas editor
    navigate(`/pj/processos/${process.id}`);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
            <Workflow className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Processos</h1>
            <p className="text-sm text-muted-foreground">
              Canvas de operações e fluxos de trabalho
            </p>
          </div>
        </div>
        <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4" />
          Novo Processo
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar processos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat} className="capitalize">
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4">
          <Workflow className="w-16 h-16 text-muted-foreground/40" />
          <h2 className="text-xl font-semibold text-foreground">
            {processes?.length === 0
              ? 'Nenhum processo criado ainda'
              : 'Nenhum processo encontrado'}
          </h2>
          <p className="text-muted-foreground max-w-md">
            {processes?.length === 0
              ? 'Crie seu primeiro processo para documentar fluxos de trabalho, SOPs e manuais de operação de forma visual e interativa.'
              : 'Tente ajustar os filtros ou buscar por outro termo.'}
          </p>
          {processes?.length === 0 && (
            <Button className="gap-2 mt-2" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4" />
              Criar Primeiro Processo
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((process) => (
            <ProcessCard
              key={process.id}
              process={process}
              onEdit={handleEdit}
              onDuplicate={(p) => duplicateMutation.mutate(p)}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Processo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nome do Processo *</Label>
              <Input
                placeholder="Ex: Onboarding de Cliente"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descreva o objetivo deste processo..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="atendimento">Atendimento</SelectItem>
                  <SelectItem value="producao">Produção</SelectItem>
                  <SelectItem value="vendas">Vendas</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="rh">RH</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? 'Criando...' : 'Criar Processo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
