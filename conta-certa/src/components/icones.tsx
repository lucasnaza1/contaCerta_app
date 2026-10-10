import type { Forma } from "@/lib/types";

type Props = { className?: string };

function base(className?: string) {
  return {
    className: className ?? "h-5 w-5",
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

/** Entrada / adição */
export function IconeEntrada({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** Boleto (código de barras) */
export function IconeBoleto({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M4 5v14M7 5v14M10 5v10M13 5v14M16 5v10M20 5v14" />
    </svg>
  );
}

/** Cartão de crédito */
export function IconeCartao({ className }: Props) {
  return (
    <svg {...base(className)}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 9.5h19M6 15h4" />
    </svg>
  );
}

/** Pix (seta em losango, aproximação do símbolo oficial) */
export function IconePix({ className }: Props) {
  return (
    <svg {...base(className)} strokeWidth={1.6}>
      <path d="M12 2.8 21.2 12 12 21.2 2.8 12 12 2.8Z" />
      <path d="M8.4 8.4a5 5 0 0 1 7.2 0M8.4 15.6a5 5 0 0 0 7.2 0" />
      <path d="m9.5 9.5 2.5 2.5 2.5-2.5" />
    </svg>
  );
}

export function IconeForma({ forma, className }: { forma: Forma } & Props) {
  switch (forma) {
    case "pix":
      return <IconePix className={className} />;
    case "boleto":
      return <IconeBoleto className={className} />;
    case "cartao":
      return <IconeCartao className={className} />;
  }
}
