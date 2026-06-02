import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TeamMemberStats } from './TeamMemberStats';
import { CollaboratorTasksList } from './CollaboratorTasksList';
import { useAppStore } from '@/stores/useAppStore';
import type { CorporateTeamMember } from '@/types/database';

interface TeamMemberProgressDetailsProps {
  member: CorporateTeamMember;
  onBack: () => void;
}

export function TeamMemberProgressDetails({ member, onBack }: TeamMemberProgressDetailsProps) {
  const { projectTasks, projects } = useAppStore();

  const memberTasks = useMemo(() => {
    // Filter tasks assigned to this member
    // We check both member.id and member.member_user_id (if they have an account)
    return projectTasks.filter(task => 
      task.assigned_to === member.id || 
      (member.member_user_id && task.assigned_to === member.member_user_id)
    );
  }, [projectTasks, member]);

  const stats = useMemo(() => {
    return {
      total: memberTasks.length,
      pending: memberTasks.filter(t => t.status === 'pending' || !t.status || t.status === 'todo').length,
      inProgress: memberTasks.filter(t => t.status === 'in_progress').length,
      completed: memberTasks.filter(t => t.status === 'completed' || t.status === 'done').length,
    };
  }, [memberTasks]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Equipe
        </Button>
      </div>

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
          </div>
        </div>
        
        <div className="flex-1 w-full">
          <TeamMemberStats stats={stats} />
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-md">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="todo">A Fazer</TabsTrigger>
          <TabsTrigger value="doing">Andamento</TabsTrigger>
          <TabsTrigger value="done">Concluídas</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <CollaboratorTasksList tasks={memberTasks} projects={projects} />
        </TabsContent>
        
        <TabsContent value="todo" className="mt-6">
          <CollaboratorTasksList 
            tasks={memberTasks.filter(t => t.status === 'pending' || !t.status || t.status === 'todo')} 
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
      </Tabs>
    </div>
  );
}
