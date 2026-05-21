import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save, Sparkles, Music, Type, Palette, Layout, FolderOpen, FileEdit } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

interface ClientVideoSettingsProps {
  clientId: string;
}

export function ClientVideoSettings({ clientId }: ClientVideoSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('client_video_settings')
          .select('*')
          .eq('client_id', clientId)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setSettings(data);
          setEnabled(data.video_management_enabled ?? false);
        } else {
          // Default empty settings
          setSettings({
            default_music_style: "",
            default_typography: "",
            default_color_style: "",
            default_format: "9:16 (Reels)",
            default_cta: "",
            default_drive_folder_link: "",
            default_file_naming: "",
          });
        }
      } catch (err: any) {
        toast.error("Erro ao carregar configurações de vídeo: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (clientId) fetchSettings();
  }, [clientId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const { data: memberData } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', userData.user.id)
        .limit(1)
        .maybeSingle();

      if (!memberData) throw new Error("Workspace não encontrado");

      const payload = {
        ...settings,
        client_id: clientId,
        workspace_id: memberData.workspace_id,
        video_management_enabled: enabled,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('client_video_settings')
        .upsert(payload, { onConflict: 'client_id' });

      if (error) throw error;
      toast.success("Perfil de edição padrão atualizado!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [field]: value }));
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <Card className="border-primary/10 shadow-sm overflow-hidden">
      <CardHeader className="bg-primary/5 border-b border-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Perfil de Edição Padrão</CardTitle>
              <CardDescription>Automatize a criação de briefings com as preferências deste cliente.</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-background/50 px-3 py-1.5 rounded-full border border-primary/20">
            <Label htmlFor="video-toggle" className="text-xs font-bold uppercase cursor-pointer">Ativar Módulo</Label>
            <Switch id="video-toggle" checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-8 pt-8">
        {!enabled && (
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-amber-800 text-sm flex gap-3 animate-in fade-in slide-in-from-top-2">
            <Sparkles className="w-5 h-5 shrink-0" />
            <p>O módulo de gestão de vídeo está <strong>desativado</strong> para este cliente. Ative acima para configurar o perfil padrão.</p>
          </div>
        )}

        <div className={enabled ? "opacity-100 transition-opacity" : "opacity-40 pointer-events-none transition-opacity"}>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Music className="w-4 h-4 text-muted-foreground" /> Estilo Musical</Label>
              <Input 
                placeholder="Ex: Upbeat, Lofi, Corporativo" 
                value={settings.default_music_style || ""} 
                onChange={e => updateField('default_music_style', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Type className="w-4 h-4 text-muted-foreground" /> Tipografia</Label>
              <Input 
                placeholder="Ex: Montserrat Bold" 
                value={settings.default_typography || ""} 
                onChange={e => updateField('default_typography', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Palette className="w-4 h-4 text-muted-foreground" /> Identidade Visual</Label>
              <Input 
                placeholder="Ex: Cores quentes, Saturado" 
                value={settings.default_color_style || ""} 
                onChange={e => updateField('default_color_style', e.target.value)}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mt-8">
            <div className="space-y-4">
              <Label className="flex items-center gap-2 text-primary font-bold"><Layout className="w-4 h-4" /> Formato de Entrega Padrão</Label>
              <div className="grid grid-cols-2 gap-3 bg-muted/30 p-4 rounded-xl border">
                {['9:16 (Reels)', '16:9 (YouTube)', '1:1 (Feed)', '4:5 (Instagram)'].map(format => (
                  <div key={format} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`format-${format}`} 
                      checked={settings.default_format === format}
                      onCheckedChange={(checked) => {
                        if (checked) updateField('default_format', format);
                      }}
                    />
                    <Label htmlFor={`format-${format}`} className="text-sm cursor-pointer font-normal">{format}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Label className="flex items-center gap-2 text-primary font-bold"><FileEdit className="w-4 h-4" /> Chamada para Ação (CTA)</Label>
              <Textarea 
                placeholder="Ex: Clique no link da Bio e garanta sua vaga!" 
                className="min-h-[100px]"
                value={settings.default_cta || ""}
                onChange={e => updateField('default_cta', e.target.value)}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><FolderOpen className="w-4 h-4 text-muted-foreground" /> Link Pasta Raiz</Label>
              <Input 
                placeholder="Link do Drive, Dropbox, etc." 
                value={settings.default_drive_folder_link || ""} 
                onChange={e => updateField('default_drive_folder_link', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><FileEdit className="w-4 h-4 text-muted-foreground" /> Padrão Nomenclatura</Label>
              <Input 
                placeholder="Ex: [DATA]_[CLIENTE]_[TEMA]" 
                value={settings.default_file_naming || ""} 
                onChange={e => updateField('default_file_naming', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gradient-primary glow-primary px-8 font-bold">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Perfil Padrão
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
