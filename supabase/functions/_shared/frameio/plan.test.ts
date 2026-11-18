import { describe, expect, it } from 'vitest';
import {
  planClientStructure,
  planSteps,
  planVideoProject,
  type ExistingChild,
  type FolderSpec,
  type Step,
} from './plan.ts';

const EXAMPLE = {
  dateISO: '2026-11-05',
  tipo: 'Video',
  nomeProjeto: 'Lancamento',
};

const PROJECT_NAME = '2026-11-05_Quinta-Video-Lancamento';
const MONTH_NAME = '2026-11-Novembro';

type Tree = Record<string, ExistingChild[]>;

const key = (path: string[]): string => path.join('/');

/** A tree built from full folder paths, e.g. ['Vídeos', '2026-11-Novembro']. */
function treeOf(paths: string[][]): Tree {
  const tree: Tree = {};
  for (const path of paths) {
    for (let i = 0; i <= path.length; i += 1) {
      const prefix = key(path.slice(0, i));
      tree[prefix] ??= [];
    }
    const parent = path.slice(0, -1);
    const name = path[path.length - 1];
    tree[key(parent)].push({ name, id: `id:${key(path)}` });
  }
  return tree;
}

const childrenOf =
  (tree: Tree) =>
  (path: string[]): ExistingChild[] =>
    tree[key(path)] ?? [];

/** The tree a complete run leaves behind: every planned folder present. */
function fullTree(specs: FolderSpec[]): Tree {
  return treeOf(specs.map((spec) => [...spec.path, spec.name]));
}

const kinds = (steps: Step[]): Record<string, string[]> =>
  steps.reduce<Record<string, string[]>>((acc, step) => {
    (acc[step.kind] ??= []).push(step.name);
    return acc;
  }, {});

describe('planClientStructure (STRU-02)', () => {
  it('yields the five fixed folders directly under the project root, in order', () => {
    expect(planClientStructure()).toEqual([
      { path: [], name: 'Contratos' },
      { path: [], name: 'Artes' },
      { path: [], name: 'Textos e Roteiros' },
      { path: [], name: 'Relatórios' },
      { path: [], name: 'Vídeos' },
    ]);
  });
});

describe('planVideoProject (PROJ-01, PROJ-02, PROJ-03, PROJ-04)', () => {
  it('yields Vídeos, the month, the project folder and the three material siblings', () => {
    expect(planVideoProject(EXAMPLE)).toEqual([
      { path: [], name: 'Vídeos' },
      { path: ['Vídeos'], name: MONTH_NAME },
      { path: ['Vídeos', MONTH_NAME], name: PROJECT_NAME },
      { path: ['Vídeos', MONTH_NAME, PROJECT_NAME], name: 'Brutos' },
      { path: ['Vídeos', MONTH_NAME, PROJECT_NAME], name: 'Cenas de Apoio' },
      { path: ['Vídeos', MONTH_NAME, PROJECT_NAME], name: 'Editados' },
    ]);
  });

  it('puts the three material folders under the project folder, never nested', () => {
    const specs = planVideoProject(EXAMPLE);
    const material = specs.filter((spec) =>
      ['Brutos', 'Cenas de Apoio', 'Editados'].includes(spec.name)
    );
    expect(material).toHaveLength(3);
    // Same parent for all three: siblings, as the user confirmed.
    expect(new Set(material.map((spec) => key(spec.path))).size).toBe(1);
    expect(key(material[0].path)).toBe(`Vídeos/${MONTH_NAME}/${PROJECT_NAME}`);
    expect(material.every((spec) => spec.path.length === 3)).toBe(true);
  });

  it('builds the month and project names through the T2 name builders', () => {
    const specs = planVideoProject(EXAMPLE);
    expect(specs[1].name).toBe('2026-11-Novembro');
    expect(specs[2].name).toBe('2026-11-05_Quinta-Video-Lancamento');
  });
});

describe('planSteps — create only what is missing (STRU-03, STRU-04, PROJ-05, PROJ-06)', () => {
  it('plans every folder of an empty tree as a create', () => {
    const specs = planClientStructure();
    const steps = planSteps(specs, childrenOf({}));

    expect(steps.map((step) => step.kind)).toEqual(specs.map(() => 'create'));
    expect(steps.map((step) => step.name)).toEqual(specs.map((spec) => spec.name));
  });

  it('yields zero creates when re-run against a fully populated tree', () => {
    for (const specs of [planClientStructure(), planVideoProject(EXAMPLE)]) {
      const steps = planSteps(specs, childrenOf(fullTree(specs)));

      expect(kinds(steps).create).toBeUndefined();
      expect(kinds(steps).reuse).toEqual(specs.map((spec) => spec.name));
      // A reuse carries the id of the folder it found.
      expect(steps.every((step) => step.kind === 'reuse' && step.id === `id:${key([...step.path, step.name])}`)).toBe(
        true
      );
    }
  });

  it('never emits a create for a name already present under that parent', () => {
    const specs = planVideoProject(EXAMPLE);
    // The target project name exists, but under a DIFFERENT month. It must
    // not satisfy the plan for 2026-11, so the run still creates that branch.
    const tree = treeOf([
      ['Vídeos'],
      ['Vídeos', MONTH_NAME],
      ['Vídeos', '2025-10-Outubro', PROJECT_NAME],
    ]);

    const steps = planSteps(specs, childrenOf(tree));

    expect(kinds(steps).reuse).toEqual(['Vídeos', MONTH_NAME]);
    expect(kinds(steps).create).toEqual([
      PROJECT_NAME,
      'Brutos',
      'Cenas de Apoio',
      'Editados',
    ]);

    // Control: the same run against a tree that HAS the project folder under
    // the right month creates nothing, so the assertion above is not vacuous.
    const complete = planSteps(specs, childrenOf(fullTree(specs)));
    expect(kinds(complete).create).toBeUndefined();
  });
});

describe('planSteps — partial trees (EDGE-01, EDGE-03)', () => {
  it('creates only the missing Editados when the other two material folders exist', () => {
    const specs = planVideoProject(EXAMPLE);
    const tree = fullTree(specs);
    tree[`Vídeos/${MONTH_NAME}/${PROJECT_NAME}`] = tree[
      `Vídeos/${MONTH_NAME}/${PROJECT_NAME}`
    ].filter((child) => child.name !== 'Editados');

    const steps = planSteps(specs, childrenOf(tree));
    const creates = steps.filter((step) => step.kind === 'create');

    expect(creates).toHaveLength(1);
    expect(creates[0]).toEqual({
      kind: 'create',
      path: ['Vídeos', MONTH_NAME, PROJECT_NAME],
      name: 'Editados',
    });
    expect(kinds(steps).reuse).toHaveLength(5);
  });

  it('creates only the project branch when the month exists but the project folder does not', () => {
    const specs = planVideoProject(EXAMPLE);
    const tree = treeOf([['Vídeos'], ['Vídeos', MONTH_NAME]]);

    const steps = planSteps(specs, childrenOf(tree));

    expect(kinds(steps).reuse).toEqual(['Vídeos', MONTH_NAME]);
    // The project folder does not exist, so nothing under it can exist either.
    expect(kinds(steps).create).toEqual([
      PROJECT_NAME,
      'Brutos',
      'Cenas de Apoio',
      'Editados',
    ]);
  });

  it('creates the whole video branch when only Vídeos exists', () => {
    const specs = planVideoProject(EXAMPLE);
    const steps = planSteps(specs, childrenOf(treeOf([['Vídeos']])));

    expect(kinds(steps).reuse).toEqual(['Vídeos']);
    expect(kinds(steps).create).toEqual([MONTH_NAME, PROJECT_NAME, 'Brutos', 'Cenas de Apoio', 'Editados']);
  });
});
