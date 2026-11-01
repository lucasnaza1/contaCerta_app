"use client";

import { aplicarMascaraMoeda, formatarNumero } from "@/lib/mes";

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
 * Campo de dinheiro com máscara bancária pt-BR: os 2 últimos dígitos
 * digitados são os centavos ("100" -> "1,00"), então não é preciso tocar
 * na vírgula. O texto é derivado de `centavos` (sem estado local).
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
      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[15px] font-semibold tabular-nums text-foreground/50"
        >
          R$
        </span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          autoFocus={autoFocus}
          value={centavos ? formatarNumero(centavos) : ""}
          onChange={(e) => {
            const { centavos: novo } = aplicarMascaraMoeda(e.target.value);
            onCentavos(novo);
          }}
          placeholder="0,00"
          aria-invalid={!!erro || undefined}
          aria-describedby={erro ? `${id}-erro` : descricao ? `${id}-descricao` : undefined}
          className={`botao-min w-full min-w-0 rounded-xl border bg-campo py-2.5 pr-4 pl-14 text-[15px] font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-foreground/45 focus:border-previsao focus:ring-2 focus:ring-menta ${
            erro ? "border-despesa" : "border-borda"
          }`}
        />
      </div>
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
