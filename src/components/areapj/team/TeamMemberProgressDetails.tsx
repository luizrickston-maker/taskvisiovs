import { useMemo, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Wifi, WifiOff, ShieldCheck, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { TeamMemberStats } from './TeamMemberStats';
import { CollaboratorTasksList } from './CollaboratorTasksList';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import {
  useManageCollaboratorPermissions,
  FEATURE_DEFINITIONS,
  type FeatureKey,
} from '@/hooks/useCollaboratorPermissions';
import type { CorporateTeamMember } from '@/types/database';

interface TeamMemberProgressDetailsProps {
  member: CorporateTeamMember;
  onBack: () => void;
}

export function TeamMemberProgressDetails({ member, onBack }: TeamMemberProgressDetailsProps) {
  const { projectTasks, projects, updateProjectTask, addProjectTask, deleteProjectTask } = useAppStore();
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const { isEnabled, isLoading: permLoading, toggle, isToggling } =
    useManageCollaboratorPermissions(member.member_user_id, member.workspace_id);

  // Real-time: gestor vê atualizações do colaborador ao vivo
  useEffect(() => {
    if (!member.member_user_id) return;
    const channel = supabase
      .channel(`manager-collab-${member.member_user_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_tasks' }, (payload: any) => {
        const { eventType, new: n, old: o } = payload;
        if (eventType === 'INSERT') {
          if (!useAppStore.getState().projectTasks.some(t => t.id === n.id)) addProjectTask(n);
        } else if (eventType === 'UPDATE') {
          updateProjectTask(n.id, n);
        } else if (eventType === 'DELETE') {
          deleteProjectTask(o.id);
        }
      })
      .subscribe((status) => { setRealtimeConnected(status === 'SUBSCRIBED'); });
    return () => { supabase.removeChannel(channel); };
  }, [member.member_user_id, addProjectTask, updateProjectTask, deleteProjectTask]);

  const memberTasks = useMemo(() => {
    if (!member.member_user_id) return [];
    return projectTasks.filter(task => task.assigned_to === member.member_user_id);
  }, [projectTasks, member.member_user_id]);

  const stats = useMemo(() => ({
    total:      memberTasks.length,
    pending:    memberTasks.filter(t => !t.status || t.status === 'todo' || t.status === 'pending').length,
    inProgress: memberTasks.filter(t => t.status === 'in_progress').length,
    completed:  memberTasks.filter(t => t.status === 'completed' || t.status === 'done').length,
  }), [memberTasks]);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Equipe
        </Button>

        {member.member_user_id && (
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
            realtimeConnected
              ? 'bg-green-500/10 text-green-600 border-green-500/20'
              : 'bg-muted text-muted-foreground border-border'
          }`}>
            {realtimeConnected
              ? <><Wifi className="w-3 h-3" /> Ao vivo</>
              : <><WifiOff className="w-3 h-3" /> Conectando...</>}
          </div>
        )}
      </div>

      {/* Perfil + Stats */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex items-center gap-4 bg-card p-4 rounded-xl border w-full md:w-auto">
          <Avatar className="h-16 w-16 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold">{member.name}</h2>
            <p className="text-muted-foreground">{member.role}</p>
            {!member.member_user_id && (
              <p className="text-xs text-amber-500 mt-1">Sem conta de acesso</p>
            )}
          </div>
        </div>
        <div className="flex-1 w-full">
          <TeamMemberStats stats={stats} />
        </div>
      </div>

      {/* Sem conta vinculada */}
      {!member.member_user_id ? (
        <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
          <p className="text-muted-foreground text-sm">
            Este colaborador não tem conta de acesso vinculada.<br />
            Edite o cadastro e adicione e-mail e senha para habilitar a atribuição de tarefas.
          </p>
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="flex flex-wrap gap-1 h-auto">
            <TabsTrigger value="all">Todas ({stats.total})</TabsTrigger>
            <TabsTrigger value="todo">A Fazer ({stats.pending})</TabsTrigger>
            <TabsTrigger value="doing">Andamento ({stats.inProgress})</TabsTrigger>
            <TabsTrigger value="done">Concluídas ({stats.completed})</TabsTrigger>
            <TabsTrigger value="acesso" className="gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Acesso
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <CollaboratorTasksList tasks={memberTasks} projects={projects} />
          </TabsContent>
          <TabsContent value="todo" className="mt-6">
            <CollaboratorTasksList
              tasks={memberTasks.filter(t => !t.status || t.status === 'todo' || t.status === 'pending')}
              projects={projects}
            />
          </TabsContent>
          <TabsContent value="doing" className="mt-6">
            <CollaboratorTasksList
              tasks={memberTasks.filter(t => t.status === 'in_progress')}
              projects={projects}
            />
          </TabsContent>
          <TabsContent value="done" className="mt-6">
            <CollaboratorTasksList
              tasks={memberTasks.filter(t => t.status === 'completed' || t.status === 'done')}
              projects={projects}
            />
          </TabsContent>

          {/* ── Aba Acesso ── */}
          <TabsContent value="acesso" className="mt-6">
            <div className="space-y-3 max-w-lg">
              <p className="text-sm text-muted-foreground">
                Controle quais seções do portal <strong>{member.name}</strong> pode acessar.
                As alterações têm efeito imediato.
              </p>

              {permLoading ? (
                <div className="flex items-center gap-2 py-6 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Carregando permissões...
                </div>
              ) : (
                <div className="space-y-2">
                  {FEATURE_DEFINITIONS.map((feat) => {
                    const enabled = isEnabled(feat.key as FeatureKey);
                    return (
                      <Card key={feat.key} className="border-border">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">{feat.label}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {feat.description}
                            </p>
                          </div>
                          <Switch
                            checked={enabled}
                            disabled={isToggling || !member.workspace_id}
                            onCheckedChange={(checked) =>
                              toggle({ key: feat.key as FeatureKey, enabled: checked })
                            }
                          />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {!member.workspace_id && (
                <p className="text-xs text-amber-500 mt-2">
                  Este colaborador não está vinculado a um workspace — permissões indisponíveis.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}