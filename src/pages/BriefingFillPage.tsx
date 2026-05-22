import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Accordion } from "@/components/ui/accordion";
import { 
  Send, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { BriefingWithDetails } from "@/types/briefing";
import { BriefingBlockWrapper } from "@/components/briefings/BriefingBlockWrapper";
import { BriefingBlock1 } from "@/components/briefings/BriefingBlock1";
import { BriefingBlock2 } from "@/components/briefings/BriefingBlock2";
import { BriefingBlock3 } from "@/components/briefings/BriefingBlock3";
import { BriefingBlock4 } from "@/components/briefings/BriefingBlock4";
import { BriefingBlock5 } from "@/components/briefings/BriefingBlock5";
import { BriefingBlock6 } from "@/components/briefings/BriefingBlock6";

import { 
  BriefingWithDetails,
  BriefingResponseBlock1,
  BriefingResponseBlock2,
  BriefingResponseBlock4,
  BriefingResponseBlock5,
  BriefingResponseBlock6,
  BriefingVideoItem
} from "@/types/briefing";

export default function BriefingFillPage() {
  const [searchParams] = useSearchParams();
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [briefing, setBriefing] = useState<BriefingWithDetails | null>(null);

  // Form States
  const [block1, setBlock1] = useState<Partial<BriefingResponseBlock1>>({});
  const [block2, setBlock2] = useState<Partial<BriefingResponseBlock2>>({});
  const [videoItems, setVideoItems] = useState<BriefingVideoItem[]>([]);
  const [block4, setBlock4] = useState<Partial<BriefingResponseBlock4>>({});
  const [block5, setBlock5] = useState<Partial<BriefingResponseBlock5>>({});
  const [block6, setBlock6] = useState<Partial<BriefingResponseBlock6>>({});

  useEffect(() => {
    const fetchBriefing = async () => {
      try {
        let query = supabase
          .from('briefings')
          .select(`
            *,
            responses:briefing_responses(*),
            video_items:briefing_video_items(*),
            client:clients(name)
          `);

        if (token && token !== 'none') {
          query = query.eq('magic_link_token', token).gt('magic_link_expires_at', new Date().toISOString());
        } else if (routeId && routeId !== 'none') {
          query = query.eq('id', routeId);
        } else {
          throw new Error("Acesso não autorizado");
        }

        const { data, error } = await query.maybeSingle();

        if (error || !data) throw new Error("Link inválido ou expirado");

        const briefingData = data as any as BriefingWithDetails;
        setBriefing(briefingData);
        
        // Map data
        briefingData.responses.forEach((resp) => {
          const blockData = resp.response_data as any;
          if (resp.block_name === 'identificacao') setBlock1(blockData);
          if (resp.block_name === 'estrutura') setBlock2(blockData);
          if (resp.block_name === 'referencias') setBlock4(blockData);
          if (resp.block_name === 'distribuicao') setBlock5(blockData);
          if (resp.block_name === 'prazos') setBlock6(blockData);
        });
        setVideoItems(briefingData.video_items.sort((a, b) => a.item_index - b.item_index));
      } catch (err: unknown) {
        const error = err as Error;
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBriefing();
  }, [token, routeId]);

  const calculateProgress = () => {
    const blocks = [block1, block2, block4, block5, block6];
    const filledBlocks = blocks.filter(b => Object.keys(b || {}).length > 0).length;
    const videoFilled = videoItems.length > 0 ? 1 : 0;
    return Math.round(((filledBlocks + videoFilled) / 6) * 100);
  };

  const handleAutoSave = async () => {
    if (!briefing?.id || briefing.status === 'in_review') return;
    
    try {
      const blocks = [
        { name: 'identificacao', data: block1 },
        { name: 'estrutura', data: block2 },
        { name: 'referencias', data: block4 },
        { name: 'distribuicao', data: block5 },
        { name: 'prazos', data: block6 }
      ];

      for (const block of blocks) {
        if (Object.keys(block.data || {}).length > 0) {
          await supabase
            .from('briefing_responses')
            .upsert({ 
              briefing_id: briefing.id, 
              block_name: block.name, 
              response_data: block.data,
              updated_at: new Date().toISOString()
            }, { onConflict: 'briefing_id, block_name' });
        }
      }

      // Sync video items
      await supabase.from('briefing_video_items').delete().eq('briefing_id', briefing.id);
      if (videoItems.length > 0) {
        await supabase.from('briefing_video_items').insert(
          videoItems.map((v, i) => ({ ...v, briefing_id: (briefing as BriefingWithDetails).id, item_index: i + 1 }))
        );
      }
    } catch (err) {
      console.error("Auto-save error:", err);
    }
  };

  // Debounced auto-save would be better, but for now we'll trigger on specific actions
  useEffect(() => {
    const timer = setTimeout(() => {
      handleAutoSave();
    }, 2000);
    return () => clearTimeout(timer);
  }, [block1, block2, videoItems, block4, block5, block6]);

  const handleSubmit = async () => {
    if (!briefing?.id) return;
    setSubmitting(true);
    try {
      await handleAutoSave();
      
      const { error } = await supabase
        .from('briefings')
        .update({ status: 'in_review', updated_at: new Date().toISOString() })
        .eq('id', briefing.id);

      if (error) throw error;
      
      toast.success("Briefing enviado com sucesso!");
      setBriefing({ ...briefing, status: 'in_review' });
    } catch (err: unknown) {
      const error = err as Error;
      toast.error("Erro ao enviar: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Validando seu acesso...</p>
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center space-y-4">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold">Link Expirado ou Inválido</h1>
        <p className="text-muted-foreground max-w-md">Este link de preenchimento não é mais válido. Por favor, solicite um novo link ao seu gestor.</p>
      </div>
    );
  }

  if (briefing.status === 'in_review' || briefing.status === 'approved') {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center space-y-4 animate-in zoom-in duration-300">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold">Briefing Já Enviado!</h1>
        <p className="text-muted-foreground max-w-md">Obrigado! Este briefing já foi preenchido e está em fase de revisão pelo gestor.</p>
        <Button variant="outline" onClick={() => navigate("/")}>Voltar para o Início</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b shadow-sm">
        <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-primary">{briefing.title}</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
              Cliente: {briefing.client?.name || "Geral"}
            </p>
          </div>
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div className="flex-1 md:w-64">
              <div className="flex justify-between text-[10px] mb-1.5 font-bold uppercase text-muted-foreground">
                <span>Progresso de Preenchimento</span>
                <span>{calculateProgress()}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
            </div>
            <Button 
              onClick={handleSubmit} 
              disabled={submitting} 
              className="gradient-primary glow-primary h-10 px-8 font-bold"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finalizar e Enviar"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 pt-10 max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-blue-800 text-sm flex gap-4 items-center shadow-sm">
          <div className="bg-blue-100 p-2 rounded-full">
            <AlertCircle className="w-5 h-5" />
          </div>
          <p className="font-medium">
            Fique tranquilo: Suas alterações são salvas automaticamente enquanto você preenche.
          </p>
        </div>

        <Accordion type="multiple" defaultValue={["b1"]} className="space-y-4">
          <BriefingBlockWrapper value="b1" number={1} title="Detalhes do Cliente e Projeto">
            <BriefingBlock1 data={block1} onChange={setBlock1} />
          </BriefingBlockWrapper>

          <BriefingBlockWrapper value="b2" number={2} title="Estrutura e Formato">
            <BriefingBlock2 data={block2} onChange={setBlock2} />
          </BriefingBlockWrapper>

          <BriefingBlockWrapper value="b3" number={3} title="Planejamento dos Vídeos (Temas)">
            <BriefingBlock3 items={videoItems} onChange={setVideoItems} />
          </BriefingBlockWrapper>

          <BriefingBlockWrapper value="b4" number={4} title="Referências e Identidade Visual">
            <BriefingBlock4 data={block4} onChange={setBlock4} />
          </BriefingBlockWrapper>

          <BriefingBlockWrapper value="b5" number={5} title="Distribuição e Canais">
            <BriefingBlock5 data={block5} onChange={setBlock5} />
          </BriefingBlockWrapper>

          <BriefingBlockWrapper value="b6" number={6} title="Prazos e Orçamento">
            <BriefingBlock6 data={block6} onChange={setBlock6} />
          </BriefingBlockWrapper>
        </Accordion>

        <div className="flex justify-center pt-8">
           <Button 
            onClick={handleSubmit} 
            disabled={submitting} 
            size="lg"
            className="gradient-primary glow-primary px-12 py-6 text-lg font-bold rounded-2xl"
          >
            {submitting ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Send className="w-6 h-6 mr-3" />}
            Concluir e Enviar para Revisão
          </Button>
        </div>
      </main>
    </div>
  );
}
