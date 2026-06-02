import React, { useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Video, 
  Target, 
  Clock, 
  Film, 
  Download,
  Palette,
  Type,
  ExternalLink,
  Music,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { VideoEditingBriefing } from '@/types/video';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

interface BriefingModalProps {
  briefing: VideoEditingBriefing | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BriefingModal({ briefing, isOpen, onClose }: BriefingModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  if (!briefing) return null;

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;

    const toastId = toast.loading('Gerando PDF...');
    try {
      const element = contentRef.current;
      
      // Temporarily add a class to ensure light mode colors for capture
      element.classList.add('bg-white', 'text-slate-900', 'light');
      
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`briefing-${briefing.title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      
      // Remove temporary classes
      element.classList.remove('bg-white', 'text-slate-900', 'light');
      
      toast.success('PDF baixado com sucesso!', { id: toastId });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF.', { id: toastId });
    }
  };

  const statusColors = {
    draft: 'bg-slate-500',
    pending: 'bg-amber-500',
    in_progress: 'bg-blue-500',
    review: 'bg-purple-500',
    completed: 'bg-green-500'
  };

  const statusLabels = {
    draft: 'Rascunho',
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    review: 'Em Revisão',
    completed: 'Concluído'
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between gap-4 pr-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Video className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold uppercase tracking-tight">
                  {briefing.title}
                </DialogTitle>
                <DialogDescription className="text-xs font-medium flex items-center gap-2 mt-1">
                  <Badge className={cn("text-[10px] uppercase font-bold", statusColors[briefing.status])}>
                    {statusLabels[briefing.status]}
                  </Badge>
                  {briefing.delivery_deadline && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Entrega: {format(new Date(briefing.delivery_deadline), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  )}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="p-8 space-y-8" ref={contentRef}>
          {/* Top Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Target className="w-4 h-4" /> Objetivo do Vídeo
              </h3>
              <div className="p-4 bg-muted/30 rounded-xl border border-border italic text-sm text-foreground/80 leading-relaxed">
                {briefing.objective || "Não informado"}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" /> Duração Alvo
              </h3>
              <div className="p-4 bg-muted/30 rounded-xl border border-border font-bold text-primary">
                {briefing.target_duration || "Livre / Não especificado"}
              </div>
            </section>
          </div>

          {/* Files and Assets */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Film className="w-4 h-4" /> Arquivos e Produção
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                <div className="flex items-center gap-3">
                  <ExternalLink className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Link dos Arquivos Brutos</p>
                    <p className="text-sm font-medium text-primary break-all">
                      {briefing.files_sent || "Nenhum link fornecido"}
                    </p>
                  </div>
                </div>
                {briefing.files_sent && (
                  <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                    <a href={briefing.files_sent} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-500/5 rounded-xl border border-green-500/10">
                  <p className="text-[10px] font-black uppercase text-green-600 mb-2">Preferências / Key Moments</p>
                  <p className="text-sm leading-relaxed">{briefing.preferred_take || "Sem preferências específicas"}</p>
                </div>
                <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/10">
                  <p className="text-[10px] font-black uppercase text-red-600 mb-2">O que ignorar / Erros</p>
                  <p className="text-sm leading-relaxed">{briefing.ignore_takes || "Nenhum erro reportado"}</p>
                </div>
              </div>

              {briefing.b_roll_included && (
                <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
                  <p className="text-[10px] font-black uppercase text-blue-600 mb-2">Uso de B-Roll (Cobertura)</p>
                  <p className="text-sm leading-relaxed">{briefing.b_roll_usage || "Usar conforme necessário para dinamizar"}</p>
                </div>
              )}
            </div>
          </section>

          {/* Visual and Content Style */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Palette className="w-4 h-4" /> Estilo e Identidade
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/20 rounded-xl border border-border flex items-center gap-3">
                <Music className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Música</p>
                  <p className="text-sm font-bold">{briefing.music_override || briefing.specific_music || "Padrão"}</p>
                </div>
              </div>
              <div className="p-4 bg-muted/20 rounded-xl border border-border flex items-center gap-3">
                <Type className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Tipografia</p>
                  <p className="text-sm font-bold">{briefing.typography_override || "Padrão"}</p>
                </div>
              </div>
              <div className="p-4 bg-muted/20 rounded-xl border border-border flex items-center gap-3">
                <Palette className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Estilo de Cor</p>
                  <p className="text-sm font-bold">{briefing.color_style_override || "Padrão"}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Text and Messaging */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" /> Roteiro e Mensagem
            </h3>
            <div className="space-y-4">
              <div className="flex gap-4 p-4 bg-primary/5 rounded-xl">
                <div className="w-1 h-auto bg-primary rounded-full shrink-0" />
                <div>
                  <p className="text-[10px] font-black uppercase text-primary mb-1">Hook de Abertura (Gancho)</p>
                  <p className="text-sm font-medium leading-relaxed">{briefing.opening_hook || "Não especificado"}</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 bg-amber-500/5 rounded-xl">
                <div className="w-1 h-auto bg-amber-500 rounded-full shrink-0" />
                <div>
                  <p className="text-[10px] font-black uppercase text-amber-600 mb-1">CTA Final</p>
                  <p className="text-sm font-medium leading-relaxed">{briefing.cta_final || "Seguir padrão"}</p>
                </div>
              </div>
              {briefing.custom_caption && (
                <div className="p-4 bg-slate-500/5 rounded-xl">
                  <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Legendas e Observações extras</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{briefing.custom_caption}</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <DialogFooter className="p-6 bg-muted/10 border-t flex items-center justify-between sm:justify-between">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest italic">
            Visualização somente leitura • Gerado por Chapada Digital
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} className="font-bold text-xs uppercase h-10 px-6">
              Fechar
            </Button>
            <Button onClick={handleDownloadPDF} className="font-bold text-xs uppercase h-10 px-6 gap-2">
              <Download className="w-4 h-4" /> Baixar em PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
