import { useState, useEffect } from 'react';
import { Plus, ExternalLink, Trash2, Wrench } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContextSafe } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const toolSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(200, 'Máximo 200 caracteres'),
  url: z.string().trim().min(1, 'Link é obrigatório').max(2000, 'URL muito longa'),
});

interface UserTool {
  id: string;
  name: string;
  url: string;
  created_at: string;
}

export default function FerramentasPage() {
  const [tools, setTools] = useState<UserTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const authContext = useAuthContextSafe();
  const userId = authContext?.user?.id;
  const { toast } = useToast();

  const fetchTools = async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('user_tools')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (!error && data) setTools(data as UserTool[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchTools();
  }, [userId]);

  const handleAdd = async () => {
    if (!userId) return;
    const parsed = toolSchema.safeParse({ name, url });
    if (!parsed.success) {
      toast({ title: 'Dados inválidos', description: parsed.error.issues[0]?.message, variant: 'destructive' });
      return;
    }
    setSaving(true);
    let finalUrl = parsed.data.url;
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;

    const { error } = await supabase
      .from('user_tools')
      .insert({ user_id: userId, name: parsed.data.name, url: finalUrl });

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Ferramenta adicionada!' });
      setName('');
      setUrl('');
      setOpen(false);
      fetchTools();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('user_tools').delete().eq('id', id);
    if (!error) {
      setTools((prev) => prev.filter((t) => t.id !== id));
      toast({ title: 'Ferramenta removida' });
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ferramentas</h1>
          <p className="text-muted-foreground text-sm">Acesso rápido às suas ferramentas favoritas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Ferramenta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input placeholder="Ex: Figma" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
              </div>
              <div className="space-y-2">
                <Label>Link</Label>
                <Input placeholder="https://figma.com" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={2000} />
              </div>
              <Button onClick={handleAdd} disabled={saving || !name.trim() || !url.trim()} className="w-full">
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : tools.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Wrench className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhuma ferramenta cadastrada ainda.</p>
            <p className="text-sm text-muted-foreground">Clique em "Adicionar" para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <Card key={tool.id} className="group relative hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="truncate">{tool.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => handleDelete(tool.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <a
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tool.url.replace(/^https?:\/\//, '')}</span>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
