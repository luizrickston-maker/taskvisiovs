import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput, parseBRLToNumber, numberToBRL } from '@/components/ui/currency-input';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/useAppStore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Product } from '@/types/database';
import { Loader2, Package } from 'lucide-react';

interface ProductFormProps {
  product?: Product;
  onClose: () => void;
}

export function ProductForm({ product, onClose }: ProductFormProps) {
  const { user } = useAuth();
  const { addProduct, updateProduct } = useAppStore();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditMode = !!product;

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setDescription(product.description || '');
      setSku(product.sku || '');
      setCostPrice(numberToBRL(product.cost_price || 0));
      setImageUrl(product.image_url || '');
    }
  }, [product]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (name.length > 50) {
      newErrors.name = 'Nome deve ter no máximo 50 caracteres';
    }

    if (description && description.length > 200) {
      newErrors.description = 'Descrição deve ter no máximo 200 caracteres';
    }

    if (sku && sku.length > 30) {
      newErrors.sku = 'SKU deve ter no máximo 30 caracteres';
    }

    const costValue = parseBRLToNumber(costPrice);
    if (costValue < 0) {
      newErrors.costPrice = 'Custo não pode ser negativo';
    }

    if (imageUrl && imageUrl.trim()) {
      try {
        new URL(imageUrl);
      } catch {
        newErrors.imageUrl = 'URL inválida';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !validate()) return;

    setIsLoading(true);

    try {
      const productData = {
        name: name.trim(),
        description: description.trim() || null,
        sku: sku.trim() || null,
        cost_price: parseBRLToNumber(costPrice),
        image_url: imageUrl.trim() || null,
        is_active: true,
      };

      if (isEditMode && product?.id) {
        const { data, error } = await supabase
          .from('products')
          .update({ ...productData, updated_at: new Date().toISOString() })
          .eq('id', product.id)
          .select()
          .single();

        if (error) throw error;
        
        updateProduct(product.id, data as Product);
        toast.success('Produto atualizado com sucesso!');
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert({ ...productData, user_id: user.id })
          .select()
          .single();

        if (error) throw error;

        addProduct(data as Product);
        toast.success('Produto criado com sucesso!');
      }

      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Erro ao salvar produto. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isEditMode ? 'Editar Produto' : 'Novo Produto'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Atualize as informações do produto abaixo.'
              : 'Preencha as informações do novo produto.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do produto"
              maxLength={50}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do produto (opcional)"
              maxLength={200}
              rows={3}
              className={errors.description ? 'border-destructive' : ''}
            />
            <div className="flex justify-between">
              {errors.description ? (
                <p className="text-sm text-destructive">{errors.description}</p>
              ) : (
                <span />
              )}
              <span className="text-xs text-muted-foreground">
                {description.length}/200
              </span>
            </div>
          </div>

          {/* SKU e Custo lado a lado */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Código único"
                maxLength={30}
                className={errors.sku ? 'border-destructive' : ''}
              />
              {errors.sku && (
                <p className="text-sm text-destructive">{errors.sku}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="costPrice">Custo</Label>
              <CurrencyInput
                id="costPrice"
                value={costPrice}
                onChange={setCostPrice}
                placeholder="R$ 0,00"
                className={errors.costPrice ? 'border-destructive' : ''}
              />
              {errors.costPrice && (
                <p className="text-sm text-destructive">{errors.costPrice}</p>
              )}
            </div>
          </div>

          {/* URL da Imagem */}
          <div className="space-y-2">
            <Label htmlFor="imageUrl">URL da Imagem</Label>
            <Input
              id="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg"
              className={errors.imageUrl ? 'border-destructive' : ''}
            />
            {errors.imageUrl && (
              <p className="text-sm text-destructive">{errors.imageUrl}</p>
            )}
          </div>

          {/* Preview da Imagem */}
          {imageUrl && !errors.imageUrl && (
            <div className="rounded-md border p-2">
              <img
                src={imageUrl}
                alt="Preview"
                className="h-24 w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Salvar Alterações' : 'Criar Produto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}