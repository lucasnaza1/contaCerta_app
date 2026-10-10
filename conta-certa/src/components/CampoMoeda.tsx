"use client";

import { formatarNumero } from "@/lib/mes";

interface CampoMoedaProps {
  id: string;
  rotulo: string;
  valorCentavos: number;
  onValor: (centavos: number) => void;
  placeholder?: string;
  disabled?: boolean;
  invalido?: boolean;
  className?: string;
  descricao?: string;
}

/**
 * Campo monetário estilo banco/Pix: o usuário digita só números e a vírgula
 * aparece sozinha ("1234" vira "12,34"). O valor já sai em centavos.
 */
export function CampoMoeda({
  id,
  rotulo,
  valorCentavos,
  onValor,
  placeholder = "0,00",
  disabled,
  invalido,
  className = "",
  descricao,
}: CampoMoedaProps) {
  const texto = valorCentavos > 0 ? formatarNumero(valorCentavos) : "";

  function aoDigitar(bruto: string) {
    const digitos = bruto.replace(/\D/g, "").slice(0, 11);
    onValor(Number(digitos || 0));
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {rotulo}
      </label>
      <div
        className={`flex items-center gap-1 rounded-xl border bg-campo px-4 py-2.5 focus-within:border-previsao focus-within:ring-2 focus-within:ring-menta ${
          invalido ? "border-despesa" : "border-borda"
        }`}
      >
        <span aria-hidden className="text-[15px] font-semibold text-foreground/50">
          R$
        </span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          value={texto}
          onChange={(e) => aoDigitar(e.target.value)}
          placeholder={placeholder}
          aria-invalid={invalido || undefined}
          aria-describedby={descricao ? `${id}-descricao` : undefined}
          className="botao-min w-full min-w-0 bg-transparent text-[15px] font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-foreground/45"
        />
      </div>
      {descricao && (
        <p id={`${id}-descricao`} className="text-xs text-foreground/50">
          {descricao}
        </p>
      )}
    </div>
  );
}
