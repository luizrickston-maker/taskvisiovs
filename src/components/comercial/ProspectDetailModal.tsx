import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, Building2, Calendar, DollarSign, FileText, 
  Pencil, Repeat, CreditCard, Tag, StickyNote, Settings
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppStore } from '@/stores/useAppStore';
import { ProspectDocuments } from './ProspectDocuments';
import { DocumentTypeManager } from './DocumentTypeManager';
import { formatCurrency } from '@/lib/currency';
import type { Prospect, ProspectStatus } from '@/types/database';

const statusConfig: Record<ProspectStatus, { label: string; className: string }> = {
  novo: { label: 'Novo', className: 'border border-input bg-background' },
  em_negociacao: { label: 'Em Negociação', className: 'bg-secondary text-secondary-foreground' },
  proposta_enviada: { label: 'Proposta Enviada', className: 'bg-primary text-primary-foreground' },
  fechado: { label: 'Fechado', className: 'bg-success text-success-foreground' },
  perdido: { label: 'Perdido', className: 'bg-destructive text-destructive-foreground' },
};

interface ProspectDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: Prospect | null;
  onEdit: () => void;
}

export function ProspectDetailModal({ 
  open, 
  onOpenChange, 
  prospect, 
  onEdit 
}: ProspectDetailModalProps) {
  const { projects } = useAppStore();
  const [typeManagerOpen, setTypeManagerOpen] = useState(false);

  if (!prospect) return null;

  const statusCfg = statusConfig[prospect.status];
  const project = prospect.project_id 
    ? projects.find(p => p.id === prospect.project_id)
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="space-y-3">
            <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl truncate">
                  {prospect.client_name}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Detalhes do prospect {prospect.client_name}
                </DialogDescription>
                {prospect.company_name && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {prospect.company_name}
                  </p>
                )}
              </div>
              <Badge className={statusCfg.className}>
                {statusCfg.label}
              </Badge>
            </div>
          </DialogHeader>

          <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info" className="gap-2">
                <User className="w-4 h-4" />
                Informações
              </TabsTrigger>
              <TabsTrigger value="docs" className="gap-2">
                <FileText className="w-4 h-4" />
                Documentos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="flex-1 overflow-y-auto space-y-4 mt-4">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Data de Prospecção
                  </p>
                  <p className="font-medium">
                    {format(parseISO(prospect.prospection_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Valor Estimado
                  </p>
                  <p className="font-medium text-lg">
                    {formatCurrency(prospect.estimated_value)}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Payment Info */}
              {prospect.payment_type && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Tipo de Pagamento</p>
                  <div className="flex items-center gap-2">
                    {prospect.payment_type === 'recorrente' ? (
                      <>
                        <Repeat className="w-4 h-4 text-primary" />
                        <span className="font-medium">Recorrente</span>
                        {prospect.contract_duration && (
                          <Badge variant="secondary">
                            {prospect.contract_duration} meses
                          </Badge>
                        )}
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Pontual</span>
                        {prospect.payment_installments && (
                          <Badge variant="secondary">
                            {prospect.payment_installments}x
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Project Info */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  Tipo de Projeto
                </p>
                <p className="font-medium">
                  {prospect.project_type || project?.project || '-'}
                </p>
              </div>

              {/* Notes */}
              {prospect.notes && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <StickyNote className="w-3 h-3" />
                    Observações
                  </p>
                  <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                    {prospect.notes}
                  </p>
                </div>
              )}

              {/* Edit Button */}
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => {
                  onOpenChange(false);
                  onEdit();
                }}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Editar Informações
              </Button>
            </TabsContent>

            <TabsContent value="docs" className="flex-1 overflow-y-auto mt-4">
              <div className="flex justify-end mb-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setTypeManagerOpen(true)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Tipos
                </Button>
              </div>
              <ProspectDocuments prospectId={prospect.id} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Document Type Manager */}
      <DocumentTypeManager 
        open={typeManagerOpen} 
        onOpenChange={setTypeManagerOpen} 
      />
    </>
  );
}
