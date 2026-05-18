import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BriefingResponseBlock6 } from "@/types/briefing";

interface BriefingBlock6Props {
  data: Partial<BriefingResponseBlock6>;
  onChange: (data: Partial<BriefingResponseBlock6>) => void;
  readOnly?: boolean;
}

export const BriefingBlock6 = ({ data, onChange, readOnly = false }: BriefingBlock6Props) => {
  const handleChange = (field: keyof BriefingResponseBlock6, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Prazo para o Primeiro Corte</Label>
          <Input 
            type="date"
            value={data.deadline_first_cut || ""} 
            onChange={(e) => handleChange('deadline_first_cut', e.target.value)}
            disabled={readOnly}
          />
        </div>
        <div className="space-y-2">
          <Label>Prazo Final para Entrega</Label>
          <Input 
            type="date"
            value={data.final_deadline || ""} 
            onChange={(e) => handleChange('final_deadline', e.target.value)}
            disabled={readOnly}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Estimativa de Orçamento / Verba</Label>
        <Input 
          value={data.budget_range || ""} 
          onChange={(e) => handleChange('budget_range', e.target.value)}
          disabled={readOnly}
          placeholder="Ex: R$ 2.000,00 - R$ 5.000,00"
        />
      </div>

      <div className="space-y-2">
        <Label>Notas Adicionais / Observações</Label>
        <Textarea 
          value={data.additional_notes || ""} 
          onChange={(e) => handleChange('additional_notes', e.target.value)}
          disabled={readOnly}
          placeholder="Alguma informação extra que não foi coberta?"
          className="min-h-[100px]"
        />
      </div>
    </div>
  );
};
