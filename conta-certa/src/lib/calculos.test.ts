import { describe, expect, it } from "vitest";
import {
  avaliarPlano,
  calcularSobra,
  consolidar,
  projetarAcumulado,
  resumirMes,
} from "./calculos";
import type { Config, Despesa, Entrada, FixaExterna, Plano } from "./tipos";

const config: Config = { id: "config", saldoInicial: 100000, mesInicial: "2026-10" };

function despesa(mes: string, valor: number, paga = false): Despesa {
  return { id: `d-${mes}-${valor}`, descricao: "Despesa", valor, mes, forma: "pix", paga };
}

function entrada(mes: string, valor: number, recebida = false): Entrada {
  return { id: `e-${mes}-${valor}`, descricao: "Entrada", valor, mes, recebida };
}

describe("resumirMes", () => {
  it("primeiro mês usa o saldo inicial", () => {
    const r = resumirMes(config, [despesa("2026-10", 3000)], [entrada("2026-10", 5000)], "2026-10");
    expect(r).toEqual({
      mes: "2026-10",
      saldoInicio: 100000,
      entradas: 5000,
      despesas: 3000,
      previsao: 102000,
      historico: false,
    });
  });

  it("mês seguinte começa com a previsão do anterior", () => {
    const r = resumirMes(
      config,
      [despesa("2026-10", 3000), despesa("2026-11", 1000)],
      [entrada("2026-10", 5000)],
      "2026-11"
    );
    expect(r.saldoInicio).toBe(102000);
    expect(r.previsao).toBe(101000);
    expect(r.historico).toBe(false);
  });

  it("lançamentos pagos/recebidos continuam contando no mês", () => {
    const r = resumirMes(
      config,
      [despesa("2026-10", 3000, true)],
      [entrada("2026-10", 5000, true)],
      "2026-10"
    );
    expect(r.despesas).toBe(3000);
    expect(r.entradas).toBe(5000);
    expect(r.previsao).toBe(102000);
  });

  it("mês anterior ao início é histórico: saldo zero e não contamina a cadeia", () => {
    const r = resumirMes(
      config,
      [despesa("2026-09", 9999), despesa("2026-10", 3000)],
      [entrada("2026-08", 8888)],
      "2026-10"
    );
    expect(r.saldoInicio).toBe(100000);
    expect(r.previsao).toBe(97000);

    const h = resumirMes(config, [despesa("2026-09", 9999)], [entrada("2026-08", 8888)], "2026-09");
    expect(h).toEqual({
      mes: "2026-09",
      saldoInicio: 0,
      entradas: 0,
      despesas: 9999,
      previsao: -9999,
      historico: true,
    });
  });
});

describe("consolidar", () => {
  it("vazio quando não há dados", () => {
    expect(consolidar(config, [], [])).toEqual([]);
  });

  it("gera cadeia do início de uso até o último mês com dados, incluindo meses vazios", () => {
    const lista = consolidar(
      config,
      [despesa("2026-10", 3000), despesa("2026-12", 1000)],
      [entrada("2026-12", 2000)]
    );
    expect(lista.map((r) => r.mes)).toEqual(["2026-10", "2026-11", "2026-12"]);
    expect(lista[0]).toMatchObject({ saldoInicio: 100000, previsao: 97000 });
    expect(lista[1]).toMatchObject({ saldoInicio: 97000, entradas: 0, despesas: 0, previsao: 97000 });
    expect(lista[2]).toMatchObject({ saldoInicio: 97000, entradas: 2000, despesas: 1000, previsao: 98000 });
  });

  it("ignora meses anteriores ao início de uso", () => {
    const lista = consolidar(config, [despesa("2026-08", 5000), despesa("2026-10", 3000)], []);
    expect(lista.map((r) => r.mes)).toEqual(["2026-10"]);
    expect(lista[0].saldoInicio).toBe(100000);
  });
});

describe("calcularSobra", () => {
  const fixas: FixaExterna[] = [
    { id: "f1", nome: "Aluguel", valor: 150000 },
    { id: "f2", nome: "Internet", valor: 10000 },
  ];

  it("renda − despesas do app − fixas de fora", () => {
    expect(calcularSobra(500000, 50000, fixas)).toBe(290000);
  });

  it("pode ficar negativa", () => {
    expect(calcularSobra(100000, 50000, fixas)).toBe(-110000);
  });
});

describe("projetarAcumulado", () => {
  it("sem rendimento é sobra × meses", () => {
    expect(projetarAcumulado(100000, 3)).toEqual([100000, 200000, 300000]);
  });

  it("com rendimento compõe mês a mês", () => {
    // 100000 * 1,01 + 100000 = 201000; 201000 * 1,01 + 100000 = 303010
    expect(projetarAcumulado(100000, 2, 0.01)).toEqual([100000, 201000]);
    expect(projetarAcumulado(100000, 3, 0.01)).toEqual([100000, 201000, 303010]);
  });
});

describe("avaliarPlano", () => {
  const plano: Plano = { id: "p1", nome: "Viagem", valorAlvo: 120000, prazoMeses: 12 };

  it("plano que cabe na sobra", () => {
    const r = avaliarPlano(plano, 20000);
    expect(r).toEqual({ guardarPorMes: 10000, cabeNaSobra: true, faltaPorMes: 0, mesesNecessarios: null });
  });

  it("plano que não cabe calcula falta e meses necessários", () => {
    const r = avaliarPlano(plano, 8000);
    expect(r.guardarPorMes).toBe(10000);
    expect(r.cabeNaSobra).toBe(false);
    expect(r.faltaPorMes).toBe(2000);
    expect(r.mesesNecessarios).toBe(15); // ceil(120000 / 8000)
  });

  it("sem sobra não estima meses", () => {
    const r = avaliarPlano(plano, 0);
    expect(r.mesesNecessarios).toBeNull();
    expect(r.faltaPorMes).toBe(10000);
  });

  it("arredonda para cima quando o valor não divide exato", () => {
    const r = avaliarPlano({ ...plano, valorAlvo: 10000, prazoMeses: 3 }, 4000);
    expect(r.guardarPorMes).toBe(3334); // ceil(10000/3)
  });
});
