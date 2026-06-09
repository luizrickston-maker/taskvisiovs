import { useState } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCaixaCategorias, useCreateCaixaCategoria, useDeleteCaixaCategoria } from '@/hooks/useCaixaPJ';

const CORES_SUGERIDAS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#6b7280', '#84cc16',
];

export function CaixaCategorias() {
  const { data: categorias = [] } = useCaixaCategorias();
  const createCategoria = useCreateCaixaCategoria();
  const deleteCategoria = useDeleteCaixaCategoria();

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'entrada' | 'saida' | 'ambos'>('saida');
  const [cor, setCor] = useState(CORES_SUGERIDAS[0]);

  const handleAdd = async () => {
    if (!nome.trim()) return;
    await createCategoria.mutateAsync({ nome: nome.trim(), tipo, cor });
    setNome('');
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Tag className="w-4 h-4 text-primary" />
          Categorias do Caixa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form */}
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Nome da categoria"
            value={nome}
            onChange={e => setNome(e.target.value)}
            className="flex-1 min-w-[140px] h-9"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <Select value={tipo} onValueChange={v => setTipo(v as typeof tipo)}>
            <SelectTrigger className="w-28 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saída</SelectItem>
              <SelectItem value="ambos">Ambos</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            {CORES_SUGERIDAS.slice(0, 5).map(c => (
              <button
                key={c}
                type="button"
                className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${cor === c ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
                onClick={() => setCor(c)}
              />
            ))}
          </div>
          <Button
            size="sm"
            className="h-9 gap-1.5"
            onClick={handleAdd}
            disabled={!nome.trim() || createCategoria.isPending}
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </Button>
        </div>

        {/* List */}
        {categorias.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma categoria criada
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categorias.map(cat => (
              <div key={cat.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-muted/20 group">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.cor }} />
                <span className="text-sm">{cat.nome}</span>
                <Badge variant="outline" className="text-xs px-1 py-0 h-4 ml-1">
                  {cat.tipo}
                </Badge>
                <button
                  className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => deleteCategoria.mutate(cat.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
