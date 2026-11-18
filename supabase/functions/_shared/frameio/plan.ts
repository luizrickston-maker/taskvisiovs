// Planejamento da estrutura de pastas — puro, sem I/O e sem API do Deno
// (AD-003). Este arquivo é a regra inteira de idempotência: ele nunca emite
// `create` para um nome já presente sob o mesmo pai (STRU-03, PROJ-05), e uma
// re-execução contra uma árvore completa não emite nenhum `create`
// (STRU-04, PROJ-06).

import { CLIENT_FIXED_FOLDERS, MATERIAL_FOLDERS, buildMonthFolderName, buildProjectFolderName } from './names.ts';

/** `path` são os nomes das pastas da raiz do projeto até o pai, inclusive. */
export type FolderSpec = { path: string[]; name: string };

/** Filhos de uma pasta no estado atual da árvore. */
export type ExistingChild = { name: string; id: string };

export type Step =
  | { kind: 'reuse'; path: string[]; name: string; id: string }
  | { kind: 'create'; path: string[]; name: string };

/** Projeto + as cinco pastas fixas, na ordem do spec (STRU-02, P1 AC 12). */
export function planClientStructure(): FolderSpec[] {
  return CLIENT_FIXED_FOLDERS.map((name) => ({ path: [], name }));
}

/**
 * `Vídeos` → pasta de mês → pasta do projeto → as três pastas de material,
 * irmãs entre si (PROJ-01…PROJ-04; usuário confirmou em 2026-11-18).
 */
export function planVideoProject(input: {
  dateISO: string;
  tipo: string;
  nomeProjeto: string;
}): FolderSpec[] {
  const month = buildMonthFolderName(input.dateISO);
  const project = buildProjectFolderName(input);

  return [
    { path: [], name: 'Vídeos' },
    { path: ['Vídeos'], name: month },
    { path: ['Vídeos', month], name: project },
    ...MATERIAL_FOLDERS.map((name) => ({
      path: ['Vídeos', month, project],
      name,
    })),
  ];
}

/**
 * A diferença entre a árvore planejada e a real, na ordem do plano.
 *
 * `childrenOf` devolve os filhos do pai no estado ATUAL, antes de qualquer
 * criação desta execução. Um pai que ainda não existe devolve `[]`, o que
 * faz o filho ser criado — é assim que a árvore de um projeto que ainda não
 * foi criado inteiro é planejada de uma vez.
 */
export function planSteps(
  specs: FolderSpec[],
  childrenOf: (path: string[]) => ExistingChild[],
): Step[] {
  return specs.map((spec) => {
    const existing = childrenOf(spec.path).find((child) => child.name === spec.name);
    return existing
      ? { kind: 'reuse', path: spec.path, name: spec.name, id: existing.id }
      : { kind: 'create', path: spec.path, name: spec.name };
  });
}
