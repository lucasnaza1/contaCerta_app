import { dividirParcelas, somarMes } from "./mes";
import type { Cartao, Config, Despesa, Entrada, FixaExterna } from "./tipos";

// Funções puras de cálculo (sem Dexie). Mês a mês: cada mês é fechado
// nele mesmo (entradas − despesas), sem saldo carregado entre meses.

export interface ResumoMes {
  mes: string;
  /** Total de entradas do mês (recebidas ou não). */
  entradas: number;
  /** Total de despesas do mês (pagas ou não). */
  despesas: number;
  /** Entradas − despesas do mês. */
  saldo: number;
  /** Soma dos saldos do início de uso até este mês: o que sobrou no total. */
  acumulado: number;
}

interface TotaisMes {
  entradas: number;
  despesas: number;
}

function totalizar(despesas: Despesa[], entradas: Entrada[]): Map<string, TotaisMes> {
  const mapa = new Map<string, TotaisMes>();
  const garantir = (mes: string): TotaisMes => {
    let t = mapa.get(mes);
    if (!t) {
      t = { entradas: 0, despesas: 0 };
      mapa.set(mes, t);
    }
    return t;
  };
  for (const e of entradas) {
    garantir(e.mes).entradas += e.valor;
  }
  for (const d of despesas) {
    garantir(d.mes).despesas += d.valor;
  }
  return mapa;
}

function fechar(t: TotaisMes | undefined, mes: string): Omit<ResumoMes, "acumulado"> {
  const entradas = t?.entradas ?? 0;
  const despesas = t?.despesas ?? 0;
  return { mes, entradas, despesas, saldo: entradas - despesas };
}

/** Resumo de um mês: entradas, despesas, saldo e o acumulado até ele. */
export function resumirMes(
  config: Config,
  despesas: Despesa[],
  entradas: Entrada[],
  mes: string
): ResumoMes {
  const totais = totalizar(
    despesas.filter((d) => d.mes >= config.mesInicial && d.mes <= mes),
    entradas.filter((e) => e.mes >= config.mesInicial && e.mes <= mes)
  );
  // Saldo do mês + soma dos meses anteriores (do início de uso até aqui).
  let acumulado = 0;
  for (const [m, t] of totais) {
    if (m <= mes) acumulado += t.entradas - t.despesas;
  }
  const t = totais.get(mes);
  const resumo = fechar(t, mes);
  return { ...resumo, acumulado };
}

/** Lista de meses (do início de uso até o último com dados), com acumulado. */
export function consolidar(
  config: Config,
  despesas: Despesa[],
  entradas: Entrada[]
): ResumoMes[] {
  const totais = totalizar(
    despesas.filter((d) => d.mes >= config.mesInicial),
    entradas.filter((e) => e.mes >= config.mesInicial)
  );
  const meses = [...totais.keys()].sort();
  if (!meses.length) return [];
  const lista: ResumoMes[] = [];
  let acumulado = 0;
  for (const mes of meses) {
    const resumo = fechar(totais.get(mes), mes);
    acumulado += resumo.saldo;
    lista.push({ ...resumo, acumulado });
  }
  return lista;
}

// ---------- Faturas ----------

export interface Fatura {
  /** id do cartão ("" quando é despesa de cartão sem cartão definido). */
  cartaoId: string;
  /** Nome do cartão (ou "Cartão" quando não identificado). */
  nome: string;
  /** Total da fatura em centavos. */
  total: number;
  despesas: Despesa[];
  /** Dia do mês em que a fatura fecha (1–31), se cadastrado. */
  diaFechamento?: number;
  /** Dia do mês em que a fatura vence (1–31), se cadastrado. */
  diaVencimento?: number;
}

/**
 * Agrupa as despesas de cartão por fatura (cartão), com total. Despesas de
 * outras formas não entram. `cartoes` fornece os nomes e dias da fatura.
 */
export function agruparFaturas(despesas: Despesa[], cartoes: Cartao[]): Fatura[] {
  const nomePorId = new Map(cartoes.map((c) => [c.id, c.nome]));
  const diasPorId = new Map(cartoes.map((c) => [c.id, c]));
  const faturas = new Map<string, Fatura>();
  for (const d of despesas) {
    if (d.forma !== "cartao") continue;
    const id = d.cartaoId ?? "";
    let f = faturas.get(id);
    if (!f) {
      const cartao = diasPorId.get(id);
      f = {
        cartaoId: id,
        nome: nomePorId.get(id) ?? "Cartão",
        total: 0,
        despesas: [],
        ...(cartao?.diaFechamento !== undefined ? { diaFechamento: cartao.diaFechamento } : {}),
        ...(cartao?.diaVencimento !== undefined ? { diaVencimento: cartao.diaVencimento } : {}),
      };
      faturas.set(id, f);
    }
    f.total += d.valor;
    f.despesas.push(d);
  }
  return [...faturas.values()].sort((a, b) => b.total - a.total);
}

// ---------- Simular ----------

/** Uma linha da simulação de economia, mês a mês. */
export interface MesSimulacao {
  /** "2026-11" */
  mes: string;
  /** Valor depositado neste mês (centavos). */
  deposito: number;
  /** Rendimento deste mês (centavos). */
  rendimento: number;
  /** Total guardado ao fim do mês (centavos). */
  acumulado: number;
}

export interface Simulacao {
  /** Meses da simulação, em ordem. */
  meses: MesSimulacao[];
  /** Depósito mensal calculado (centavos). */
  depositoMensal: number;
  /** Último mês da simulação ("2026-11"). */
  mesFinal: string;
  /** Total guardado ao fim (centavos). */
  total: number;
}

/**
 * Simula uma economia mês a mês: partindo de `mesInicial`, deposita o valor
 * necessário para atingir `valorAlvo` em `nMeses` (depósitos somam o alvo,
 * diferença de centavos na última parcela), com rendimento mensal opcional
 * sobre o acumulado.
 */
export function simularEconomia(
  valorAlvo: number,
  nMeses: number,
  mesInicial: string,
  rendimentoMensal = 0
): Simulacao {
  const meses: MesSimulacao[] = [];
  const depositos = dividirParcelas(valorAlvo, Math.max(1, nMeses));
  const depositoMensal = depositos[0] ?? 0;
  let acumulado = 0;
  for (let i = 0; i < nMeses; i++) {
    const deposito = depositos[i];
    const rendimento = Math.round(acumulado * rendimentoMensal);
    acumulado += deposito + rendimento;
    meses.push({ mes: somarMes(mesInicial, i), deposito, rendimento, acumulado });
  }
  return {
    meses,
    depositoMensal,
    mesFinal: nMeses > 0 ? somarMes(mesInicial, nMeses - 1) : mesInicial,
    total: acumulado,
  };
}

/** renda − despesas do app − fixas de fora = quanto dá para guardar por mês. */
export function calcularSobra(
  rendaMes: number,
  despesasMes: number,
  fixasExternas: FixaExterna[]
): number {
  const fixas = fixasExternas.reduce((s, f) => s + f.valor, 0);
  return rendaMes - despesasMes - fixas;
}
