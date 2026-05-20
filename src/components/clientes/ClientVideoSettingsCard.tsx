import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Video, Settings2, Save } from 'lucide-react';
import { EditingDetails } from '@/types/briefing';

interface ClientVideoSettingsCardProps {
  client: {
    id: string;
    video_management_enabled: boolean | null;
    default_editing_profile: any;
  };
}

export function ClientVideoSettingsCard({ client }: ClientVideoSettingsCardProps) {
  const queryClient = useQueryClient();
  const [isEnabled, setIsEnabled] = useState(client.video_management_enabled ?? false);
  const [profile, setProfile] = useState<EditingDetails>((client.default_editing_profile as EditingDetails) || {
    video_style: '',
    music_preference: '',
    pacing: 'medium',
    color_grading: '',
    transitions: [],
    captions: true,
    graphics_elements: [],
    special_instructions: '',
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: { video_management_enabled: boolean; default_editing_profile: EditingDetails }) => {
      const { error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', client.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', client.id] });
      toast.success('Configurações de vídeo atualizadas!');
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar: ' + error.message);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      video_management_enabled: isEnabled,
      default_editing_profile: profile,
    });
  };

  const updateProfile = (field: keyof EditingDetails, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const toggleTransition = (transition: string) => {
    const current = profile.transitions || [];
    if (current.includes(transition)) {
      updateProfile('transitions', current.filter(t => t !== transition));
    } else {
      updateProfile('transitions', [...current, transition]);
    }
  };

  return (
    <Card className="border-primary/20 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
      <CardHeader className="bg-primary/5 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Video className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Gestão de Vídeo</CardTitle>
              <CardDescription>Configure o perfil padrão de edição para este cliente.</CardDescription>
            </div>
          </div>
          <Switch 
            checked={isEnabled} 
            onCheckedChange={setIsEnabled}
          />
        </div>
      </CardHeader>
      
      {isEnabled && (
        <CardContent className="pt-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estilo de Vídeo</Label>
              <Input 
                placeholder="Ex: Minimalista, Dinâmico, Corporativo" 
                value={profile.video_style || ''}
                onChange={e => updateProfile('video_style', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Ritmo (Pacing)</Label>
              <Select 
                value={profile.pacing || 'medium'} 
                onValueChange={v => updateProfile('pacing', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ritmo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slow">Lento / Contemplativo</SelectItem>
                  <SelectItem value="medium">Moderado / Padrão</SelectItem>
                  <SelectItem value="fast">Rápido / Frenético</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preferência de Trilha Sonora</Label>
            <Input 
              placeholder="Ex: Lo-fi, Upbeat, Motivacional" 
              value={profile.music_preference || ''}
              onChange={e => updateProfile('music_preference', e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label>Transições Preferidas</Label>
            <div className="grid grid-cols-2 gap-2">
              {['Corte Seco', 'Fade', 'Zoom', 'Glitch', 'Whip Pan', 'Dissolve'].map(t => (
                <div key={t} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`t-${t}`} 
                    checked={(profile.transitions || []).includes(t)}
                    onCheckedChange={() => toggleTransition(t)}
                  />
                  <Label htmlFor={`t-${t}`} className="text-sm font-normal cursor-pointer">{t}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2 py-2">
            <Switch 
              id="captions" 
              checked={profile.captions ?? true}
              onCheckedChange={v => updateProfile('captions', v)}
            />
            <Label htmlFor="captions">Incluir Legendas Dinâmicas</Label>
          </div>

          <div className="space-y-2">
            <Label>Instruções Especiais de Edição</Label>
            <Input 
              placeholder="Ex: Usar sempre a fonte Montserrat, evitar cor vermelha..." 
              value={profile.special_instructions || ''}
              onChange={e => updateProfile('special_instructions', e.target.value)}
            />
          </div>

          <Button 
            className="w-full gap-2" 
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            <Save className="w-4 h-4" />
            Salvar Perfil de Edição
          </Button>
        </CardContent>
      )}
      
      {!isEnabled && (
        <CardContent className="pt-6 flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Settings2 className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-sm">Ative a Gestão de Vídeo para configurar o perfil.</p>
        </CardContent>
      )}
    </Card>
  );
}