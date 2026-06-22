export type CaixaTipo = 'entrada' | 'saida';

export type CaixaFormaPagamento =
  | 'pix'
  | 'boleto'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'transferencia'
  | 'dinheiro'
  | 'cheque'
  | 'outro';

export type ContaPagarStatus = 'pendente' | 'pago' | 'vencido' | 'cancelado';

export type ContaPagarFrequencia = 'mensal' | 'trimestral' | 'semestral' | 'anual';

export interface CaixaCategoria {
  id: string;
  workspace_id: string;
  nome: string;
  tipo: 'entrada' | 'saida' | 'ambos';
  cor: string;
  icone?: string | null;
  created_at: string;
}

export interface CaixaTransacao {
  id: string;
  workspace_id: string;
  tipo: CaixaTipo;
  descricao: string;
  valor: number;
  data: string;
  origem_destino?: string | null;
  categoria_id?: string | null;
  forma_pagamento?: CaixaFormaPagamento | null;
  observacoes?: string | null;
  referencia?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  categoria?: CaixaCategoria | null;
}

export interface ContaPagar {
  id: string;
  workspace_id: string;
  descricao: string;
  fornecedor?: string | null;
  valor: number;
  data_vencimento: string;
  data_pagamento?: string | null;
  status: ContaPagarStatus;
  categoria_id?: string | null;
  forma_pagamento?: CaixaFormaPagamento | null;
  recorrente: boolean;
  frequencia?: ContaPagarFrequencia | null;
  observacoes?: string | null;
  comprovante_url?: string | null;
  corporate_team_id?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  categoria?: CaixaCategoria | null;
}

export const FORMA_PAGAMENTO_LABELS: Record<CaixaFormaPagamento, string> = {
  pix: 'PIX',
  boleto: 'Boleto',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  transferencia: 'Transferência',
  dinheiro: 'Dinheiro',
  cheque: 'Cheque',
  outro: 'Outro',
};

export const CONTA_STATUS_LABELS: Record<ContaPagarStatus, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
};

export const FREQUENCIA_LABELS: Record<ContaPagarFrequencia, string> = {
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
};
