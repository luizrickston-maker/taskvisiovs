import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { BriefingResponseBlock5 } from "@/types/briefing";

interface BriefingBlock5Props {
  data: Partial<BriefingResponseBlock5>;
  onChange: (data: Partial<BriefingResponseBlock5>) => void;
  readOnly?: boolean;
}

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'facebook', label: 'Facebook' },
];

export const BriefingBlock5 = ({ data, onChange, readOnly = false }: BriefingBlock5Props) => {
  const handleChange = (field: keyof BriefingResponseBlock5, value: string | string[] | boolean) => {
    onChange({ ...data, [field]: value });
  };

  const togglePlatform = (platformId: string) => {
    const currentPlatforms = data.platforms || [];
    const newPlatforms = currentPlatforms.includes(platformId)
      ? currentPlatforms.filter(p => p !== platformId)
      : [...currentPlatforms, platformId];
    handleChange('platforms', newPlatforms);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Canais de Distribuição</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {PLATFORMS.map((platform) => (
            <div key={platform.id} className="flex items-center space-x-2">
              <Checkbox 
                id={`platform-${platform.id}`} 
                checked={data.platforms?.includes(platform.id) || false}
                onCheckedChange={() => togglePlatform(platform.id)}
                disabled={readOnly}
              />
              <Label htmlFor={`platform-${platform.id}`} className="text-sm font-normal cursor-pointer">
                {platform.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Cronograma de Postagens</Label>
          <Input 
            value={data.posting_schedule || ""} 
            onChange={(e) => handleChange('posting_schedule', e.target.value)}
            disabled={readOnly}
            placeholder="Ex: 3x por semana, às 18h"
          />
        </div>
        <div className="space-y-2">
          <Label>Chamada para Ação (CTA)</Label>
          <Input 
            value={data.cta_text || ""} 
            onChange={(e) => handleChange('cta_text', e.target.value)}
            disabled={readOnly}
            placeholder="Ex: Clique no link da bio, Comente 'EU QUERO'"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch 
          id="paid-media" 
          checked={data.paid_media_usage || false} 
          onCheckedChange={(val) => handleChange('paid_media_usage', val)}
          disabled={readOnly}
        />
        <Label htmlFor="paid-media">Haverá uso de tráfego pago (Ads)?</Label>
      </div>
    </div>
  );
};
