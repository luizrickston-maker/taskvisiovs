import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit2, Check, X, Tags } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CorporateCostCategory } from '@/types/database';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
];

const SUGGESTED_CATEGORIES = [
  { name: 'Funcionários CLT', color: '#3b82f6' },
  { name: 'Prestadores PJ', color: '#8b5cf6' },
  { name: 'Freelancers', color: '#a855f7' },
  { name: 'Energia', color: '#f59e0b' },
  { name: 'Internet', color: '#06b6d4' },
  { name: 'Aluguel', color: '#ef4444' },
  { name: 'Software/SaaS', color: '#22c55e' },
  { name: 'Marketing', color: '#ec4899' },
  { name: 'Outros', color: '#6b7280' },
];

export function CostCategoryManager() {
  const { user } = useAuthContext();
  const { corporateCostCategories, corporateCosts, addCorporateCostCategory, updateCorporateCostCategory, deleteCorporateCostCategory } = useAppStore();
  
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!user || !newName.trim()) {
      toast.error('Digite o nome da categoria');
      return;
    }

    setSaving(true);
    
    const { data, error } = await supabase
      .from('corporate_cost_categories')
      .insert({
        user_id: user.id,
        name: newName.trim(),
        color: newColor,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar categoria');
    } else {
      addCorporateCostCategory(data as CorporateCostCategory);
      toast.success('Categoria criada!');
      setNewName('');
      setNewColor('#6366f1');
    }
    
    setSaving(false);
  };

  const handleAddSuggested = async (suggestion: { name: string; color: string }) => {
    if (!user) return;
    
    // Check if already exists
    const exists = corporateCostCategories.some(
      c => c.name.toLowerCase() === suggestion.name.toLowerCase()
    );
    
    if (exists) {
      toast.info('Categoria já existe');
      return;
    }

    const { data, error } = await supabase
      .from('corporate_cost_categories')
      .insert({
        user_id: user.id,
        name: suggestion.name,
        color: suggestion.color,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar categoria');
    } else {
      addCorporateCostCategory(data as CorporateCostCategory);
      toast.success(`Categoria "${suggestion.name}" criada!`);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) {
      toast.error('Digite o nome da categoria');
      return;
    }

    const { error } = await supabase
      .from('corporate_cost_categories')
      .update({ name: editName.trim(), color: editColor })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar categoria');
    } else {
      updateCorporateCostCategory(id, { name: editName.trim(), color: editColor });
      toast.success('Categoria atualizada!');
      setEditingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    const costsUsingCategory = corporateCosts.filter(c => c.category_id === id).length;
    
    if (costsUsingCategory > 0) {
      toast.error(`Categoria possui ${costsUsingCategory} custo(s) vinculado(s)`);
      return;
    }

    const { error } = await supabase
      .from('corporate_cost_categories')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir categoria');
    } else {
      deleteCorporateCostCategory(id);
      toast.success('Categoria excluída');
    }
  };

  const getCostCount = (categoryId: string) => {
    return corporateCosts.filter(c => c.category_id === categoryId).length;
  };

  const availableSuggestions = SUGGESTED_CATEGORIES.filter(
    s => !corporateCostCategories.some(c => c.name.toLowerCase() === s.name.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Add New Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tags className="w-5 h-5 text-primary" />
            Nova Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Energia Elétrica"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-6 h-6 rounded-md border-2 transition-all ${
                      newColor === color ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewColor(color)}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAdd} disabled={saving}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suggested Categories */}
      {availableSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sugestões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {availableSuggestions.map((suggestion) => (
                <Badge
                  key={suggestion.name}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent transition-colors px-3 py-1"
                  onClick={() => handleAddSuggested(suggestion)}
                >
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: suggestion.color }}
                  />
                  {suggestion.name}
                  <Plus className="w-3 h-3 ml-2" />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Suas Categorias</CardTitle>
        </CardHeader>
        <CardContent>
          {corporateCostCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma categoria criada ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {corporateCostCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  {editingId === category.id ? (
                    <div className="flex flex-1 items-center gap-3">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 h-8"
                      />
                      <div className="flex gap-1">
                        {PRESET_COLORS.slice(0, 8).map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-5 h-5 rounded border ${
                              editColor === color ? 'ring-2 ring-foreground' : ''
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setEditColor(color)}
                          />
                        ))}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleUpdate(category.id)}
                      >
                        <Check className="w-4 h-4 text-green-500" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium">{category.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {getCostCount(category.id)} custo(s)
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingId(category.id);
                            setEditName(category.name);
                            setEditColor(category.color);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(category.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
