import { useState } from 'react';
import { Plus, Pen, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScriptEditor } from '@/components/roteiros/ScriptEditor';
import { ScriptList } from '@/components/roteiros/ScriptList';
import { useAppStore } from '@/stores/useAppStore';
import type { Script, ScriptPlatform, ScriptStatus } from '@/types/database';

export default function RoteirosDashboard() {
  const { scripts } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleNewScript = () => {
    setEditingScript(null);
    setIsEditing(true);
  };

  const handleEditScript = (script: Script) => {
    setEditingScript(script);
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
    setEditingScript(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingScript(null);
  };

  // Stats
  const totalScripts = scripts.length;
  const draftCount = scripts.filter(s => s.status === 'draft').length;
  const scheduledCount = scripts.filter(s => s.status === 'scheduled').length;
  const publishedCount = scripts.filter(s => s.status === 'published').length;

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Pen className="w-6 h-6 text-primary" />
            Roteiros
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Editor de roteiros para múltiplas plataformas
          </p>
        </div>
        {!isEditing && (
          <Button onClick={handleNewScript}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Roteiro
          </Button>
        )}
      </div>

      {/* Stats */}
      {!isEditing && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{totalScripts}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{draftCount}</p>
              <p className="text-xs text-muted-foreground">Rascunhos</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{scheduledCount}</p>
              <p className="text-xs text-muted-foreground">Agendados</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{publishedCount}</p>
              <p className="text-xs text-muted-foreground">Publicados</p>
            </CardContent>
          </Card>
        </div>
      )}

      {isEditing ? (
        <ScriptEditor
          script={editingScript}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      ) : (
        <Card className="glass-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="text-lg">Meus Roteiros</CardTitle>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger className="w-[130px] h-8">
                    <SelectValue placeholder="Plataforma" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="youtube_shorts">Shorts</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="instagram_reels">Reels</SelectItem>
                    <SelectItem value="instagram_post">Post</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="scheduled">Agendado</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScriptList onEdit={handleEditScript} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
