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

/** Divide um total em centavos em n parcelas, diferença na última. */
export function dividirParcelas(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const resto = total - base * n;
  return Array.from({ length: n }, (_, i) =>
    i === n - 1 ? base + resto : base
  );
}
