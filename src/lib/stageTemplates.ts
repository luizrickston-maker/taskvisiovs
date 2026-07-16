import type { StageTemplate, StageTemplateId } from '@/types/database';

/**
 * Templates de etapa prontos para sugerir ao criar um projeto.
 * Os ícones são nomes de ícones do lucide-react que renderizamos dinamicamente.
 */
export const STAGE_TEMPLATES: Record<StageTemplateId, StageTemplate> = {
  video: {
    id: 'video',
    label: 'Vídeo',
    description: 'Briefing → Roteiro → Captação → Edição → Entrega',
    stages: [
      { name: 'Briefing', icon: 'ClipboardList', sla_days: 2 },
      { name: 'Roteiro', icon: 'FileText', sla_days: 3 },
      { name: 'Captação', icon: 'Video', sla_days: 5 },
      { name: 'Edição', icon: 'Scissors', sla_days: 4 },
      { name: 'Entrega', icon: 'Package', sla_days: 1 },
    ],
  },
  design: {
    id: 'design',
    label: 'Design',
    description: 'Briefing → Pesquisa → Criação → Revisão → Entrega',
    stages: [
      { name: 'Briefing', icon: 'ClipboardList', sla_days: 2 },
      { name: 'Pesquisa', icon: 'Search', sla_days: 2 },
      { name: 'Criação', icon: 'Palette', sla_days: 5 },
      { name: 'Revisão', icon: 'RefreshCw', sla_days: 2 },
      { name: 'Entrega', icon: 'Package', sla_days: 1 },
    ],
  },
  motion: {
    id: 'motion',
    label: 'Motion',
    description: 'Briefing → Storyboard → Animação → Revisão → Entrega',
    stages: [
      { name: 'Briefing', icon: 'ClipboardList', sla_days: 2 },
      { name: 'Storyboard', icon: 'Film', sla_days: 3 },
      { name: 'Animação', icon: 'Sparkles', sla_days: 7 },
      { name: 'Revisão', icon: 'RefreshCw', sla_days: 2 },
      { name: 'Entrega', icon: 'Package', sla_days: 1 },
    ],
  },
  outros: {
    id: 'outros',
    label: 'Outros',
    description: 'Planejamento → Execução → Revisão → Entrega',
    stages: [
      { name: 'Planejamento', icon: 'ClipboardList', sla_days: 2 },
      { name: 'Execução', icon: 'PlayCircle', sla_days: 5 },
      { name: 'Revisão', icon: 'RefreshCw', sla_days: 2 },
      { name: 'Entrega', icon: 'Package', sla_days: 1 },
    ],
  },
};

export const STAGE_TEMPLATE_LIST: StageTemplate[] = Object.values(STAGE_TEMPLATES);

/**
 * Tenta inferir um template a partir do nome da categoria.
 * Usado como fallback quando o usuário não tem um template explícito configurado.
 */
export function suggestTemplateByCategoryName(categoryName: string | null | undefined): StageTemplateId {
  if (!categoryName) return 'outros';
  const lower = categoryName.toLowerCase();
  if (/v[ií]deo|video|reels|shorts|story/.test(lower)) return 'video';
  if (/design|arte|pe[çc]a|gr[aá]fico|thumb|capa|social.?media/.test(lower)) return 'design';
  if (/motion|anima[çc][aã]o|3d|after.?effects/.test(lower)) return 'motion';
  return 'outros';
}