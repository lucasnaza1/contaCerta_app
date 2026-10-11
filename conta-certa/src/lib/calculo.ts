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
 * - saldo real = saldo inicial + entradas recebidas − despesas pagas,
 *   contando só do início de uso em diante (o saldo inicial informado
 *   já contém tudo que aconteceu antes);
 * - início do mês = previsão do mês anterior; o primeiro mês de uso
 *   começa com o saldo inicial informado;
 * - previsão = início do mês + entradas − despesas do mês (todas).
 * Lançamentos em meses anteriores ao início de uso são históricos:
 * não afetam saldo nem previsão.
 */
export function resumirMes(
  config: Config,
  despesas: Despesa[],
  entradas: Entrada[],
  mes: string,
  mesRef: string
): ResumoMes {
  // Totais do mês exibido (mesmo antes do início de uso, para bater com o checklist).
  const totaisTudo = totalizar(despesas, entradas);

  // Da cadeia de saldo/previsão só entra o que é do início de uso em diante.
  const totais = totalizar(
    despesas.filter((d) => compararMeses(d.mes, config.mesInicial) >= 0),
    entradas.filter((e) => compararMeses(e.mes, config.mesInicial) >= 0)
  );

  // Saldo real: tudo que entrou e saiu de fato desde o início de uso.
  let saldoReal = config.saldoInicial;
  for (const t of totais.values()) {
    saldoReal += t.entradasRecebidas - t.despesasPagas;
  }

  // Cadeia de previsões: sempre parte do início de uso com o saldo inicial.
  let inicio = config.saldoInicial;
  let cursor = config.mesInicial;
  while (compararMeses(cursor, mes) < 0) {
    const t = totais.get(cursor);
    inicio += (t?.entradas ?? 0) - (t?.despesas ?? 0);
    cursor = somarMes(cursor, 1);
  }

  const t = totaisTudo.get(mes);
  return {
    mes,
    saldo: mes === mesRef ? saldoReal : inicio,
    saldoInicio: inicio,
    entradas: t?.entradas ?? 0,
    despesas: t?.despesas ?? 0,
    previsao: inicio + (t?.entradas ?? 0) - (t?.despesas ?? 0),
  };
}

/** Lista de meses (do início de uso até o último com dados). */
export function consolidar(
  config: Config,
  despesas: Despesa[],
  entradas: Entrada[]
): ResumoMes[] {
  const totais = totalizar(
    despesas.filter((d) => compararMeses(d.mes, config.mesInicial) >= 0),
    entradas.filter((e) => compararMeses(e.mes, config.mesInicial) >= 0)
  );
  const meses = [...totais.keys()].sort(compararMeses);
  if (!meses.length) return [];

  const lista: ResumoMes[] = [];
  let inicio = config.saldoInicial;
  let cursor = config.mesInicial;
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
