import { compararMeses, somarMes } from "./mes";
import type { Config, Despesa, Entrada, FixaExterna, Plano } from "./tipos";

// Funções puras de cálculo (sem Dexie). Regras do conta-certa-mvp-v2.md:
// - meses anteriores ao início de uso são históricos (não contam);
// - início do mês = previsão do mês anterior; o primeiro usa o saldo inicial.

export interface ResumoMes {
  mes: string;
  /** Saldo no início do mês. */
  saldoInicio: number;
  /** Total de entradas do mês (recebidas ou não). */
  entradas: number;
  /** Total de despesas do mês (pagas ou não). */
  despesas: number;
  /** Início + entradas − despesas (todas). */
  previsao: number;
  /** Mês anterior ao início de uso: lançamentos são históricos. */
  historico: boolean;
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

/** Resumo de um mês conforme as regras do MVP. */
export function resumirMes(
  config: Config,
  despesas: Despesa[],
  entradas: Entrada[],
  mes: string
): ResumoMes {
  const totaisTudo = totalizar(despesas, entradas);

  const historico = compararMeses(mes, config.mesInicial) < 0;
  if (historico) {
    const t = totaisTudo.get(mes);
    return {
      mes,
      saldoInicio: 0,
      entradas: t?.entradas ?? 0,
      despesas: t?.despesas ?? 0,
      previsao: (t?.entradas ?? 0) - (t?.despesas ?? 0),
      historico: true,
    };
  }

  // Da cadeia de saldo/previsão só entra o que é do início de uso em diante.
  const totais = totalizar(
    despesas.filter((d) => compararMeses(d.mes, config.mesInicial) >= 0),
    entradas.filter((e) => compararMeses(e.mes, config.mesInicial) >= 0)
  );

  let inicio = config.saldoInicial;
  let cursor = config.mesInicial;
  while (compararMeses(cursor, mes) < 0) {
    const t = totais.get(cursor);
    inicio += (t?.entradas ?? 0) - (t?.despesas ?? 0);
    cursor = somarMes(cursor, 1);
  }

  const t = totais.get(mes);
  return {
    mes,
    saldoInicio: inicio,
    entradas: t?.entradas ?? 0,
    despesas: t?.despesas ?? 0,
    previsao: inicio + (t?.entradas ?? 0) - (t?.despesas ?? 0),
    historico: false,
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
      saldoInicio: inicio,
      entradas: t?.entradas ?? 0,
      despesas: t?.despesas ?? 0,
      previsao: inicio + (t?.entradas ?? 0) - (t?.despesas ?? 0),
      historico: false,
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
