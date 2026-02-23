import { useState, useEffect, useMemo } from 'react';
import { Plus, ExternalLink, Trash2, Wrench, Search, Tag, X, Pencil } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContextSafe } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const toolSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(200, 'Máximo 200 caracteres'),
  url: z.string().trim().min(1, 'Link é obrigatório').max(2000, 'URL muito longa'),
});

interface ToolCategory {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

interface UserTool {
  id: string;
  name: string;
  url: string;
  category_id: string | null;
  created_at: string;
}

const colorOptions = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
];

export default function FerramentasPage() {
  const [tools, setTools] = useState<UserTool[]>([]);
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('none');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#6366f1');
  const [editingTool, setEditingTool] = useState<UserTool | null>(null);
  const authContext = useAuthContextSafe();
  const userId = authContext?.user?.id;
  const { toast } = useToast();

  const fetchData = async () => {
    if (!userId) return;
    const [toolsRes, catsRes] = await Promise.all([
      supabase.from('user_tools').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      supabase.from('tool_categories').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    ]);
    if (toolsRes.data) setTools(toolsRes.data as UserTool[]);
    if (catsRes.data) setCategories(catsRes.data as ToolCategory[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [userId]);

  const filteredTools = useMemo(() => {
    let result = tools;
    if (filterCategory) {
      result = result.filter((t) => t.category_id === filterCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(q) || t.url.toLowerCase().includes(q));
    }
    return result;
  }, [tools, filterCategory, search]);

  const resetForm = () => {
    setName('');
    setUrl('');
    setSelectedCategoryId('none');
    setEditingTool(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setOpen(true);
  };

  const handleOpenEdit = (tool: UserTool) => {
    setEditingTool(tool);
    setName(tool.name);
    setUrl(tool.url);
    setSelectedCategoryId(tool.category_id || 'none');
    setOpen(true);
  };

  const handleSave = async () => {
    if (!userId) return;
    const parsed = toolSchema.safeParse({ name, url });
    if (!parsed.success) {
      toast({ title: 'Dados inválidos', description: parsed.error.issues[0]?.message, variant: 'destructive' });
      return;
    }
    setSaving(true);
    let finalUrl = parsed.data.url;
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;

    const categoryId = selectedCategoryId === 'none' ? null : selectedCategoryId;

    if (editingTool) {
      const { error } = await supabase
        .from('user_tools')
        .update({ name: parsed.data.name, url: finalUrl, category_id: categoryId })
        .eq('id', editingTool.id);

      if (error) {
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Ferramenta atualizada!' });
        resetForm();
        setOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('user_tools')
        .insert({ user_id: userId, name: parsed.data.name, url: finalUrl, category_id: categoryId });

      if (error) {
        toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Ferramenta adicionada!' });
        resetForm();
        setOpen(false);
        fetchData();
      }
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

  const handleAddCategory = async () => {
    if (!userId || !catName.trim()) return;
    const { data, error } = await supabase
      .from('tool_categories')
      .insert({ user_id: userId, name: catName.trim(), color: catColor })
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro ao criar categoria', variant: 'destructive' });
    } else {
      setCategories((prev) => [...prev, data as ToolCategory]);
      setCatName('');
      setCatColor('#6366f1');
      setCatOpen(false);
      toast({ title: 'Categoria criada!' });
    }
  };

  const handleDeleteCategory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const { error } = await supabase.from('tool_categories').delete().eq('id', id);
    if (!error) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (filterCategory === id) setFilterCategory(null);
      toast({ title: 'Categoria excluída' });
    }
  };

  const getCategoryById = (id: string | null) => categories.find((c) => c.id === id);

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ferramentas</h1>
          <p className="text-muted-foreground text-sm">Acesso rápido às suas ferramentas favoritas</p>
        </div>
        <div className="flex gap-2">
          {/* New Category Dialog */}
          <Dialog open={catOpen} onOpenChange={setCatOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <Tag className="w-4 h-4" /> Categoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Categoria</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input placeholder="Ex: Design" value={catName} onChange={(e) => setCatName(e.target.value)} maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                        style={{
                          backgroundColor: c,
                          outline: catColor === c ? '2px solid white' : 'none',
                          outlineOffset: '2px',
                        }}
                        onClick={() => setCatColor(c)}
                      />
                    ))}
                  </div>
                </div>
                <Button onClick={handleAddCategory} disabled={!catName.trim()} className="w-full">
                  Criar Categoria
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* New Tool Button */}
          <Button size="sm" className="gap-2" onClick={handleOpenAdd}>
            <Plus className="w-4 h-4" /> Adicionar
          </Button>
        </div>
      </div>

      {/* Add/Edit Tool Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTool ? 'Editar Ferramenta' : 'Nova Ferramenta'}</DialogTitle>
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
            <div className="space-y-2">
              <Label>Categoria (opcional)</Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} disabled={saving || !name.trim() || !url.trim()} className="w-full">
              {saving ? 'Salvando...' : editingTool ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search + Category Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ferramenta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <Badge
              variant={filterCategory === null ? 'default' : 'secondary'}
              className="cursor-pointer px-3 py-1 text-xs shrink-0"
              onClick={() => setFilterCategory(null)}
            >
              Todas
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat.id}
                variant={filterCategory === cat.id ? 'default' : 'secondary'}
                className={cn(
                  'cursor-pointer gap-1.5 px-2.5 py-1 text-xs font-medium transition-all shrink-0 group hover:opacity-90',
                  filterCategory === cat.id && 'ring-2 ring-offset-1 ring-offset-background'
                )}
                style={filterCategory === cat.id ? {
                  backgroundColor: cat.color,
                  borderColor: cat.color,
                } : {
                  backgroundColor: `${cat.color}15`,
                  color: cat.color,
                  borderColor: `${cat.color}30`,
                }}
                onClick={() => setFilterCategory(filterCategory === cat.id ? null : cat.id)}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: filterCategory === cat.id ? 'white' : cat.color }} />
                <span className="truncate max-w-[100px]">{cat.name}</span>
                <button
                  onClick={(e) => handleDeleteCategory(e, cat.id)}
                  className="transition-opacity p-0.5 hover:bg-white/20 rounded ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Tools Grid */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredTools.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Wrench className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {tools.length === 0 ? 'Nenhuma ferramenta cadastrada ainda.' : 'Nenhuma ferramenta encontrada.'}
            </p>
            {tools.length === 0 && (
              <p className="text-sm text-muted-foreground">Clique em "Adicionar" para começar.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTools.map((tool) => {
            const cat = getCategoryById(tool.category_id);
            return (
              <Card key={tool.id} className="group relative hover:shadow-md transition-shadow">
                {cat && (
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-lg" style={{ backgroundColor: cat.color }} />
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="truncate">{tool.name}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenEdit(tool)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(tool.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <a
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{tool.url.replace(/^https?:\/\//, '')}</span>
                  </a>
                  {cat && (
                    <Badge
                      variant="secondary"
                      className="text-xs gap-1"
                      style={{ backgroundColor: `${cat.color}15`, color: cat.color, borderColor: `${cat.color}30` }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
