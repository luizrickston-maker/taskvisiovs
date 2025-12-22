import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const colorOptions = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
];

interface CategoryManagerProps {
  selectedCategory: string | null;
  onSelectCategory: (id: string | null) => void;
}

export default function CategoryManager({ selectedCategory, onSelectCategory }: CategoryManagerProps) {
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

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const { error } = await supabase
      .from('project_categories')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir categoria');
      return;
    }

    deleteProjectCategory(id);
    if (selectedCategory === id) {
      onSelectCategory(null);
    }
    toast.success('Categoria excluída');
  };

  const handleCategoryClick = (id: string) => {
    onSelectCategory(selectedCategory === id ? null : id);
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
      {/* Add Category Button */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex-shrink-0 gap-1">
            <Plus className="w-4 h-4" />
            Categoria
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

      {/* Category Pills */}
      {projectCategories.length === 0 ? (
        <span className="text-sm text-muted-foreground">Nenhuma categoria</span>
      ) : (
        projectCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryClick(cat.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all flex-shrink-0 group',
              'bg-secondary/60 hover:bg-secondary',
              selectedCategory === cat.id && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
            )}
          >
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: cat.color }}
            />
            <span className="truncate max-w-[120px]">{cat.name}</span>
            <button
              onClick={(e) => handleDelete(e, cat.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-destructive/20 rounded"
            >
              <Trash2 className="w-3 h-3 text-destructive" />
            </button>
          </button>
        ))
      )}
    </div>
  );
}
