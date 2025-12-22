import { useState } from 'react';
import { FolderKanban, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const colorOptions = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
];

export default function CategoryManager() {
  const { projectCategories, addProjectCategory, deleteProjectCategory } = useAppStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [description, setDescription] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('project_categories')
      .insert({
        user_id: user.id,
        name: name.trim(),
        color,
        description: description.trim() || null,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar categoria');
      return;
    }

    addProjectCategory(data);
    setName('');
    setColor('#6366f1');
    setDescription('');
    setOpen(false);
    toast.success('Categoria criada!');
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('project_categories')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir categoria');
      return;
    }

    deleteProjectCategory(id);
    toast.success('Categoria excluída');
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FolderKanban className="w-5 h-5 text-primary" />
          Categorias
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-auto h-8 w-8">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Categoria</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    placeholder="Ex: Desenvolvimento"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Input
                    placeholder="Ex: Projetos de código"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
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
                          outline: color === c ? '2px solid white' : 'none',
                          outlineOffset: '2px',
                        }}
                        onClick={() => setColor(c)}
                      />
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={!name.trim()}>
                  Criar Categoria
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {projectCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma categoria criada
          </p>
        ) : (
          <div className="space-y-2">
            {projectCategories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50 group"
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{cat.name}</p>
                  {cat.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {cat.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(cat.id)}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
