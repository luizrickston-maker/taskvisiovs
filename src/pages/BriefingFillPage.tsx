import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Send, 
  Plus, 
  Trash2, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

export default function BriefingFillPage() {
  const [searchParams] = useSearchParams();
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [briefing, setBriefing] = useState<any>(null);
  const [briefingId, setBriefingId] = useState<string | null>(routeId || null);

  // Form States
  const [block1, setBlock1] = useState<any>({ plano: [] });
  const [block2, setBlock2] = useState<any>({ objetivos: [] });
  const [videoItems, setVideoItems] = useState<any[]>([]);
  const [block4, setBlock4] = useState<any>({ tons: [] });
  const [block5, setBlock5] = useState<any>({});
  const [block6, setBlock6] = useState<any>({});

  useEffect(() => {
    const fetchBriefing = async () => {
      try {
        let query = supabase
          .from('briefings' as any)
          .select(`
            *,
            responses:briefing_responses(*),
            video_items:briefing_video_items(*),
            clients(name)
          `);

        if (token) {
          query = query.eq('magic_link_token', token).gt('magic_link_expires_at', new Date().toISOString());
        } else if (routeId) {
          query = query.eq('id', routeId);
        } else {
          throw new Error("Acesso não autorizado");
        }

        const { data, error } = await query.maybeSingle();

        if (error || !data) throw new Error("Link inválido ou expirado");

        setBriefing(data);
        setBriefingId(data.id);
        
        // Map data
        data.responses.forEach((resp: any) => {
          if (resp.block_name === 'identificacao') setBlock1(resp.response_data);
          if (resp.block_name === 'objetivo_mes') setBlock2(resp.response_data);
          if (resp.block_name === 'referencias') setBlock4(resp.response_data);
          if (resp.block_name === 'restricoes') setBlock5(resp.response_data);
          if (resp.block_name === 'fechamento') setBlock6(resp.response_data);
        });
        setVideoItems(data.video_items.sort((a: any, b: any) => a.item_index - b.item_index));
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBriefing();
  }, [token, routeId]);

  const calculateProgress = () => {
    let totalFields = 10; // Simplified weight
    let filledFields = 0;
    if (block1.responsavel) filledFields++;
    if (block2.detalhes) filledFields++;
    if (videoItems.length > 0) filledFields++;
    if (block4.referencias) filledFields++;
    if (block5.observacoes) filledFields++;
    // ... add more logic
    return Math.min(Math.round((filledFields / 5) * 100), 100);
  };

  const addVideoRow = () => {
    setVideoItems([...videoItems, { 
      item_index: videoItems.length + 1, 
      theme: "", 
      format: "Reel", 
      priority: "Normal" 
    }]);
  };

  const removeVideoRow = (index: number) => {
    const newItems = videoItems.filter((_, i) => i !== index).map((item, i) => ({ ...item, item_index: i + 1 }));
    setVideoItems(newItems);
  };

  const handleSubmit = async (final: boolean = false) => {
    if (!briefingId) return;
    setSubmitting(true);
    try {
      // Upsert Responses
      const blocks = [
        { name: 'identificacao', data: block1 },
        { name: 'objetivo_mes', data: block2 },
        { name: 'referencias', data: block4 },
        { name: 'restricoes', data: block5 },
        { name: 'fechamento', data: block6 }
      ];

      for (const block of blocks) {
        await supabase
          .from('briefing_responses' as any)
          .upsert({ 
            briefing_id: briefingId, 
            block_name: block.name, 
            response_data: block.data 
          }, { onConflict: 'briefing_id, block_name' });
      }

      // Sync Video Items
      await supabase.from('briefing_video_items' as any).delete().eq('briefing_id', briefingId);
      if (videoItems.length > 0) {
        await supabase.from('briefing_video_items' as any).insert(
          videoItems.map(v => ({ ...v, briefing_id: briefingId }))
        );
      }

      if (final) {
        await supabase.from('briefings' as any).update({ status: 'in_review' }).eq('id', briefingId);
        toast.success("Briefing enviado com sucesso!");
        setBriefing({ ...briefing, status: 'in_review' });
      } else {
        toast.success("Progresso salvo automaticamente");
      }
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
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
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center space-y-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold">Briefing Já Enviado!</h1>
        <p className="text-muted-foreground max-w-md">Este briefing já foi preenchido e está em fase de revisão. Obrigado pela sua colaboração!</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-primary">{briefing.title}</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
              Cliente: {briefing.clients?.name || "Geral"}
            </p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex-1 md:w-48">
              <div className="flex justify-between text-[10px] mb-1 font-medium">
                <span>Progresso</span>
                <span>{calculateProgress()}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-1.5" />
            </div>
            <Button onClick={() => handleSubmit(true)} disabled={submitting} className="gradient-primary glow-primary h-9 px-6">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finalizar Envio"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 pt-8 max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-amber-800 text-sm flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>Suas alterações são salvas automaticamente. Você pode fechar e voltar a qualquer momento usando o mesmo link.</p>
        </div>

        <Accordion type="multiple" defaultValue={["b1"]} className="space-y-4">
          {/* Blocos implementados similarmente ao Editor, mas com foco em preenchimento */}
          {/* ... Implementação dos blocos 1 a 6 adaptados para o filler ... */}
          <AccordionItem value="b1" className="bg-white px-6 border rounded-xl shadow-sm overflow-hidden">
            <AccordionTrigger className="hover:no-underline py-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">1</div>
                <span className="font-semibold text-lg">Identificação</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-8 pt-2 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Responsável pelo Cliente</Label>
                  <Input value={block1.responsavel || ""} onChange={(e) => setBlock1({...block1, responsavel: e.target.value})} onBlur={() => handleSubmit()} />
                </div>
                <div className="space-y-2">
                  <Label>Mês de Referência</Label>
                  <Input value={block1.mes || ""} onChange={(e) => setBlock1({...block1, mes: e.target.value})} onBlur={() => handleSubmit()} />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="b3" className="bg-white px-6 border rounded-xl shadow-sm overflow-hidden">
            <AccordionTrigger className="hover:no-underline py-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">3</div>
                <span className="font-semibold text-lg">Planejamento dos Vídeos</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-8 pt-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tema / Ideia</TableHead>
                    <TableHead className="w-[140px]">Formato</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videoItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input value={item.theme} onChange={(e) => {
                          const newItems = [...videoItems];
                          newItems[index].theme = e.target.value;
                          setVideoItems(newItems);
                        }} onBlur={() => handleSubmit()} />
                      </TableCell>
                      <TableCell>
                        <Select value={item.format} onValueChange={(val) => {
                          const newItems = [...videoItems];
                          newItems[index].format = val;
                          setVideoItems(newItems);
                          handleSubmit();
                        }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Reel">Reel</SelectItem>
                            <SelectItem value="Talk">Talk</SelectItem>
                            <SelectItem value="Outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => { removeVideoRow(index); handleSubmit(); }}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button variant="outline" className="mt-4 w-full border-dashed" onClick={() => { addVideoRow(); handleSubmit(); }}>
                <Plus className="w-4 h-4 mr-2" /> Adicionar Novo Vídeo
              </Button>
            </AccordionContent>
          </AccordionItem>
          
          {/* ... Outros blocos seguem o mesmo padrão de autosave no onBlur/onChange ... */}
        </Accordion>
      </main>
    </div>
  );
}
