import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Shield, Users, Building2, Search, RefreshCw,
  CheckCircle, XCircle, Calendar, Crown, UserCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Workspace {
  id: string;
  name: string;
  plan: string;
  status: string;
  owner_user_id: string;
  created_at: string;
  member_count?: number;
}

interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

function StatCard({ icon: Icon, label, value, color }: { 
  icon: React.ElementType; label: string; value: number | string; color: string 
}) {
  return (
    <Card className="glass-card">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SuperAdminDashboard() {
  const [search, setSearch] = useState('');

  const { data: workspaces = [], isLoading: loadingWorkspaces, refetch } = useQuery({
    queryKey: ['super-admin-workspaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Workspace[];
    },
  });

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['super-admin-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('*');
      if (error) throw error;
      return data as WorkspaceMember[];
    },
  });

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['super-admin-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, workspace_id, name, is_active');
      if (error) throw error;
      return data;
    },
  });

  const isLoading = loadingWorkspaces || loadingMembers || loadingClients;

  const filteredWorkspaces = workspaces.filter(ws =>
    ws.name.toLowerCase().includes(search.toLowerCase()) ||
    ws.plan.toLowerCase().includes(search.toLowerCase())
  );

  const memberCountByWorkspace = members.reduce((acc, m) => {
    acc[m.workspace_id] = (acc[m.workspace_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const clientCountByWorkspace = (clients as Array<{ workspace_id: string }>).reduce((acc, c) => {
    acc[c.workspace_id] = (acc[c.workspace_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const activeWorkspaces = workspaces.filter(w => w.status === 'active').length;

  return (
    <div className="min-h-screen bg-background p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">Painel Super Admin</h1>
            <p className="text-sm text-muted-foreground">Gestão de workspaces e assinantes</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard icon={Building2} label="Workspaces Totais" value={workspaces.length} color="bg-primary" />
            <StatCard icon={CheckCircle} label="Workspaces Ativos" value={activeWorkspaces} color="bg-emerald-500" />
            <StatCard icon={Users} label="Membros Totais" value={members.length} color="bg-blue-500" />
            <StatCard icon={UserCheck} label="Clientes Cadastrados" value={clients.length} color="bg-violet-500" />
          </>
        )}
      </div>

      {/* Workspaces Table */}
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Building2 className="w-5 h-5 text-primary" />
              Workspaces ({filteredWorkspaces.length})
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar workspace..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-background/50"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : filteredWorkspaces.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum workspace encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredWorkspaces.map(ws => (
                <div
                  key={ws.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 gap-4 flex-wrap"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Crown className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{ws.name}</p>
                      <p className="text-xs text-muted-foreground truncate font-mono">{ws.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      <span>{memberCountByWorkspace[ws.id] || 0} membros</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{clientCountByWorkspace[ws.id] || 0} clientes</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{format(new Date(ws.created_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                    <Badge
                      variant={ws.plan === 'free' ? 'secondary' : 'default'}
                      className="text-xs capitalize"
                    >
                      {ws.plan}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={ws.status === 'active' 
                        ? 'border-emerald-500/50 text-emerald-500 text-xs' 
                        : 'border-destructive/50 text-destructive text-xs'
                      }
                    >
                      {ws.status === 'active' ? (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      ) : (
                        <XCircle className="w-3 h-3 mr-1" />
                      )}
                      {ws.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
