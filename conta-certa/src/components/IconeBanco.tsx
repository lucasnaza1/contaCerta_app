"use client";

// Import direto do core (via alias no next.config): o barrel principal
// reexporta um componente Vue, que quebraria o bundle React.
import { listarBancos, svgBanco } from "@edusites/bancos-brasil/src/core.js";

const BANCOS = listarBancos();

/** "Banco do Brasil" -> "bancodobrasil", "Itaú" -> "itau". */
function normalizar(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Chave do banco reconhecida no nome (exato ou contido, ex.: "Cartão Nubank"). */
function chaveBanco(nome: string): string | null {
  const n = normalizar(nome);
  if (!n) return null;
  if (BANCOS.includes(n)) return n;
  return BANCOS.find((b) => n.includes(b)) ?? null;
}

/** SVG do banco já no tamanho pedido (inline, funciona offline), ou null. */
export function svgBancoPorNome(nome: string, tamanho = 44): string | null {
  const chave = chaveBanco(nome);
  return chave ? svgBanco({ nome: chave, tamanho, formato: "quadrado" }) : null;
}

interface IconeBancoProps {
  nome: string;
  tamanho?: number;
  className?: string;
}

/** Ícone do banco quando o nome do cartão combinar (ex.: "Nubank"). */
export function IconeBanco({ nome, tamanho = 24, className = "" }: IconeBancoProps) {
  const svg = svgBancoPorNome(nome, tamanho);
  if (!svg) return null;
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 leading-none ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
