import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BriefingResponseBlock2 } from "@/types/briefing";

interface BriefingBlock2Props {
  data: Partial<BriefingResponseBlock2>;
  onChange: (data: Partial<BriefingResponseBlock2>) => void;
  readOnly?: boolean;
}

export const BriefingBlock2 = ({ data, onChange, readOnly = false }: BriefingBlock2Props) => {
  const handleChange = (field: keyof BriefingResponseBlock2, value: string | number) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label>Duração Estimada do Vídeo</Label>
          <Input 
            value={data.video_duration || ""} 
            onChange={(e) => handleChange('video_duration', e.target.value)}
            disabled={readOnly}
            placeholder="Ex: 60 segundos"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Proporção (Aspect Ratio)</Label>
          <Select 
            value={data.aspect_ratio || "9:16"} 
            onValueChange={(val) => handleChange('aspect_ratio', val)}
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="9:16">9:16 (Vertical/Reels)</SelectItem>
              <SelectItem value="16:9">16:9 (Horizontal/YouTube)</SelectItem>
              <SelectItem value="1:1">1:1 (Quadrado/Feed)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Resolução</Label>
          <Select 
            value={data.resolution || "1080p"} 
            onValueChange={(val) => handleChange('resolution', val)}
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1080p">Full HD (1080p)</SelectItem>
              <SelectItem value="4k">4K</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Formato de Arquivo Desejado</Label>
          <Input 
            value={data.file_format || ""} 
            onChange={(e) => handleChange('file_format', e.target.value)}
            disabled={readOnly}
            placeholder="Ex: MP4, MOV"
          />
        </div>
        <div className="space-y-2">
          <Label>Quantidade de Entregáveis</Label>
          <Input 
            type="number"
            value={data.deliverables_count || ""} 
            onChange={(e) => handleChange('deliverables_count', parseInt(e.target.value))}
            disabled={readOnly}
            placeholder="Ex: 5"
          />
        </div>
      </div>
    </div>
  );
};
