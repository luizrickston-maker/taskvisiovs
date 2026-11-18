import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  CLIENT_FIXED_FOLDERS,
  MATERIAL_FOLDERS,
  buildMonthFolderName,
  buildProjectFolderName,
  slugPart,
  weekDayPtBR,
} from './names';

const SOURCE_PATH = path.resolve(
  process.cwd(),
  'supabase/functions/_shared/frameio/names.ts'
);

// PROJ-07: every one of the 12 months, first letter uppercased, full name.
const MONTH_TABLE: [string, string][] = [
  ['2026-01-15', '2026-01-Janeiro'],
  ['2026-02-10', '2026-02-Fevereiro'],
  ['2026-03-20', '2026-03-Março'],
  ['2026-04-05', '2026-04-Abril'],
  ['2026-05-01', '2026-05-Maio'],
  ['2026-06-30', '2026-06-Junho'],
  ['2026-07-18', '2026-07-Julho'],
  ['2026-08-22', '2026-08-Agosto'],
  ['2026-09-09', '2026-09-Setembro'],
  ['2026-10-25', '2026-10-Outubro'],
  ['2026-11-05', '2026-11-Novembro'],
  ['2026-12-31', '2026-12-Dezembro'],
];

// PROJ-08: seven consecutive days, one per allowed weekday name.
const WEEKDAY_TABLE: [string, string][] = [
  ['2026-11-02', 'Segunda'],
  ['2026-11-03', 'Terça'],
  ['2026-11-04', 'Quarta'],
  ['2026-11-05', 'Quinta'],
  ['2026-11-06', 'Sexta'],
  ['2026-11-07', 'Sábado'],
  ['2026-11-08', 'Domingo'],
];

describe('folder constants', () => {
  it('names the five fixed client folders in the order the spec lists them', () => {
    expect([...CLIENT_FIXED_FOLDERS]).toEqual([
      'Contratos',
      'Artes',
      'Textos e Roteiros',
      'Relatórios',
      'Vídeos',
    ]);
  });

  it('names the three material folders as siblings', () => {
    expect([...MATERIAL_FOLDERS]).toEqual(['Brutos', 'Cenas de Apoio', 'Editados']);
  });
});

describe('buildMonthFolderName (PROJ-07)', () => {
  it('renders 2026-11-05 as 2026-11-Novembro', () => {
    expect(buildMonthFolderName('2026-11-05')).toBe('2026-11-Novembro');
  });

  it('covers all 12 months of the year', () => {
    for (const [dateISO, expected] of MONTH_TABLE) {
      expect(buildMonthFolderName(dateISO)).toBe(expected);
    }
    const months = MONTH_TABLE.map(([dateISO]) => buildMonthFolderName(dateISO).split('-')[2]);
    expect(new Set(months).size).toBe(12);
  });
});

describe('buildProjectFolderName (PROJ-07, PROJ-08, PROJ-09)', () => {
  it('renders 2026-11-05 / Video / Lancamento as 2026-11-05_Quinta-Video-Lancamento', () => {
    expect(
      buildProjectFolderName({ dateISO: '2026-11-05', tipo: 'Video', nomeProjeto: 'Lancamento' })
    ).toBe('2026-11-05_Quinta-Video-Lancamento');
  });

  it('covers all 7 weekdays in the folder name', () => {
    for (const [dateISO, expected] of WEEKDAY_TABLE) {
      expect(
        buildProjectFolderName({ dateISO, tipo: 'Video', nomeProjeto: 'Reel' })
      ).toBe(`${dateISO}_${expected}-Video-Reel`);
    }
    const weekdays = WEEKDAY_TABLE.map(([, expected]) => expected);
    expect(new Set(weekdays).size).toBe(7);
  });

  it('collapses every whitespace run in tipo and nomeProjeto to one hyphen', () => {
    expect(slugPart('Video Tutorial')).toBe('Video-Tutorial');
    // Three spaces, a tab and a newline are still one run each.
    expect(slugPart('Video   Tutorial')).toBe('Video-Tutorial');
    expect(slugPart('Video\tTutorial')).toBe('Video-Tutorial');
    expect(slugPart('Video \n Tutorial')).toBe('Video-Tutorial');
    expect(
      buildProjectFolderName({
        dateISO: '2026-11-05',
        tipo: 'Video  Case',
        nomeProjeto: 'Lancamento   Site',
      })
    ).toBe('2026-11-05_Quinta-Video-Case-Lancamento-Site');
  });

  it('preserves accents and every other character (PROJ-09)', () => {
    expect(slugPart('Lançamento')).toBe('Lançamento');
    expect(slugPart('São Paulo — Verão')).toBe('São-Paulo-—-Verão');
    expect(
      buildProjectFolderName({
        dateISO: '2026-11-05',
        tipo: 'Vídeo Institucional',
        nomeProjeto: 'Lançamento Técnico',
      })
    ).toBe('2026-11-05_Quinta-Vídeo-Institucional-Lançamento-Técnico');
    expect(
      buildProjectFolderName({
        dateISO: '2026-11-05',
        tipo: 'Vídeo',
        nomeProjeto: 'Aniversário da Empresa',
      })
    ).toBe('2026-11-05_Quinta-Vídeo-Aniversário-da-Empresa');
  });

  it('produces a folder name with no whitespace left in it', () => {
    const name = buildProjectFolderName({
      dateISO: '2026-11-05',
      tipo: '  Video  Case  ',
      nomeProjeto: '  Lançamento  ',
    });
    expect(name).not.toMatch(/\s/);
  });
});

describe('edge runtime conformance (AD-003)', () => {
  it('uses no Deno-specific API, so tsc accepts it when reached from src', () => {
    const source = readFileSync(SOURCE_PATH, 'utf8');
    // A chamada de API (`Deno.env`, `Deno.serve`, …), não a menção na
    // documentação do arquivo.
    expect(source).not.toMatch(/\bDeno\s*\./);
  });
});
