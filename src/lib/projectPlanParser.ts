/**
 * Parser / Validador do Plano de Projeto gerado pela skill "Planejamento de Projeto".
 * Extrai o bloco json-project-plan de uma resposta Markdown da IA,
 * valida o schema v1.0 e mapeia warnings/erros estruturados.
 */

export interface ProjectPlanV1 {
  version: string;
  generated_at: string;
  work_calendar: {
    first_work_day: string;
    project_end_day: string;
    estimated_effort_hours: number;
    available_capacity_hours: number;
    weekly_capacity_per_person_hours: number;
    feasible: boolean;
    feasibility_note: string;
  };
  project: {
    name: string;
    client_name: string;
    company_name: string | null;
    category_name: string;
    priority: number;
    estimated_time: string | null;
    deadline: string;
    description: string;
  };
  stages: Array<{
    name: string;
    icon: string;
    sla_days: number;
    deadline: string;
    notes: string;
    template_id: string;
    tasks: Array<{
      title: string;
      description: string;
      priority: number;
      status: string;
      estimated_hours: number;
      actual_hours: number;
      deadline: string;
      assigned_to_name: string | null;
    }>;
  }>;
}

export interface PlanValidationIssue {
  severity: "error" | "warning";
  path: string;
  message: string;
}

export interface ParsedPlan {
  raw: string;
  plan: ProjectPlanV1;
  warnings: PlanValidationIssue[];
  collaboratorNames: string[];
  totalTasks: number;
  totalStages: number;
  totalEstimatedHours: number;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_ICONS = new Set([
  "ClipboardList", "FileText", "Video", "Scissors", "Package",
  "Search", "Palette", "RefreshCw", "Film", "Sparkles",
  "PlayCircle", "Layers",
]);
const VALID_TEMPLATES = new Set(["video", "design", "motion", "outros"]);

export function extractPlanJson(markdown: string): { json: ProjectPlanV1 | null; raw: string | null; errors: PlanValidationIssue[] } {
  const errors: PlanValidationIssue[] = [];

  // Match ```json-project-plan ... ```
  const match = markdown.match(/```json-project-plan\s*\n([\s\S]+?)\n```/);
  if (!match) {
    return { json: null, raw: null, errors: [{ severity: "error", path: "root", message: "Bloco ```json-project-plan não encontrado na resposta da IA." }] };
  }

  const raw = match[1];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return {
      json: null,
      raw,
      errors: [{
        severity: "error",
        path: "json",
        message: `JSON inválido: ${e instanceof Error ? e.message : String(e)}`,
      }],
    };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return {
      json: null,
      raw,
      errors: [{ severity: "error", path: "json", message: "JSON não é um objeto." }],
    };
  }

  const obj = parsed as Record<string, unknown>;

  // Top-level required
  if (obj.version !== "1.0") {
    errors.push({ severity: "error", path: "version", message: `Versão esperada: "1.0", recebida: "${obj.version}"` });
  }
  if (!obj.work_calendar) {
    errors.push({ severity: "error", path: "work_calendar", message: "work_calendar é obrigatório." });
  }
  if (!obj.project || typeof obj.project !== "object") {
    errors.push({ severity: "error", path: "project", message: "project é obrigatório." });
  } else {
    const p = obj.project as Record<string, unknown>;
    if (!p.name || typeof p.name !== "string") {
      errors.push({ severity: "error", path: "project.name", message: "project.name é obrigatório." });
    }
  }
  if (!Array.isArray(obj.stages) || obj.stages.length === 0) {
    errors.push({ severity: "error", path: "stages", message: "stages deve ser um array com ao menos 1 elemento." });
  }

  if (errors.some((e) => e.severity === "error")) {
    return { json: null, raw, errors };
  }

  return { json: parsed as ProjectPlanV1, raw, errors };
}

export function validatePlan(plan: ProjectPlanV1): PlanValidationIssue[] {
  const issues: PlanValidationIssue[] = [];

  // project fields
  if (!plan.project.name?.trim()) {
    issues.push({ severity: "error", path: "project.name", message: "Nome do projeto vazio." });
  }
  if (!ISO_DATE_RE.test(plan.project.deadline)) {
    issues.push({ severity: "error", path: "project.deadline", message: `project.deadline deve ser YYYY-MM-DD (recebido: ${plan.project.deadline})` });
  }
  if (![1, 2, 3, 4, 5].includes(plan.project.priority)) {
    issues.push({ severity: "warning", path: "project.priority", message: `Prioridade fora do range 1-5 (recebido: ${plan.project.priority})` });
  }
  if (!plan.project.category_name) {
    issues.push({ severity: "warning", path: "project.category_name", message: "Categoria ausente — projeto será importado sem categoria." });
  }

  // work_calendar
  if (!plan.work_calendar) {
    issues.push({ severity: "error", path: "work_calendar", message: "work_calendar ausente." });
  } else {
    if (typeof plan.work_calendar.feasible !== "boolean") {
      issues.push({ severity: "warning", path: "work_calendar.feasible", message: "feasible deve ser boolean." });
    }
  }

  // stages
  if (!Array.isArray(plan.stages) || plan.stages.length < 3) {
    issues.push({ severity: "warning", path: "stages", message: `Recomendado ao menos 3 etapas (atual: ${plan.stages?.length ?? 0})` });
  }
  if (Array.isArray(plan.stages) && plan.stages.length > 8) {
    issues.push({ severity: "warning", path: "stages", message: `Máximo recomendado: 8 etapas (atual: ${plan.stages.length})` });
  }

  let lastStageDeadline = "";
  plan.stages?.forEach((stage, si) => {
    const path = `stages[${si}]`;
    if (!stage.name?.trim()) {
      issues.push({ severity: "error", path: `${path}.name`, message: "Nome da etapa vazio." });
    }
    if (stage.icon && !VALID_ICONS.has(stage.icon)) {
      issues.push({ severity: "warning", path: `${path}.icon`, message: `Ícone "${stage.icon}" não é um nome lucide-react conhecido — substituirá por default.` });
    }
    if (stage.template_id && !VALID_TEMPLATES.has(stage.template_id)) {
      issues.push({ severity: "warning", path: `${path}.template_id`, message: `template_id "${stage.template_id}" fora do padrão (video/design/motion/outros).` });
    }
    if (!ISO_DATE_RE.test(stage.deadline)) {
      issues.push({ severity: "error", path: `${path}.deadline`, message: `Deadline inválido: ${stage.deadline}` });
    } else {
      if (lastStageDeadline && stage.deadline <= lastStageDeadline) {
        issues.push({ severity: "error", path: `${path}.deadline`, message: `Cronologia violada: deadline ${stage.deadline} <= ${lastStageDeadline}` });
      }
      lastStageDeadline = stage.deadline;
    }

    // tasks
    if (!Array.isArray(stage.tasks) || stage.tasks.length === 0) {
      issues.push({ severity: "warning", path: `${path}.tasks`, message: `Etapa sem tarefas (esperado >= 1).` });
    }
    if (Array.isArray(stage.tasks) && stage.tasks.length > 15) {
      issues.push({ severity: "warning", path: `${path}.tasks`, message: `Etapa com ${stage.tasks.length} tarefas (máx recomendado: 15).` });
    }
    stage.tasks?.forEach((task, ti) => {
      const tpath = `${path}.tasks[${ti}]`;
      if (!task.title?.trim()) {
        issues.push({ severity: "error", path: `${tpath}.title`, message: "Título vazio." });
      }
      if (task.deadline && !ISO_DATE_RE.test(task.deadline)) {
        issues.push({ severity: "error", path: `${tpath}.deadline`, message: `Deadline inválido: ${task.deadline}` });
      }
      if (task.deadline && ISO_DATE_RE.test(stage.deadline) && task.deadline > stage.deadline) {
        issues.push({ severity: "error", path: `${tpath}.deadline`, message: `Tarefa com deadline ${task.deadline} após o da etapa ${stage.deadline}.` });
      }
      if (task.estimated_hours && (task.estimated_hours < 0.5 || task.estimated_hours > 8)) {
        issues.push({ severity: "warning", path: `${tpath}.estimated_hours`, message: `Tarefa com ${task.estimated_hours}h (recomendado 0.5-8h).` });
      }
    });
  });

  // dates in past
  const today = new Date().toISOString().split("T")[0];
  if (plan.project.deadline && plan.project.deadline < today) {
    issues.push({ severity: "warning", path: "project.deadline", message: `Deadline do projeto (${plan.project.deadline}) está no passado.` });
  }

  return issues;
}

export function parseAndValidatePlan(markdown: string): ParsedPlan | null {
  const { json, raw, errors } = extractPlanJson(markdown);
  if (!json) return null;

  const warnings = [...errors, ...validatePlan(json)];

  const collaboratorNames = new Set<string>();
  let totalTasks = 0;
  let totalEstimatedHours = 0;
  json.stages?.forEach((s) => {
    s.tasks?.forEach((t) => {
      totalTasks++;
      totalEstimatedHours += t.estimated_hours || 0;
      if (t.assigned_to_name) collaboratorNames.add(t.assigned_to_name);
    });
  });

  return {
    raw: raw ?? "",
    plan: json,
    warnings,
    collaboratorNames: Array.from(collaboratorNames),
    totalTasks,
    totalStages: json.stages?.length ?? 0,
    totalEstimatedHours,
  };
}
