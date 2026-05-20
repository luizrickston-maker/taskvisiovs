import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { EditingDetails } from "@/types/briefing";

interface BriefingEditingBlockProps {
  data: EditingDetails;
  onChange: (data: EditingDetails) => void;
}

export function BriefingEditingBlock({ data, onChange }: BriefingEditingBlockProps) {
  const updateField = (field: keyof EditingDetails, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const toggleTransition = (transition: string) => {
    const current = data.transitions || [];
    if (current.includes(transition)) {
      updateField('transitions', current.filter(t => t !== transition));
    } else {
      updateField('transitions', [...current, transition]);
    }
  };

  return (
    <div className="space-y-6 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Estilo Visual / Mood</Label>
          <Input 
            placeholder="Ex: Documentário, Vlog Dinâmico, Clean" 
            value={data.video_style || ''}
            onChange={e => updateField('video_style', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Ritmo da Edição</Label>
          <Select 
            value={data.pacing || 'medium'} 
            onValueChange={v => updateField('pacing', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o ritmo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="slow">Lento / Suave</SelectItem>
              <SelectItem value="medium">Moderado / Comercial</SelectItem>
              <SelectItem value="fast">Rápido / Viral</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Referência de Trilha / Áudio</Label>
          <Input 
            placeholder="Ex: Upbeat Pop, Corporate Soft" 
            value={data.music_preference || ''}
            onChange={e => updateField('music_preference', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Color Grading (Cores)</Label>
          <Input 
            placeholder="Ex: Cores saturadas, P&B, Teal & Orange" 
            value={data.color_grading || ''}
            onChange={e => updateField('color_grading', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Transições Desejadas</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {['Corte Seco', 'Fade', 'Zoom', 'Glitch', 'Whip Pan', 'Dissolve', 'Masking'].map(t => (
            <div key={t} className="flex items-center space-x-2">
              <Checkbox 
                id={`bt-${t}`} 
                checked={(data.transitions || []).includes(t)}
                onCheckedChange={() => toggleTransition(t)}
              />
              <Label htmlFor={`bt-${t}`} className="text-sm font-normal cursor-pointer">{t}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox 
          id="b-captions" 
          checked={data.captions ?? true}
          onCheckedChange={v => updateField('captions', v)}
        />
        <Label htmlFor="b-captions" className="cursor-pointer">Legendas Dinâmicas (Estilo TikTok/Reels)</Label>
      </div>

      <div className="space-y-2">
        <Label>Instruções Adicionais para o Editor</Label>
        <Textarea 
          placeholder="Descreva detalhes específicos de cortes, efeitos, ou elementos que NÃO devem ser usados." 
          value={data.special_instructions || ''}
          onChange={e => updateField('special_instructions', e.target.value)}
          rows={4}
        />
      </div>
    </div>
  );
}