import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { BriefingResponseBlock4 } from "@/types/briefing";

interface BriefingBlock4Props {
  data: Partial<BriefingResponseBlock4>;
  onChange: (data: Partial<BriefingResponseBlock4>) => void;
  readOnly?: boolean;
}

export const BriefingBlock4 = ({ data, onChange, readOnly = false }: BriefingBlock4Props) => {
  const handleChange = (field: keyof BriefingResponseBlock4, value: string | string[] | boolean) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Links de Referência (um por linha)</Label>
        <Textarea 
          value={data.reference_links?.join('\n') || ""} 
          onChange={(e) => handleChange('reference_links', e.target.value.split('\n'))}
          disabled={readOnly}
          placeholder="Cole aqui links de vídeos ou designs que você gosta..."
          className="min-h-[100px]"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Preferências de Tipografia</Label>
          <Input 
            value={data.font_preferences || ""} 
            onChange={(e) => handleChange('font_preferences', e.target.value)}
            disabled={readOnly}
            placeholder="Ex: Montserrat, Serifadas, etc."
          />
        </div>
        <div className="space-y-2">
          <Label>Link para Assets da Marca (Logo, Fontes, etc)</Label>
          <Input 
            value={data.brand_assets_link || ""} 
            onChange={(e) => handleChange('brand_assets_link', e.target.value)}
            disabled={readOnly}
            placeholder="Ex: Link do Google Drive ou Dropbox"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch 
          id="assets-provided" 
          checked={data.assets_provided || false} 
          onCheckedChange={(val) => handleChange('assets_provided', val)}
          disabled={readOnly}
        />
        <Label htmlFor="assets-provided">Todos os assets necessários foram fornecidos?</Label>
      </div>
    </div>
  );
};
