import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BriefingResponseBlock1 } from "@/types/briefing";

interface BriefingBlock1Props {
  data: Partial<BriefingResponseBlock1>;
  onChange: (data: Partial<BriefingResponseBlock1>) => void;
  readOnly?: boolean;
}

export const BriefingBlock1 = ({ data, onChange, readOnly = false }: BriefingBlock1Props) => {
  const handleChange = (field: keyof BriefingResponseBlock1, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Nome do Cliente / Empresa</Label>
          <Input 
            value={data.client_name || ""} 
            onChange={(e) => handleChange('client_name', e.target.value)}
            disabled={readOnly}
            placeholder="Ex: Agência XYZ"
          />
        </div>
        <div className="space-y-2">
          <Label>Tom de Voz da Marca</Label>
          <Input 
            value={data.brand_voice || ""} 
            onChange={(e) => handleChange('brand_voice', e.target.value)}
            disabled={readOnly}
            placeholder="Ex: Profissional, Amigável, Descontraído"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Objetivo Principal do Projeto</Label>
        <Textarea 
          value={data.project_objective || ""} 
          onChange={(e) => handleChange('project_objective', e.target.value)}
          disabled={readOnly}
          placeholder="O que este projeto pretende alcançar?"
          className="min-h-[100px]"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Público-Alvo</Label>
          <Input 
            value={data.target_audience || ""} 
            onChange={(e) => handleChange('target_audience', e.target.value)}
            disabled={readOnly}
            placeholder="Ex: Empreendedores de 25-40 anos"
          />
        </div>
        <div className="space-y-2">
          <Label>Principais Concorrentes</Label>
          <Input 
            value={data.main_competitors || ""} 
            onChange={(e) => handleChange('main_competitors', e.target.value)}
            disabled={readOnly}
            placeholder="Ex: Empresa A, Empresa B"
          />
        </div>
      </div>
    </div>
  );
};
