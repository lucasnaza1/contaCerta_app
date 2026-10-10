import { compararMeses, somarMes } from "./mes";
import type { Config, Despesa, Entrada, FixaExterna, Plano } from "./types";

export interface ResumoMes {
  mes: string;
  /** Dinheiro que você tem agora (mês atual) ou saldo previsto no início do mês. */
  saldo: number;
  /** Saldo previsto no início do mês. */
  saldoInicio: number;
  /** Total de entradas do mês (recebidas ou não). */
  entradas: number;
  /** Total de despesas do mês (pagas ou não). */
  despesas: number;
  /** Quanto você deve ter no fim do mês. */
  previsao: number;
}

interface TotaisMes {
  entradas: number;
  despesas: number;
  entradasRecebidas: number;
  despesasPagas: number;
}

function totalizar(despesas: Despesa[], entradas: Entrada[]): Map<string, TotaisMes> {
  const mapa = new Map<string, TotaisMes>();
  const garantir = (mes: string): TotaisMes => {
    let t = mapa.get(mes);
    if (!t) {
      t = { entradas: 0, despesas: 0, entradasRecebidas: 0, despesasPagas: 0 };
      mapa.set(mes, t);
    }
    return t;
  };
  for (const e of entradas) {
    const t = garantir(e.mes);
    t.entradas += e.valor;
    if (e.recebida) t.entradasRecebidas += e.valor;
  }
  for (const d of despesas) {
    const t = garantir(d.mes);
    t.despesas += d.valor;
    if (d.paga) t.despesasPagas += d.valor;
  }
  return mapa;
}

/**
 * Resumo de um mês, seguindo as regras do MVP:
 * - saldo real = saldo inicial + entradas recebidas − despesas pagas (todas);
 * - início do mês = previsão do mês anterior (o primeiro usa o saldo inicial);
 * - previsão = início do mês + entradas − despesas do mês (todas).
 */
export function resumirMes(
  config: Config,
  despesas: Despesa[],
  entradas: Entrada[],
  mes: string,
  mesRef: string
): ResumoMes {
  const totais = totalizar(despesas, entradas);

  // Saldo real: tudo que entrou e saiu de fato, em qualquer mês.
  let saldoReal = config.saldoInicial;
  for (const t of totais.values()) {
    saldoReal += t.entradasRecebidas - t.despesasPagas;
  }

  // Caminha do primeiro mês com dado (ou mesInicial) até o mês pedido.
  const mesesComDados = [...totais.keys()].sort(compararMeses);
  const primeiro = mesesComDados.length
    ? compararMeses(mesesComDados[0], config.mesInicial) < 0
      ? mesesComDados[0]
      : config.mesInicial
    : config.mesInicial;

  let inicio = primeiro === config.mesInicial ? config.saldoInicial : 0;
  let cursor = primeiro;
  while (compararMeses(cursor, mes) < 0) {
    const t = totais.get(cursor);
    inicio += (t?.entradas ?? 0) - (t?.despesas ?? 0);
    cursor = somarMes(cursor, 1);
  }

  const t = totais.get(mes);
  return {
    mes,
    saldo: mes === mesRef ? saldoReal : inicio,
    saldoInicio: inicio,
    entradas: t?.entradas ?? 0,
    despesas: t?.despesas ?? 0,
    previsao: inicio + (t?.entradas ?? 0) - (t?.despesas ?? 0),
  };
}

/** Lista de meses (do primeiro com dados até o último) com entradas, despesas e previsão. */
export function consolidar(
  config: Config,
  despesas: Despesa[],
  entradas: Entrada[]
): ResumoMes[] {
  const totais = totalizar(despesas, entradas);
  const meses = [...totais.keys()].sort(compararMeses);
  if (!meses.length) return [];

  const primeiro = compararMeses(meses[0], config.mesInicial) < 0 ? meses[0] : config.mesInicial;
  const lista: ResumoMes[] = [];
  let inicio = primeiro === config.mesInicial ? config.saldoInicial : 0;
  let cursor = primeiro;
  const ultimo = meses[meses.length - 1];
  while (compararMeses(cursor, ultimo) <= 0) {
    const t = totais.get(cursor);
    lista.push({
      mes: cursor,
      saldo: inicio,
      saldoInicio: inicio,
      entradas: t?.entradas ?? 0,
      despesas: t?.despesas ?? 0,
      previsao: inicio + (t?.entradas ?? 0) - (t?.despesas ?? 0),
    });
    inicio += (t?.entradas ?? 0) - (t?.despesas ?? 0);
    cursor = somarMes(cursor, 1);
  }
  return lista;
}

// ---------- Simular ----------

export interface ResultadoPlano {
  guardarPorMes: number;
  cabeNaSobra: boolean;
  faltaPorMes: number;
  /** Em quantos meses dá com a sobra atual (só faz sentido se não cabe e sobra > 0). */
  mesesNecessarios: number | null;
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

/** Projeção mês a mês do acumulado, com rendimento mensal opcional (0.0–1.0). */
export function projetarAcumulado(
  sobraMensal: number,
  nMeses: number,
  rendimentoMensal = 0
): number[] {
  const valores: number[] = [];
  let acumulado = 0;
  for (let i = 0; i < nMeses; i++) {
    acumulado = acumulado * (1 + rendimentoMensal) + sobraMensal;
    valores.push(Math.round(acumulado));
  }
  return valores;
}

export function avaliarPlano(plano: Plano, sobraMensal: number): ResultadoPlano {
  const guardarPorMes = Math.ceil(plano.valorAlvo / plano.prazoMeses);
  const cabe = guardarPorMes <= sobraMensal;
  return {
    guardarPorMes,
    cabeNaSobra: cabe,
    faltaPorMes: cabe ? 0 : guardarPorMes - sobraMensal,
    mesesNecessarios: !cabe && sobraMensal > 0 ? Math.ceil(plano.valorAlvo / sobraMensal) : null,
  };
}
