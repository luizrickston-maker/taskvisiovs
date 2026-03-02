import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Trash2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { Node, Edge } from '@xyflow/react';
import type { ProcessNodeData } from './ProcessNode';

interface PropertiesPanelProps {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  onClose: () => void;
  onUpdateNode: (id: string, data: Partial<ProcessNodeData>) => void;
  onUpdateEdge: (id: string, data: { label?: string; connection_type?: string; animated?: boolean }) => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
}

const colorOptions = [
  { value: 'emerald', label: 'Verde' },
  { value: 'blue', label: 'Azul' },
  { value: 'amber', label: 'Âmbar' },
  { value: 'red', label: 'Vermelho' },
  { value: 'purple', label: 'Roxo' },
  { value: 'pink', label: 'Rosa' },
  { value: 'cyan', label: 'Ciano' },
  { value: 'slate', label: 'Cinza' },
];

const nodeTypeOptions = [
  { value: 'start', label: 'Início' },
  { value: 'task', label: 'Tarefa' },
  { value: 'decision', label: 'Decisão' },
  { value: 'milestone', label: 'Marco' },
  { value: 'end', label: 'Fim' },
];

export function PropertiesPanel({
  selectedNode,
  selectedEdge,
  onClose,
  onUpdateNode,
  onUpdateEdge,
  onDeleteNode,
  onDeleteEdge,
}: PropertiesPanelProps) {
  const isOpen = !!selectedNode || !!selectedEdge;

  if (!isOpen) return null;

  const nodeData = selectedNode?.data as unknown as ProcessNodeData | undefined;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[340px] sm:w-[380px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>{selectedNode ? 'Propriedades da Etapa' : 'Propriedades da Conexão'}</SheetTitle>
          </div>
        </SheetHeader>

        {selectedNode && nodeData && (
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={nodeData.title || ''}
                onChange={(e) => onUpdateNode(selectedNode.id, { title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={nodeData.description || ''}
                onChange={(e) => onUpdateNode(selectedNode.id, { description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Nó</Label>
              <Select
                value={nodeData.node_type || 'task'}
                onValueChange={(v) => onUpdateNode(selectedNode.id, { node_type: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {nodeTypeOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <Select
                value={nodeData.color_scheme || 'blue'}
                onValueChange={(v) => onUpdateNode(selectedNode.id, { color_scheme: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {colorOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tempo Estimado</Label>
              <Input
                placeholder="Ex: 30min, 2h"
                value={nodeData.estimated_time || ''}
                onChange={(e) => onUpdateNode(selectedNode.id, { estimated_time: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Responsável</Label>
              <Input
                placeholder="Ex: Gerente, Analista"
                value={nodeData.responsible_role || ''}
                onChange={(e) => onUpdateNode(selectedNode.id, { responsible_role: e.target.value })}
              />
            </div>

            <Button
              variant="destructive"
              size="sm"
              className="w-full mt-4 gap-2"
              onClick={() => {
                onDeleteNode(selectedNode.id);
                onClose();
              }}
            >
              <Trash2 className="w-4 h-4" /> Excluir Etapa
            </Button>
          </div>
        )}

        {selectedEdge && (
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label>Rótulo</Label>
              <Input
                placeholder="Ex: Sim, Não, Próximo"
                value={(selectedEdge.data as any)?.label || selectedEdge.label || ''}
                onChange={(e) => onUpdateEdge(selectedEdge.id, { label: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Conexão</Label>
              <Select
                value={(selectedEdge.data as any)?.connection_type || 'smoothstep'}
                onValueChange={(v) => onUpdateEdge(selectedEdge.id, { connection_type: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="smoothstep">Curva Suave</SelectItem>
                  <SelectItem value="straight">Reta</SelectItem>
                  <SelectItem value="bezier">Bezier</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Animada</Label>
              <Switch
                checked={(selectedEdge.data as any)?.animated ?? false}
                onCheckedChange={(v) => onUpdateEdge(selectedEdge.id, { animated: v })}
              />
            </div>

            <Button
              variant="destructive"
              size="sm"
              className="w-full mt-4 gap-2"
              onClick={() => {
                onDeleteEdge(selectedEdge.id);
                onClose();
              }}
            >
              <Trash2 className="w-4 h-4" /> Excluir Conexão
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
