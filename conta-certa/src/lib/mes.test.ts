import { describe, expect, it } from "vitest";
import { compararMeses, diferencaMeses, dividirParcelas, somarMes } from "./mes";

describe("dividirParcelas", () => {
  it("R$ 100,00 em 3x vira 33,33 + 33,33 + 33,34", () => {
    expect(dividirParcelas(10000, 3)).toEqual([3333, 3333, 3334]);
  });

  it("a soma das parcelas é sempre o total", () => {
    for (const [total, n] of [
      [10000, 3],
      [9999, 7],
      [123456, 4],
      [1, 5],
    ] as const) {
      expect(dividirParcelas(total, n).reduce((s, v) => s + v, 0)).toBe(total);
    }
  });

  it("divisão exata não gera diferença", () => {
    expect(dividirParcelas(9000, 3)).toEqual([3000, 3000, 3000]);
  });

  it("parcela única devolve o total", () => {
    expect(dividirParcelas(12345, 1)).toEqual([12345]);
  });
});

describe("somarMes / compararMeses / diferencaMeses", () => {
  it("somarMes vira o ano corretamente", () => {
    expect(somarMes("2026-11", 1)).toBe("2026-12");
    expect(somarMes("2026-12", 1)).toBe("2027-01");
    expect(somarMes("2027-01", -1)).toBe("2026-12");
    expect(somarMes("2026-10", 14)).toBe("2027-12");
  });

  it("compararMeses ordena lexicograficamente", () => {
    expect(compararMeses("2026-09", "2026-10")).toBeLessThan(0);
    expect(compararMeses("2026-10", "2026-10")).toBe(0);
    expect(compararMeses("2027-01", "2026-12")).toBeGreaterThan(0);
  });

  it("diferencaMeses atravessa anos", () => {
    expect(diferencaMeses("2026-10", "2026-10")).toBe(0);
    expect(diferencaMeses("2026-10", "2027-01")).toBe(3);
    expect(diferencaMeses("2027-01", "2026-10")).toBe(-3);
  });
});
