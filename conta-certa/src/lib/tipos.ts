export type Forma = "pix" | "boleto" | "cartao";

export interface Cartao {
  id: string;
  nome: string;
}

export interface Despesa {
  id: string;
  descricao: string;
  valor: number; // centavos (valor da parcela, se parcelada)
  mes: string; // "2026-10"
  forma: Forma;
  cartaoId?: string; // só se forma === "cartao"
  compraId?: string; // agrupa as parcelas de uma mesma compra
  parcela?: number; // 1..parcelas
  parcelas?: number;
  paga: boolean;
}

export interface Entrada {
  id: string;
  descricao: string;
  valor: number; // centavos
  mes: string;
  recebida: boolean;
  grupoId?: string; // agrupa parcelas de uma mesma entrada
  parcela?: number; // 1..parcelas
  parcelas?: number;
}

export interface Config {
  id: "config";
  mesInicial: string;
}

export interface Plano {
  id: string;
  nome: string;
  valorAlvo: number; // centavos
  prazoMeses: number;
}

export interface FixaExterna {
  id: string;
  nome: string;
  valor: number; // centavos por mês
}

export interface Backup {
  versao: 1;
  exportadoEm: string;
  config: Config;
  cartoes: Cartao[];
  despesas: Despesa[];
  entradas: Entrada[];
  planos: Plano[];
  fixasExternas: FixaExterna[];
}
