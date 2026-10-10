"use client";

import { formatarMoeda } from "@/lib/mes";
import type { ResumoMes } from "@/lib/calculo";

/** Os três números: Saldo (preto), Despesas (vermelho), Previsão (verde). */
export function TresNumeros({ resumo, mesAtual }: { resumo: ResumoMes; mesAtual: boolean }) {
  const rotuloSaldo = mesAtual ? "Saldo" : "Previsão no início";
  return (
    <section
      aria-label="Resumo do mês"
      className="grid grid-cols-3 divide-x divide-borda rounded-2xl bg-surface shadow-sm"
    >
      <div className="flex flex-col gap-1 p-3">
        <span className="text-[11px] font-medium uppercase tracking-wide text-foreground/50">
          {rotuloSaldo}
        </span>
        <span
          className={`text-base font-semibold tabular-nums sm:text-lg ${
            resumo.saldo < 0 ? "text-despesa" : "text-foreground"
          }`}
        >
          {formatarMoeda(resumo.saldo)}
        </span>
      </div>
      <div className="flex flex-col gap-1 p-3">
        <span className="text-[11px] font-medium uppercase tracking-wide text-foreground/50">
          Despesas
        </span>
        <span className="text-base font-semibold tabular-nums text-despesa sm:text-lg">
          {formatarMoeda(resumo.despesas)}
        </span>
      </div>
      <div className="flex flex-col gap-1 p-3">
        <span className="text-[11px] font-medium uppercase tracking-wide text-foreground/50">
          Previsão
        </span>
        <span
          className={`text-base font-semibold tabular-nums sm:text-lg ${
            resumo.previsao < 0 ? "text-despesa" : "text-previsao"
          }`}
        >
          {formatarMoeda(resumo.previsao)}
        </span>
      </div>
    </section>
  );
}
