import { describe, expect, it } from "vitest";
import {
  agruparFaturas,
  calcularAlertasVencimento,
  calcularSobra,
  consolidar,
  diaVencimentoDespesa,
  resumirMes,
  simularEconomia,
} from "./calculos";
import type { Cartao, Config, Despesa, Entrada, FixaExterna } from "./tipos";

const config: Config = { id: "config", mesInicial: "2026-10" };

function despesa(mes: string, valor: number, extras: Partial<Despesa> = {}): Despesa {
  return { id: `d-${mes}-${valor}-${JSON.stringify(extras)}`, descricao: "Despesa", valor, mes, forma: "pix", paga: false, ...extras };
}

function entrada(mes: string, valor: number, recebida = false): Entrada {
  return { id: `e-${mes}-${valor}`, descricao: "Entrada", valor, mes, recebida };
}

describe("resumirMes", () => {
  it("fecha o mês nele mesmo: entradas − despesas", () => {
    const r = resumirMes(config, [despesa("2026-10", 3000)], [entrada("2026-10", 5000)], "2026-10");
    expect(r).toEqual({ mes: "2026-10", entradas: 5000, despesas: 3000, saldo: 2000, acumulado: 2000 });
  });

  it("mês sem dados fica zerado", () => {
    const r = resumirMes(config, [], [], "2026-11");
    expect(r).toEqual({ mes: "2026-11", entradas: 0, despesas: 0, saldo: 0, acumulado: 0 });
  });

  it("acumulado soma os meses anteriores ao saldo do mês", () => {
    const despesas = [despesa("2026-10", 3000), despesa("2026-11", 1000)];
    const entradas = [entrada("2026-10", 5000), entrada("2026-11", 1500)];
    const outubro = resumirMes(config, despesas, entradas, "2026-10");
    const novembro = resumirMes(config, despesas, entradas, "2026-11");
    expect(outubro.saldo).toBe(2000);
    expect(outubro.acumulado).toBe(2000);
    expect(novembro.saldo).toBe(500);
    expect(novembro.acumulado).toBe(2500);
  });

  it("meses futuros não entram no acumulado", () => {
    const r = resumirMes(
      config,
      [despesa("2026-10", 1000), despesa("2026-12", 9999)],
      [entrada("2026-10", 5000)],
      "2026-10"
    );
    expect(r.acumulado).toBe(4000);
  });

  it("lançamentos pagos/recebidos continuam contando no mês", () => {
    const r = resumirMes(
      config,
      [despesa("2026-10", 3000, { paga: true })],
      [entrada("2026-10", 5000, true)],
      "2026-10"
    );
    expect(r.despesas).toBe(3000);
    expect(r.entradas).toBe(5000);
    expect(r.saldo).toBe(2000);
  });
});

describe("consolidar", () => {
  it("vazio quando não há dados", () => {
    expect(consolidar(config, [], [])).toEqual([]);
  });

  it("lista só os meses com dados e acumula na sequência", () => {
    const lista = consolidar(
      config,
      [despesa("2026-10", 3000), despesa("2026-12", 1000)],
      [entrada("2026-12", 2000)]
    );
    expect(lista).toEqual([
      { mes: "2026-10", entradas: 0, despesas: 3000, saldo: -3000, acumulado: -3000 },
      { mes: "2026-12", entradas: 2000, despesas: 1000, saldo: 1000, acumulado: -2000 },
    ]);
  });

  it("ignora meses anteriores ao início de uso", () => {
    const lista = consolidar(config, [despesa("2026-08", 5000), despesa("2026-10", 3000)], []);
    expect(lista.map((r) => r.mes)).toEqual(["2026-10"]);
    expect(lista[0].acumulado).toBe(-3000);
  });
});

describe("agruparFaturas", () => {
  const cartoes: Cartao[] = [
    { id: "c1", nome: "Nubank", diaFechamento: 20, diaVencimento: 27 },
    { id: "c2", nome: "Itaú" },
  ];

  it("agrupa despesas de cartão por banco com total", () => {
    const faturas = agruparFaturas(
      [
        despesa("2026-10", 1000, { forma: "cartao", cartaoId: "c1" }),
        despesa("2026-10", 2500, { forma: "cartao", cartaoId: "c1" }),
        despesa("2026-10", 700, { forma: "cartao", cartaoId: "c2" }),
      ],
      cartoes
    );
    expect(faturas).toHaveLength(2);
    const nubank = faturas.find((f) => f.cartaoId === "c1");
    expect(nubank?.nome).toBe("Nubank");
    expect(nubank?.total).toBe(3500);
    expect(nubank?.despesas).toHaveLength(2);
    const itau = faturas.find((f) => f.cartaoId === "c2");
    expect(itau?.total).toBe(700);
  });

  it("despesas de pix/boleto não entram nas faturas", () => {
    const faturas = agruparFaturas(
      [despesa("2026-10", 1000, { forma: "pix" }), despesa("2026-10", 2000, { forma: "boleto" })],
      cartoes
    );
    expect(faturas).toEqual([]);
  });

  it("cartão sem cartão definido vira fatura 'Cartão'", () => {
    const faturas = agruparFaturas(
      [despesa("2026-10", 900, { forma: "cartao" })],
      cartoes
    );
    expect(faturas).toHaveLength(1);
    expect(faturas[0].cartaoId).toBe("");
    expect(faturas[0].nome).toBe("Cartão");
    expect(faturas[0].total).toBe(900);
  });

  it("ordena pelo maior total", () => {
    const faturas = agruparFaturas(
      [
        despesa("2026-10", 100, { forma: "cartao", cartaoId: "c1" }),
        despesa("2026-10", 900, { forma: "cartao", cartaoId: "c2" }),
      ],
      cartoes
    );
    expect(faturas.map((f) => f.cartaoId)).toEqual(["c2", "c1"]);
  });

  it("leva os dias de fechamento e vencimento da fatura do cartão", () => {
    const faturas = agruparFaturas(
      [despesa("2026-10", 1000, { forma: "cartao", cartaoId: "c1" })],
      cartoes
    );
    expect(faturas[0].diaFechamento).toBe(20);
    expect(faturas[0].diaVencimento).toBe(27);
  });

  it("cartão sem dias cadastrados não preenche fechamento/vencimento", () => {
    const faturas = agruparFaturas(
      [despesa("2026-10", 900, { forma: "cartao", cartaoId: "c2" })],
      cartoes
    );
    expect(faturas[0].diaFechamento).toBeUndefined();
    expect(faturas[0].diaVencimento).toBeUndefined();
  });
});

describe("diaVencimentoDespesa", () => {
  const cartoes: Cartao[] = [{ id: "c1", nome: "Nubank", diaFechamento: 20, diaVencimento: 27 }];

  it("despesa com dia próprio tem precedência", () => {
    expect(diaVencimentoDespesa(despesa("2026-11", 100, { vencimento: 5 }), cartoes)).toBe(5);
  });

  it("despesa de cartão herda o vencimento da fatura", () => {
    const d = despesa("2026-11", 100, { forma: "cartao", cartaoId: "c1" });
    expect(diaVencimentoDespesa(d, cartoes)).toBe(27);
  });

  it("despesa de cartão sem dia na fatura não gera vencimento", () => {
    const d = despesa("2026-11", 100, { forma: "cartao", cartaoId: "inexistente" });
    expect(diaVencimentoDespesa(d, cartoes)).toBeUndefined();
  });

  it("pix/boleto sem dia próprio não gera vencimento", () => {
    expect(diaVencimentoDespesa(despesa("2026-11", 100), cartoes)).toBeUndefined();
  });
});

describe("calcularAlertasVencimento", () => {
  const cartoes: Cartao[] = [
    { id: "c1", nome: "Nubank", diaFechamento: 20, diaVencimento: 10 },
    { id: "c2", nome: "Itaú", diaVencimento: 28 },
  ];
  const hoje = (iso: string) => () => new Date(`${iso}T12:00:00`);

  it("agrupa por data, soma o total e ordena do mais urgente", () => {
    const despesas = [
      despesa("2026-11", 5000, { vencimento: 12 }),
      despesa("2026-11", 3000, { vencimento: 12 }),
      despesa("2026-11", 100, { forma: "cartao", cartaoId: "c1" }), // dia 10
    ];
    const alertas = calcularAlertasVencimento(despesas, cartoes, "2026-11", hoje("2026-11-05"));
    expect(alertas.map((a) => a.data)).toEqual(["2026-11-10", "2026-11-12"]);
    expect(alertas[0].total).toBe(100);
    expect(alertas[1].total).toBe(8000);
    expect(alertas[1].despesas).toHaveLength(2);
  });

  it("classifica urgência por dias restantes", () => {
    const despesas = [
      despesa("2026-11", 100, { vencimento: 4 }),  // vencida ontem
      despesa("2026-11", 100, { vencimento: 5 }),  // hoje
      despesa("2026-11", 100, { vencimento: 6 }),  // amanhã
      despesa("2026-11", 100, { vencimento: 20 }), // próximos
    ];
    const alertas = calcularAlertasVencimento(despesas, cartoes, "2026-11", hoje("2026-11-05"));
    expect(alertas.map((a) => a.urgencia)).toEqual(["vencida", "hoje", "amanha", "proximos"]);
    expect(alertas[0].dias).toBe(-1);
  });

  it("ignora despesas pagas e sem vencimento", () => {
    const despesas = [
      despesa("2026-11", 100, { vencimento: 10, paga: true }),
      despesa("2026-11", 100),
    ];
    expect(calcularAlertasVencimento(despesas, cartoes, "2026-11", hoje("2026-11-05"))).toEqual([]);
  });

  it("dia 31 em fevereiro vira 28", () => {
    const despesas = [despesa("2027-02", 100, { vencimento: 31 })];
    const alertas = calcularAlertasVencimento(despesas, cartoes, "2027-01", hoje("2027-01-31"));
    expect(alertas[0].data).toBe("2027-02-28");
  });

  it("despesa de mês passado cai no mês de referência", () => {
    const despesas = [despesa("2026-10", 100, { forma: "cartao", cartaoId: "c2" })]; // vence 28
    const alertas = calcularAlertasVencimento(despesas, cartoes, "2026-11", hoje("2026-11-05"));
    // A fatura do mês passado vence 28/11.
    expect(alertas[0].data).toBe("2026-11-28");
    expect(alertas[0].urgencia).toBe("proximos");
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

describe("simularEconomia", () => {
  it("sem rendimento: depósito mensal é valor-alvo ÷ meses, acumulando mês a mês", () => {
    const s = simularEconomia(120000, 12, "2026-11");
    expect(s.depositoMensal).toBe(10000);
    expect(s.meses).toHaveLength(12);
    expect(s.meses[0]).toEqual({ mes: "2026-11", deposito: 10000, rendimento: 0, acumulado: 10000 });
    expect(s.meses[11]).toEqual({ mes: "2027-10", deposito: 10000, rendimento: 0, acumulado: 120000 });
    expect(s.mesFinal).toBe("2027-10");
    expect(s.total).toBe(120000);
  });

  it("diferença de centavos vai na última parcela", () => {
    const s = simularEconomia(10000, 3, "2026-11");
    expect(s.meses.map((m) => m.deposito)).toEqual([3333, 3333, 3334]);
    expect(s.total).toBe(10000);
  });

  it("com rendimento, acumulado compõe e o total supera o alvo", () => {
    const s = simularEconomia(100000, 2, "2026-11", 0.01);
    expect(s.meses[0]).toEqual({ mes: "2026-11", deposito: 50000, rendimento: 0, acumulado: 50000 });
    expect(s.meses[1].rendimento).toBe(500);
    expect(s.total).toBe(100500);
  });

  it("um único mês deposita o valor inteiro", () => {
    const s = simularEconomia(50000, 1, "2026-11");
    expect(s.meses).toHaveLength(1);
    expect(s.meses[0].deposito).toBe(50000);
    expect(s.total).toBe(50000);
  });

  it("atravessa a virada do ano", () => {
    const s = simularEconomia(10000, 3, "2026-11");
    expect(s.meses.map((m) => m.mes)).toEqual(["2026-11", "2026-12", "2027-01"]);
  });
});
