import { useState, useEffect } from 'react';
import { Pen, Save, X, Link2, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Script, ScriptPlatform, ScriptStatus } from '@/types/database';

const MAX_WORDS = 5200;

const platforms: { value: ScriptPlatform; label: string }[] = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'youtube_shorts', label: 'YouTube Shorts' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'tiktok_ads', label: 'TikTok Ads' },
  { value: 'instagram_reels', label: 'Reels' },
  { value: 'instagram_post', label: 'Post' },
  { value: 'instagram_boost', label: 'Boost' },
  { value: 'facebook_ads', label: 'Facebook Ads' },
];

const statuses: { value: ScriptStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Rascunho', color: 'bg-muted text-muted-foreground' },
  { value: 'scheduled', label: 'Agendado', color: 'bg-status-scheduled/20 text-status-scheduled' },
  { value: 'published', label: 'Publicado', color: 'bg-status-published/20 text-status-published' },
];

interface ScriptEditorProps {
  script?: Script | null;
  onSave: () => void;
  onCancel: () => void;
}

export function ScriptEditor({ script, onSave, onCancel }: ScriptEditorProps) {
  const { user } = useAuthContext();
  const { projectCategories, addScript, updateScript } = useAppStore();
  
  const [title, setTitle] = useState(script?.title || '');
  const [content, setContent] = useState(script?.content || '');
  const [platform, setPlatform] = useState<ScriptPlatform>(script?.platform || 'youtube');
  const [status, setStatus] = useState<ScriptStatus>(script?.status || 'draft');
  const [scheduledDate, setScheduledDate] = useState(script?.scheduled_date || new Date().toISOString().split('T')[0]);
  const [projectId, setProjectId] = useState<string | null>(script?.project_id || null);
  const [isSaving, setIsSaving] = useState(false);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const wordPercentage = Math.min((wordCount / MAX_WORDS) * 100, 100);
  const isOverLimit = wordCount > MAX_WORDS;

  const handleSave = async () => {
    if (!user || !title.trim()) {
      toast.error('Preencha o título do roteiro');
      return;
    }

    if (isOverLimit) {
      toast.error(`O roteiro excede o limite de ${MAX_WORDS} palavras`);
      return;
    }

    setIsSaving(true);

    try {
      const scriptData = {
        title: title.trim(),
        content,
        platform,
        status,
        scheduled_date: scheduledDate,
        project_id: projectId,
      };

      if (script) {
        const { error } = await supabase
          .from('scripts')
          .update(scriptData)
          .eq('id', script.id);

        if (error) throw error;
        updateScript(script.id, { ...scriptData, updated_at: new Date().toISOString() });
        toast.success('Roteiro atualizado!');
      } else {
        const { data, error } = await supabase
          .from('scripts')
          .insert({ ...scriptData, user_id: user.id })
          .select()
          .single();

        if (error) throw error;
        addScript(data as Script);
        toast.success('Roteiro criado!');
      }

      onSave();
    } catch (error) {
      console.error('Error saving script:', error);
      toast.error('Erro ao salvar roteiro');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Pen className="w-5 h-5 text-primary" />
            {script ? 'Editar Roteiro' : 'Novo Roteiro'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do roteiro"
            />
          </div>
          <div className="space-y-2">
            <Label>Data Agendada</Label>
            <Input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Plataforma</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as ScriptPlatform)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                {platforms.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ScriptStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                {statuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <Badge className={s.color}>{s.label}</Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              {projectId ? <Link2 className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
              Projeto
            </Label>
            <Select value={projectId || 'none'} onValueChange={(v) => setProjectId(v === 'none' ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sem projeto" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem value="none">Sem projeto</SelectItem>
                {projectCategories.map((pc) => (
                  <SelectItem key={pc.id} value={pc.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: pc.color }}
                      />
                      {pc.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Conteúdo</Label>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                {wordCount.toLocaleString()} / {MAX_WORDS.toLocaleString()} palavras
              </span>
            </div>
          </div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva seu roteiro aqui..."
            className="min-h-[300px] resize-y"
          />
          <Progress 
            value={wordPercentage} 
            className={`h-1.5 ${isOverLimit ? '[&>div]:bg-destructive' : ''}`}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
