// Utilitários de mês ("2026-10") e moeda (centavos).

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function mesAtual(): string {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

export function mesValido(mes: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);
}

/** "2026-10" -> "Outubro de 2026" */
export function nomeMes(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  const nome = MESES[m - 1] ?? "";
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${ano}`;
}

/** "2026-10" -> "Outubro/2026" */
export function nomeMesAno(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  const nome = MESES[m - 1] ?? "";
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)}/${ano}`;
}

/** "2026-10" -> "Outubro" */
export function nomeMesCurto(mes: string): string {
  const [, m] = mes.split("-").map(Number);
  const nome = MESES[m - 1] ?? "";
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)}`;
}

export function somarMes(mes: string, delta: number): string {
  const [ano, m] = mes.split("-").map(Number);
  const data = new Date(ano, m - 1 + delta, 1);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

export function compararMeses(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function diferencaMeses(a: string, b: string): number {
  const [anoA, mesA] = a.split("-").map(Number);
  const [anoB, mesB] = b.split("-").map(Number);
  return (anoB - anoA) * 12 + (mesB - mesA);
}

/** Dia do mês válido (1–31) para fechamento/vencimento. */
export function diaValido(dia: number): boolean {
  return Number.isInteger(dia) && dia >= 1 && dia <= 31;
}

/** Quantos dias tem o mês ("2026-02" → 28). */
export function diasNoMes(mes: string): number {
  const [ano, m] = mes.split("-").map(Number);
  return new Date(ano, m, 0).getDate();
}

/**
 * Data real de um dia de vencimento no mês: dia 31 em fevereiro vira 28
 * (mesma regra de fatura de cartão). Retorna "AAAA-MM-DD".
 */
export function dataVencimento(mes: string, dia: number): string {
  const [ano, m] = mes.split("-").map(Number);
  const diaReal = Math.min(dia, diasNoMes(mes));
  return `${ano}-${String(m).padStart(2, "0")}-${String(diaReal).padStart(2, "0")}`;
}

/** Dias entre hoje e a data "AAAA-MM-DD" (negativo = já passou). */
export function diasAte(dataISO: string): number {
  return diasAteData(dataISO, () => new Date());
}

/** Igual a `diasAte`, com a data de "hoje" injetável para testes. */
export function diasAteData(dataISO: string, hoje: () => Date): number {
  const agora = hoje();
  const hojeISO = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
  return Math.round((Date.parse(dataISO) - Date.parse(hojeISO)) / 86400000);
}

/** 123456 (centavos) -> "R$ 1.234,56" */
export function formatarMoeda(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavos / 100);
}

/** "1.234,56" | "1234,56" | "1234.56" -> 123456 (centavos) */
export function parseMoeda(texto: string): number {
  const limpo = texto.replace(/[^\d,.-]/g, "").trim();
  if (!limpo) return NaN;
  // pt-BR: ponto como milhar, vírgula como decimal
  const normalizado =
    limpo.includes(",") && limpo.lastIndexOf(",") > limpo.lastIndexOf(".")
      ? limpo.replace(/\./g, "").replace(",", ".")
      : limpo.replace(/,/g, "");
  const valor = Number(normalizado);
  return Number.isFinite(valor) ? Math.round(valor * 100) : NaN;
}

/** 123456 (centavos) -> "1.234,56" (sem prefixo; para máscara de campo) */
export function formatarNumero(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}

/**
 * Máscara bancária: extrai só os dígitos, interpreta os 2 últimos como
 * centavos e devolve texto formatado + valor em centavos.
 * "1234" -> { texto: "12,34", centavos: 1234 }
 */
export function aplicarMascaraMoeda(texto: string): { texto: string; centavos: number } {
  const digitos = texto.replace(/\D/g, "").slice(0, 11);
  const centavos = Number(digitos || 0);
  return { texto: digitos ? formatarNumero(centavos) : "", centavos };
}

/** Divide um total em centavos em n parcelas, diferença na última. */
export function dividirParcelas(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const resto = total - base * n;
  return Array.from({ length: n }, (_, i) =>
    i === n - 1 ? base + resto : base
  );
}
