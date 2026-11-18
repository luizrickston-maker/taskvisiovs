// Nomes de pasta do Frame.io — puros, sem I/O e sem API do Deno (AD-003).
//
// Dias da semana e meses são constantes literais em pt-BR: o runtime de edge
// não tem garantia de dados de locale do Intl, e uma constante é testável
// sem depender de locale (design, Tech Decisions). Por isso date-fns também
// não entra aqui.

const WEEKDAYS_PTBR = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const;

const MONTHS_PTBR = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

export type WeekDayPtBR = (typeof WEEKDAYS_PTBR)[number];

/** As cinco pastas fixas sob a raiz do projeto do cliente (P1 AC 12). */
export const CLIENT_FIXED_FOLDERS = [
  'Contratos',
  'Artes',
  'Textos e Roteiros',
  'Relatórios',
  'Vídeos',
] as const;

/** Brutos, Cenas de Apoio e Editados são três pastas IRMÃS (usuário, 2026-11-18). */
export const MATERIAL_FOLDERS = ['Brutos', 'Cenas de Apoio', 'Editados'] as const;

const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDate(dateISO: string): {
  year: number;
  month: number;
  day: number;
  weekday: WeekDayPtBR;
} {
  const match = DATE_ISO.exec(dateISO);
  if (!match) {
    throw new RangeError(`data inválida, esperado AAAA-MM-DD: ${dateISO}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // UTC: um parse local deslocaria o dia perto da meia-noite do navegador.
  const weekday = WEEKDAYS_PTBR[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return { year, month, day, weekday };
}

/**
 * Cada sequência de espaço vira um único hífen; todo o resto sobrevive,
 * acentos inclusos (PROJ-09). As pontas são aparadas antes, porque espaço
 * no início ou no fim do campo não faz parte do nome — o spec não fala desse
 * caso (nota de precisão do spec), e `-Video-` como nome de pasta seria um
 * defeito visível para o usuário.
 */
export function slugPart(value: string): string {
  return value.trim().replace(/\s+/g, '-');
}

export function weekDayPtBR(dateISO: string): WeekDayPtBR {
  return parseDate(dateISO).weekday;
}

/** `2026-11-05` → `2026-11-Novembro` (PROJ-07). */
export function buildMonthFolderName(dateISO: string): string {
  const { year, month } = parseDate(dateISO);
  return `${year}-${String(month).padStart(2, '0')}-${MONTHS_PTBR[month - 1]}`;
}

/** `2026-11-05` + `Video` + `Lancamento` → `2026-11-05_Quinta-Video-Lancamento`. */
export function buildProjectFolderName(input: {
  dateISO: string;
  tipo: string;
  nomeProjeto: string;
}): string {
  const { year, month, day, weekday } = parseDate(input.dateISO);
  const datePart = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return `${datePart}_${weekday}-${slugPart(input.tipo)}-${slugPart(input.nomeProjeto)}`;
}
