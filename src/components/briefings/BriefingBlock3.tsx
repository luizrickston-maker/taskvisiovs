import { BriefingVideoItem } from "@/types/briefing";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";

interface BriefingBlock3Props {
  items: Partial<BriefingVideoItem>[];
  onChange: (items: Partial<BriefingVideoItem>[]) => void;
  readOnly?: boolean;
}

export const BriefingBlock3 = ({ items, onChange, readOnly = false }: BriefingBlock3Props) => {
  const addRow = () => {
    onChange([...items, { 
      theme: "", 
      format: "Reel", 
      priority: "Normal",
      recording_date: null
    }]);
  };

  const removeRow = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const updateItem = (index: number, field: keyof BriefingVideoItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Tema / Ideia Principal</TableHead>
              <TableHead className="w-[150px]">Formato</TableHead>
              {!readOnly && <TableHead className="w-[150px]">Gravação</TableHead>}
              <TableHead className="w-[120px]">Prioridade</TableHead>
              {!readOnly && <TableHead className="w-[50px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={index} className="hover:bg-muted/20">
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>
                  {readOnly ? (
                    <span className="text-sm">{item.theme || "-"}</span>
                  ) : (
                    <Input 
                      value={item.theme || ""} 
                      onChange={(e) => updateItem(index, 'theme', e.target.value)}
                      placeholder="Ex: Depoimento de Cliente"
                      className="h-8"
                    />
                  )}
                </TableCell>
                <TableCell>
                  {readOnly ? (
                    <span className="text-sm">{item.format || "-"}</span>
                  ) : (
                    <Select 
                      value={item.format || "Reel"} 
                      onValueChange={(val) => updateItem(index, 'format', val)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Reel">Reel</SelectItem>
                        <SelectItem value="Talk">Talk</SelectItem>
                        <SelectItem value="Shorts">Shorts</SelectItem>
                        <SelectItem value="Feed">Feed</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                {!readOnly && (
                  <TableCell>
                    <Input 
                      type="date" 
                      value={item.recording_date || ""} 
                      onChange={(e) => updateItem(index, 'recording_date', e.target.value)}
                      className="h-8"
                    />
                  </TableCell>
                )}
                <TableCell>
                  {readOnly ? (
                    <span className={item.priority === 'Urgente' ? "text-red-600 font-semibold text-xs" : "text-sm"}>
                      {item.priority || "Normal"}
                    </span>
                  ) : (
                    <Select 
                      value={item.priority || "Normal"} 
                      onValueChange={(val) => updateItem(index, 'priority', val)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="Urgente">Urgente</SelectItem>
                        <SelectItem value="Baixa">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                {!readOnly && (
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeRow(index)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={readOnly ? 4 : 6} className="h-24 text-center text-muted-foreground">
                  Nenhum item de vídeo adicionado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {!readOnly && (
        <Button 
          variant="outline" 
          className="w-full border-dashed border-2 py-6 hover:bg-primary/5 hover:border-primary/50 transition-all" 
          onClick={addRow}
        >
          <Plus className="w-4 h-4 mr-2" /> Adicionar Vídeo ao Planejamento
        </Button>
      )}
    </div>
  );
};
