import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Tags, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { DocumentType } from '@/types/database';

const DEFAULT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', 
  '#f59e0b', '#22c55e', '#14b8a6', '#3b82f6'
];

interface DocumentTypeManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentTypeManager({ open, onOpenChange }: DocumentTypeManagerProps) {
  const { user } = useAuthContext();
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLORS[0]);

  useEffect(() => {
    if (!user || !open) return;

    const loadTypes = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('document_types')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        setDocumentTypes(data as DocumentType[]);
      } catch (error) {
        console.error('Error loading document types:', error);
        toast.error('Erro ao carregar tipos de documento');
      } finally {
        setLoading(false);
      }
    };

    loadTypes();
  }, [user, open]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setColor(DEFAULT_COLORS[0]);
  };

  const handleEdit = (type: DocumentType) => {
    setEditingId(type.id);
    setName(type.name);
    setColor(type.color);
  };

  const handleSave = async () => {
    if (!user || !name.trim()) return;

    setSaving(true);
    try {
      if (editingId) {
        // Update
        const { error } = await supabase
          .from('document_types')
          .update({ name: name.trim(), color })
          .eq('id', editingId);

        if (error) throw error;
        
        setDocumentTypes(prev => 
          prev.map(t => t.id === editingId ? { ...t, name: name.trim(), color } : t)
        );
        toast.success('Tipo atualizado!');
      } else {
        // Create
        const { data, error } = await supabase
          .from('document_types')
          .insert({ user_id: user.id, name: name.trim(), color })
          .select()
          .single();

        if (error) throw error;
        
        setDocumentTypes(prev => [...prev, data as DocumentType]);
        toast.success('Tipo criado!');
      }

      resetForm();
    } catch (error) {
      console.error('Error saving document type:', error);
      toast.error('Erro ao salvar tipo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('document_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setDocumentTypes(prev => prev.filter(t => t.id !== id));
      toast.success('Tipo excluído!');
    } catch (error) {
      console.error('Error deleting document type:', error);
      toast.error('Erro ao excluir tipo');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="w-5 h-5" />
            Tipos de Documento
          </DialogTitle>
          <DialogDescription>
            Crie categorias para organizar os documentos dos seus clientes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Form */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label>Nome do Tipo</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Contrato, Checklist..."
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-transform ${
                      color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              {editingId && (
                <Button variant="outline" onClick={resetForm} disabled={saving}>
                  Cancelar
                </Button>
              )}
              <Button onClick={handleSave} disabled={!name.trim() || saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {editingId ? 'Atualizar' : 'Adicionar'}
              </Button>
            </div>
          </div>

          {/* Types List */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : documentTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum tipo cadastrado
              </p>
            ) : (
              documentTypes.map((type) => (
                <div 
                  key={type.id} 
                  className="flex items-center justify-between p-2 rounded-md bg-background border"
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full shrink-0" 
                      style={{ backgroundColor: type.color }}
                    />
                    <span className="text-sm font-medium">{type.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleEdit(type)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(type.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
