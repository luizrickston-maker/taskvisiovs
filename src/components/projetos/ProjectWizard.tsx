import { useState, useEffect, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import {
  ArrowLeft, ArrowRight, Check, Layers, Hash, Pencil, Plus, Trash2, Sparkles, FolderKanban,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { STAGE_TEMPLATES, STAGE_TEMPLATE_LIST, suggestTemplateByCategoryName } from '@/lib/stageTemplates';
import type { Project, ProjectStage, ProjectTask, ProjectStageStatus, ProjectTaskStatus, ProjectCategory, StageTemplateId } from '@/types/database';

interface ProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editProject?: Project | null;
}

interface WizardStage {
  id: string; // local id (pode não existir ainda no banco)
  name: string;
  icon: string;
  sla_days: number | null;
}

const db = supabase as unknown as {
  from: (table: string) => any;
  auth: typeof supabase.auth;
  rpc: typeof supabase.rpc;
};

export default function ProjectWizard({ open, onOpenChange, editProject }: ProjectWizardProps) {
  const { projectCategories, addProject, updateProject, addProjectStages, corporateTeam } = useAppStore();

  const [step, setStep] = useState(1);

  // Passo 1
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [priority, setPriority] = useState('3');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [deadline, setDeadline] = useState('');
  const [assignedTo, setAssignedTo] = useState('none');
  const [templateId, setTemplateId] = useState<StageTemplateId | ''>('');

  // Passo 2
  const [stages, setStages] = useState<WizardStage[]>([]);

  const [loading, setLoading] = useState(false);

  // Reset / carregar quando abre
  useEffect(() => {
    if (!open) return;
    if (editProject) {
      setProjectName(editProject.project || '');
      setClientName(editProject.client_name || '');
      setCategoryId(editProject.project_category_id || '');
      setPriority(String(editProject.priority || 3));
      setEstimatedTime(editProject.estimated_time || '');
      setDeadline(editProject.deadline || '');
      setAssignedTo(editProject.assigned_to || 'none');
      setTemplateId('');
      setStages([]);
    } else {
      resetAll();
    }
    setStep(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editProject, open]);

  const resetAll = () => {
    setProjectName('');
    setClientName('');
    setCategoryId('');
    setPriority('3');
    setEstimatedTime('');
    setDeadline('');
    setAssignedTo('none');
    setTemplateId('');
    setStages([]);
  };

  // Sugerir template quando categoria muda
  useEffect(() => {
    if (editProject) return; // não sobrescrever no modo edição
    if (!categoryId || stages.length > 0) return;
    const cat = projectCategories.find(c => c.id === categoryId);
    if (cat?.default_stage_template && STAGE_TEMPLATES[cat.default_stage_template as StageTemplateId]) {
      applyTemplate(cat.default_stage_template as StageTemplateId);
    } else {
      const suggested = suggestTemplateByCategoryName(cat?.name);
      if (suggested) applyTemplate(suggested);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const applyTemplate = (tplId: StageTemplateId) => {
    const tpl = STAGE_TEMPLATES[tplId];
    setTemplateId(tplId);
    setStages(tpl.stages.map((s, idx) => ({
      id: `new-${idx}-${Date.now()}`,
      name: s.name,
      icon: s.icon,
      sla_days: s.sla_days,
    })));
  };

  const moveStage = (idx: number, dir: -1 | 1) => {
    setStages(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const updateStage = (idx: number, patch: Partial<WizardStage>) => {
    setStages(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  };

  const removeStage = (idx: number) => {
    setStages(prev => prev.filter((_, i) => i !== idx));
  };

  const addBlankStage = () => {
    setStages(prev => [...prev, {
      id: `new-${prev.length}-${Date.now()}`,
      name: `Etapa ${prev.length + 1}`,
      icon: 'Layers',
      sla_days: null,
    }]);
  };

  const canStep1 = projectName.trim().length > 0;
  const canStep2 = stages.length > 0 && stages.every(s => s.name.trim().length > 0);

  const handleSubmit = async () => {
    if (!canStep1 || !canStep2) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Buscar workspace
    const { data: workspaceId, error: wsError } = await supabase.rpc('get_my_workspace_id');
    if (wsError || !workspaceId) {
      toast.error('Não foi possível identificar seu workspace.');
      setLoading(false);
      return;
    }

    if (editProject) {
      // Modo edição: apenas atualiza o projeto (não toca em etapas — gerenciado no detalhe)
      const projectData = {
        project: projectName.trim(),
        task: projectName.trim(),
        project_category_id: categoryId || null,
        priority: Number(priority),
        estimated_time: estimatedTime.trim() || null,
        deadline: deadline || null,
        assigned_to: assignedTo === 'none' ? null : assignedTo,
        client_name: clientName.trim() || null,
      };
      const { error } = await supabase.from('projects').update(projectData).eq('id', editProject.id);
      if (error) {
        toast.error('Erro ao atualizar projeto');
        setLoading(false);
        return;
      }
      updateProject(editProject.id, projectData);
      toast.success('Projeto atualizado');
      setLoading(false);
      onOpenChange(false);
      return;
    }

    // Criar projeto
    const projectPayload = {
      user_id: user.id,
      workspace_id: workspaceId,
      project: projectName.trim(),
      task: projectName.trim(),
      project_category_id: categoryId || null,
      priority: Number(priority),
      status: 'todo' as const,
      estimated_time: estimatedTime.trim() || null,
      deadline: deadline || null,
      assigned_to: assignedTo === 'none' ? null : assignedTo,
      client_name: clientName.trim() || null,
    };

    const { data: createdProject, error: projError } = await supabase
      .from('projects')
      .insert(projectPayload)
      .select()
      .single();

    if (projError || !createdProject) {
      toast.error('Erro ao criar projeto');
      setLoading(false);
      return;
    }

    addProject(createdProject as Project);

    // Criar etapas
    const stageRows = stages.map((s, idx) => ({
      user_id: user.id,
      workspace_id: workspaceId,
      project_id: createdProject.id,
      name: s.name.trim(),
      icon: s.icon,
      sla_days: s.sla_days,
      order_index: idx,
      status: 'todo' as ProjectStageStatus,
      template_id: templateId || null,
    }));

    const { data: createdStages, error: stageError } = await db
      .from('project_stages')
      .insert(stageRows)
      .select();

    if (stageError) {
      toast.error('Projeto criado, mas erro ao criar etapas');
      setLoading(false);
      onOpenChange(false);
      return;
    }

    if (createdStages) {
      addProjectStages(createdStages as ProjectStage[]);

      // Atualizar current_stage_id do projeto
      const firstStage = createdStages[0];
      if (firstStage) {
        await db.from('projects').update({ current_stage_id: firstStage.id }).eq('id', createdProject.id);
      }
    }

    toast.success(`Projeto criado com ${stages.length} etapas!`);
    setLoading(false);
    onOpenChange(false);
    resetAll();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editProject ? 'Editar projeto' : 'Novo projeto'}
          </DialogTitle>
          <Stepper currentStep={step} editMode={!!editProject} />
        </DialogHeader>

        {/* PASSO 1 — Informações básicas */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do projeto *</Label>
              <Input
                placeholder="Ex: Campanha Verão 2025"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input
                  placeholder="Nome do cliente"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoryId || 'none'} onValueChange={(v) => setCategoryId(v === 'none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {projectCategories.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">P1 · Crítica</SelectItem>
                    <SelectItem value="2">P2 · Alta</SelectItem>
                    <SelectItem value="3">P3 · Média</SelectItem>
                    <SelectItem value="4">P4 · Baixa</SelectItem>
                    <SelectItem value="5">P5 · Mínima</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tempo estimado</Label>
                <Input
                  placeholder="Ex: 2h"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Entrega (prazo)</Label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Atribuir a</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Apenas eu</SelectItem>
                  {corporateTeam.filter(m => m.is_active && m.member_user_id).map(m => (
                    <SelectItem key={m.member_user_id} value={m.member_user_id!}>
                      {m.name} ({m.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(2)} disabled={!canStep1} className="gap-1">
                Avançar
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* PASSO 2 — Etapas (templates) */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template de etapas</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {STAGE_TEMPLATE_LIST.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl.id)}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-all hover:border-primary/50",
                      templateId === tpl.id ? "border-primary bg-primary/5" : "border-border"
                    )}
                    type="button"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span className="font-medium text-sm">{tpl.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{tpl.description}</p>
                  </button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setTemplateId(''); setStages([]); }}
                className="text-xs text-muted-foreground"
              >
                Limpar e criar do zero
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  Etapas ({stages.length})
                </Label>
                <Button variant="outline" size="sm" onClick={addBlankStage} className="gap-1 h-7">
                  <Plus className="w-3 h-3" />
                  Etapa
                </Button>
              </div>

              {stages.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      Escolha um template acima ou adicione uma etapa manualmente
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-1.5">
                  {stages.map((stage, idx) => {
                    const Icon = (LucideIcons as any)[stage.icon] || Layers;
                    return (
                      <div key={stage.id} className="flex items-center gap-2 p-2 rounded-lg border bg-background">
                        <div className="flex flex-col">
                          <button onClick={() => moveStage(idx, -1)} disabled={idx === 0}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                            type="button"
                          >▲</button>
                          <button onClick={() => moveStage(idx, 1)} disabled={idx === stages.length - 1}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                            type="button"
                          >▼</button>
                        </div>
                        <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-xs text-muted-foreground font-mono w-6">{idx + 1}.</span>
                        <Input
                          value={stage.name}
                          onChange={(e) => updateStage(idx, { name: e.target.value })}
                          className="flex-1 h-8"
                          placeholder="Nome da etapa"
                        />
                        <Input
                          type="number"
                          min="0"
                          value={stage.sla_days || ''}
                          onChange={(e) => updateStage(idx, { sla_days: e.target.value ? Number(e.target.value) : null })}
                          className="w-20 h-8 text-xs"
                          placeholder="SLA dias"
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                          onClick={() => removeStage(idx)} type="button">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-1">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canStep2} className="gap-1">
                Avançar
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* PASSO 3 — Revisão */}
        {step === 3 && (
          <div className="space-y-4">
            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Projeto</p>
                  <p className="font-semibold text-lg">{projectName}</p>
                  {clientName && (
                    <p className="text-sm text-muted-foreground">Cliente: {clientName}</p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Categoria</p>
                    <p>{projectCategories.find(c => c.id === categoryId)?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Prioridade</p>
                    <Badge variant="outline">P{priority}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Prazo</p>
                    <p>{deadline || '—'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Etapas que serão criadas ({stages.length})
                  </p>
                  <div className="space-y-1">
                    {stages.map((s, idx) => {
                      const Icon = (LucideIcons as any)[s.icon] || Layers;
                      return (
                        <div key={s.id} className="flex items-center gap-2 text-sm py-1">
                          <Icon className="w-3.5 h-3.5 text-primary" />
                          <span className="font-mono text-xs text-muted-foreground w-6">{idx + 1}.</span>
                          <span>{s.name}</span>
                          {s.sla_days && (
                            <Badge variant="outline" className="text-[10px] ml-auto">
                              SLA {s.sla_days}d
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-1">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="gap-1">
                <Check className="w-4 h-4" />
                {loading ? 'Criando...' : editProject ? 'Salvar' : 'Criar projeto'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stepper({ currentStep, editMode }: { currentStep: number; editMode: boolean }) {
  const steps = editMode
    ? [{ num: 1, label: 'Informações' }]
    : [
        { num: 1, label: 'Informações' },
        { num: 2, label: 'Etapas' },
        { num: 3, label: 'Revisão' },
      ];

  return (
    <div className="flex items-center gap-2 pt-2">
      {steps.map((s, idx) => (
        <div key={s.num} className="flex items-center gap-2 flex-1">
          <div className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
            currentStep >= s.num ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            {currentStep > s.num ? <Check className="w-4 h-4" /> : s.num}
          </div>
          <span className={cn(
            "text-xs",
            currentStep === s.num ? "font-medium" : "text-muted-foreground"
          )}>
            {s.label}
          </span>
          {idx < steps.length - 1 && (
            <div className={cn(
              "h-px flex-1",
              currentStep > s.num ? "bg-primary" : "bg-muted"
            )} />
          )}
        </div>
      ))}
    </div>
  );
}