import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Mail, Phone, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Client {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

interface ClientInfoCardProps {
  client: Client;
}

export function ClientInfoCard({ client }: ClientInfoCardProps) {
  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Informações do Cliente
          </CardTitle>
          <Badge
            variant="outline"
            className={client.is_active
              ? 'border-emerald-500/50 text-emerald-500'
              : 'border-muted text-muted-foreground'
            }
          >
            {client.is_active ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Avatar + Name */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-primary">{client.name[0].toUpperCase()}</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{client.name}</h2>
            {client.company_name && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5" />
                {client.company_name}
              </p>
            )}
          </div>
        </div>

        {/* Contact details */}
        <div className="grid gap-3 pt-2 border-t border-border/50">
          {client.email && (
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">E-mail</p>
                <a href={`mailto:${client.email}`} className="text-foreground hover:text-primary transition-colors">
                  {client.email}
                </a>
              </div>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Telefone</p>
                <span className="text-foreground">{client.phone}</span>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Cliente desde</p>
              <span className="text-foreground">
                {format(new Date(client.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>
          </div>
        </div>

        {client.notes && (
          <div className="pt-2 border-t border-border/50 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observações</p>
            <p className="text-sm text-foreground bg-muted/40 rounded-lg p-3 leading-relaxed">{client.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
