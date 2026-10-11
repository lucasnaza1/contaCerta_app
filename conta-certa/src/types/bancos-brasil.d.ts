declare module "@edusites/bancos-brasil/src/core.js" {
  export interface OpcoesSvgBanco {
    nome: string;
    cor?: string;
    fundo?: string;
    formato?: "quadrado" | "circulo" | "sem";
    tamanho?: number;
    className?: string;
  }

  /** Gera o SVG inline do banco (síncrono, sem rede) ou null se desconhecido. */
  export function svgBanco(opcoes: OpcoesSvgBanco): string | null;
  export function listarBancos(): string[];
  export function obterPreset(nome: string): {
    cor: string;
    fundo: string;
    formato: string;
    tamanho: number;
  } | null;
}
