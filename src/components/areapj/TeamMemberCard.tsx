import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Edit2, Trash2, MoreHorizontal, UserCheck, UserX, Copy, Link as LinkIcon, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';
import type { CorporateTeamMember, ContractType } from '@/types/database';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TeamMemberCardProps {
  member: CorporateTeamMember;
  onEdit: (member: CorporateTeamMember) => void;
  onDelete: (id: string) => void;
  onToggleActive: (member: CorporateTeamMember) => void;
  onViewProgress?: (member: CorporateTeamMember) => void;
}

const contractTypeConfig: Record<ContractType, { label: string; color: string }> = {
  pj: { label: 'PJ', color: 'bg-contract-pj/10 text-contract-pj border-contract-pj/20' },
  clt: { label: 'CLT', color: 'bg-contract-clt/10 text-contract-clt border-contract-clt/20' },
  freelancer: { label: 'Freelancer', color: 'bg-contract-freelancer/10 text-contract-freelancer border-contract-freelancer/20' },
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function TeamMemberCard({ member, onEdit, onDelete, onToggleActive, onViewProgress }: TeamMemberCardProps) {
  const contractConfig = contractTypeConfig[member.contract_type as ContractType];

  const copyPortalLink = () => {
    const link = `${window.location.origin}/colaborador`;
    navigator.clipboard.writeText(link);
    toast.success('Link do portal copiado! Compartilhe com o colaborador junto com o e-mail e senha cadastrados.');
  };

  return (
    <Card className={`p-4 ${!member.is_active ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-sm">{member.name}</h3>
            <Badge variant="outline" className="mt-0.5 text-xs">
              {member.role}
            </Badge>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-background border-border">
            <DropdownMenuItem onClick={() => onViewProgress?.(member)}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Ver Progresso
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(member)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleActive(member)}>
              {member.is_active ? (
                <>
                  <UserX className="w-4 h-4 mr-2" />
                  Desativar
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 mr-2" />
                  Ativar
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {member.member_user_id && (
              <DropdownMenuItem onClick={copyPortalLink}>
                <LinkIcon className="w-4 h-4 mr-2" />
                Copiar Link do Portal
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(member.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Contrato:</span>
          <Badge variant="outline" className={contractConfig.color}>
            {contractConfig.label}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            {member.contract_type === 'freelancer' ? 'Custo:' : 'Custo Mensal:'}
          </span>
          <span className="font-semibold">{formatCurrency(member.cost)}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Pagamento:</span>
          <span>Dia {member.payment_day}</span>
        </div>

        {!member.is_active && (
          <Badge variant="secondary" className="w-full justify-center mt-2">
            Inativo
          </Badge>
        )}
      </div>
    </Card>
  );
}
