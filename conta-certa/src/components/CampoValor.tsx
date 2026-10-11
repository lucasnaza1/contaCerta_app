"use client";

import { NumericFormat } from "react-number-format";

interface CampoValorProps {
  id: string;
  label: string;
  /** Valor em centavos. */
  centavos: number;
  onCentavos: (centavos: number) => void;
  erro?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  descricao?: string;
  /** Classes extras para o contêiner (largura etc.). */
  className?: string;
}

/**
 * Campo de dinheiro com máscara pt-BR: prefixo "R$ ", milhar ".", decimal ",",
 * 2 casas fixas, sem negativos. Entrega o valor **em centavos**.
 */
export function CampoValor({
  id,
  label,
  centavos,
  onCentavos,
  erro,
  autoFocus,
  disabled,
  descricao,
  className,
}: CampoValorProps) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <NumericFormat
        id={id}
        value={centavos ? centavos / 100 : ""}
        onValueChange={(valores) => {
          // floatValue pode ser undefined quando o campo é esvaziado.
          onCentavos(Math.round((valores.floatValue ?? 0) * 100));
        }}
        thousandSeparator="."
        decimalSeparator=","
        prefix="R$ "
        decimalScale={2}
        fixedDecimalScale
        allowNegative={false}
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder="R$ 0,00"
        aria-invalid={!!erro || undefined}
        aria-describedby={erro ? `${id}-erro` : descricao ? `${id}-descricao` : undefined}
        className={`botao-min w-full min-w-0 rounded-xl border bg-campo px-4 py-2.5 text-[15px] font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-foreground/45 focus:border-previsao focus:ring-2 focus:ring-menta ${
          erro ? "border-despesa" : "border-borda"
        }`}
      />
      {descricao && !erro && (
        <p id={`${id}-descricao`} className="text-xs text-foreground/50">
          {descricao}
        </p>
      )}
      {erro && (
        <p id={`${id}-erro`} className="text-xs text-despesa">
          {erro}
        </p>
      )}
    </div>
  );
}
