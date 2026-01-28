import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FolderKanban, Plus, Search } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Project } from '@/types/database';
import { ClientProjectCard } from '@/components/areapj/projetos/ClientProjectCard';
import { ClientProjectForm } from '@/components/areapj/projetos/ClientProjectForm';
import { ClientProjectDetail } from '@/components/areapj/projetos/ClientProjectDetail';

export default function ProjetosClientesPage() {
  const { projects, projectTasks, deleteProject } = useAppStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  
  // Filter only corporate projects
  const corporateProjects = useMemo(() => 
    projects.filter(p => p.is_corporate === true),
    [projects]
  );
  
  const filteredProjects = useMemo(() => {
    return corporateProjects.filter(project => {
      // Search filter
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const matchesSearch = 
          project.project.toLowerCase().includes(search) ||
          project.client_name?.toLowerCase().includes(search) ||
          project.company_name?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (statusFilter !== 'all' && project.status !== statusFilter) {
        return false;
      }
      
      // Priority filter
      if (priorityFilter !== 'all' && project.priority !== Number(priorityFilter)) {
        return false;
      }
      
      return true;
    });
  }, [corporateProjects, searchQuery, statusFilter, priorityFilter]);
  
  // Sort by priority (P1 first), then by deadline
  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort((a, b) => {
      // First by status (in progress first, then todo, then done)
      const statusOrder = { progress: 0, todo: 1, blocked: 2, done: 3 };
      const statusDiff = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
      if (statusDiff !== 0) return statusDiff;
      
      // Then by priority
      if (a.priority !== b.priority) return a.priority - b.priority;
      
      // Then by deadline (earlier first)
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      
      return 0;
    });
  }, [filteredProjects]);
  
  const handleDeleteProject = async () => {
    if (!deletingProjectId) return;
    
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', deletingProjectId);
        
      if (error) throw error;
      
      deleteProject(deletingProjectId);
      toast.success('Projeto excluído!');
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error deleting project:', error);
      toast.error('Erro ao excluir projeto');
    } finally {
      setDeletingProjectId(null);
    }
  };
  
  const getProjectTasks = (projectId: string) => {
    return projectTasks.filter(t => t.project_id === projectId);
  };

  // Stats
  const stats = useMemo(() => {
    const total = corporateProjects.length;
    const inProgress = corporateProjects.filter(p => p.status === 'progress').length;
    const completed = corporateProjects.filter(p => p.status === 'done').length;
    const overdue = corporateProjects.filter(p => {
      if (!p.deadline || p.status === 'done') return false;
      return new Date(p.deadline) < new Date();
    }).length;
    
    return { total, inProgress, completed, overdue };
  }, [corporateProjects]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-primary" />
            Projetos de Clientes
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie projetos e acompanhe o progresso de cada cliente
          </p>
        </div>
        <Button onClick={() => {
          setEditingProject(null);
          setFormOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Projeto
        </Button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">Em Progresso</p>
          <p className="text-2xl font-bold text-blue-500">{stats.inProgress}</p>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">Concluídos</p>
          <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">Atrasados</p>
          <p className="text-2xl font-bold text-destructive">{stats.overdue}</p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por projeto, cliente ou empresa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="todo">A Fazer</SelectItem>
            <SelectItem value="progress">Em Progresso</SelectItem>
            <SelectItem value="blocked">Bloqueado</SelectItem>
            <SelectItem value="done">Concluído</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="1">P1 - Crítica</SelectItem>
            <SelectItem value="2">P2 - Alta</SelectItem>
            <SelectItem value="3">P3 - Média</SelectItem>
            <SelectItem value="4">P4 - Baixa</SelectItem>
            <SelectItem value="5">P5 - Mínima</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Projects Grid */}
      {sortedProjects.length === 0 ? (
        <div className="text-center py-12">
          <FolderKanban className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum projeto encontrado</h3>
          <p className="text-muted-foreground mt-1">
            {corporateProjects.length === 0 
              ? "Crie seu primeiro projeto de cliente"
              : "Tente ajustar os filtros"
            }
          </p>
          {corporateProjects.length === 0 && (
            <Button 
              className="mt-4"
              onClick={() => {
                setEditingProject(null);
                setFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Projeto
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedProjects.map(project => (
            <ClientProjectCard
              key={project.id}
              project={project}
              tasks={getProjectTasks(project.id)}
              onEdit={() => {
                setEditingProject(project);
                setFormOpen(true);
              }}
              onDelete={() => setDeletingProjectId(project.id)}
              onClick={() => setSelectedProject(project)}
            />
          ))}
        </div>
      )}
      
      {/* Forms and Dialogs */}
      <ClientProjectForm
        open={formOpen}
        onOpenChange={setFormOpen}
        project={editingProject}
      />
      
      {selectedProject && (
        <ClientProjectDetail
          open={!!selectedProject}
          onOpenChange={(open) => !open && setSelectedProject(null)}
          project={selectedProject}
          onEdit={() => {
            setEditingProject(selectedProject);
            setFormOpen(true);
            setSelectedProject(null);
          }}
        />
      )}
      
      <AlertDialog open={!!deletingProjectId} onOpenChange={() => setDeletingProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as tarefas do projeto também serão excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
