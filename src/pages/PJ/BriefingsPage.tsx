import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBriefings } from "@/hooks/useBriefings";
import { useAuthContextSafe } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  LayoutGrid, 
  List,
  Loader2,
  Inbox
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { BriefingCard } from "@/components/areapj/briefings/BriefingCard";

export default function BriefingsPage() {
  const navigate = useNavigate();
  const authContext = useAuthContextSafe();
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const fetchWorkspace = async () => {
      const { data } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', authContext?.user?.id)
        .limit(1)
        .maybeSingle();
      
      if (data) setWorkspaceId(data.workspace_id);
    };

    if (authContext?.user?.id) {
      fetchWorkspace();
    }
  }, [authContext?.user?.id]);

  const { briefings, deleteBriefing, generateMagicLink } = useBriefings(workspaceId);

  const filteredBriefings = briefings.data?.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(b.status);
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este briefing?")) {
      await deleteBriefing.mutateAsync(id);
    }
  };

  const handleSend = async (id: string) => {
    await generateMagicLink.mutateAsync(id);
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            Briefings Dinâmicos
          </h1>
          <p className="text-muted-foreground">
            Gerencie e colete informações estratégicas de seus clientes e equipe.
          </p>
        </div>
        <Button 
          onClick={() => navigate("/pj/briefings/novo")}
          className="gap-2 gradient-primary glow-primary shadow-lg hover:shadow-primary/20 transition-all"
        >
          <Plus className="w-4 h-4" /> Novo Briefing
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/30 p-4 rounded-xl border border-border/50">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar briefings..." 
            className="pl-9 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 w-full md:w-auto">
                <Filter className="w-4 h-4" /> Filtros
                {statusFilter.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full">
                    {statusFilter.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filtrar por Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={statusFilter.includes('draft')} onCheckedChange={() => toggleStatusFilter('draft')}>
                Rascunho
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={statusFilter.includes('pending_fill')} onCheckedChange={() => toggleStatusFilter('pending_fill')}>
                Aguardando Preenchimento
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={statusFilter.includes('in_review')} onCheckedChange={() => toggleStatusFilter('in_review')}>
                Em Revisão
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={statusFilter.includes('approved')} onCheckedChange={() => toggleStatusFilter('approved')}>
                Aprovado
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-9 w-[1px] bg-border mx-1 hidden md:block" />

          <div className="flex items-center bg-background/50 rounded-lg p-1 border border-border/50">
            <Button 
              variant={viewMode === "grid" ? "secondary" : "ghost"} 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === "list" ? "secondary" : "ghost"} 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {briefings.isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-muted-foreground animate-pulse">Carregando seus briefings...</p>
        </div>
      ) : filteredBriefings?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-muted/20 rounded-3xl border-2 border-dashed border-border/50">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Inbox className="w-8 h-8 text-primary/50" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Nenhum briefing encontrado</h3>
            <p className="text-muted-foreground max-w-sm">
              {search || statusFilter.length > 0 
                ? "Tente ajustar seus filtros para encontrar o que procura." 
                : "Comece criando seu primeiro briefing dinâmico para otimizar seu processo."}
            </p>
          </div>
          <Button onClick={() => navigate("/pj/briefings/novo")} className="mt-4 gradient-primary">
            Criar meu primeiro briefing
          </Button>
        </div>
      ) : (
        <div className={cn(
          "grid gap-6",
          viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
        )}>
          {filteredBriefings?.map((briefing) => (
            <BriefingCard 
              key={briefing.id} 
              briefing={briefing}
              onView={(id) => navigate(`/pj/briefings/${id}`)}
              onSend={handleSend}
              onDelete={handleDelete}
              onDuplicate={(id) => console.log("Duplicate", id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
