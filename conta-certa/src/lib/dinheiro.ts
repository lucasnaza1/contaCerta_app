/** Conversão de centavos <-> texto em pt-BR. Usar em todo lugar que aparece dinheiro. */

/** 123456 -> 1234.56 (para NumericFormat) */
export function centavosParaReais(centavos: number): number {
  return centavos / 100;
}

/** 123456 -> "R$ 1.234,56" */
export function formatarBRL(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavos / 100);
}

/** 123456 -> "1.234,56" (sem prefixo, para máscara de campo) */
export function formatarNumero(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}
