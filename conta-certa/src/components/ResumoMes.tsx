"use client";

import { formatarBRL } from "@/lib/dinheiro";
import type { ResumoMes } from "@/lib/calculos";

interface ResumoMesHeaderProps {
  resumo: ResumoMes;
}

function Celula({
  rotulo,
  valor,
  cor,
}: {
  rotulo: string;
  valor: number;
  cor: "entrada" | "despesa" | "saldo";
}) {
  const classe =
    cor === "saldo"
      ? valor < 0
        ? "text-despesa"
        : "text-previsao"
      : cor === "entrada"
        ? "text-entrada"
        : "text-despesa";
  return (
    <div className="flex min-w-0 flex-col gap-1 p-3">
      <span className="text-rotulo font-medium uppercase tracking-wide text-foreground/50">
        {rotulo}
      </span>
      <span className={`truncate text-base font-semibold tabular-nums ${classe}`}>
        {formatarBRL(valor)}
      </span>
    </div>
  );
}

/**
 * Header do mês: Entradas − Despesas = Saldo do mês, e abaixo o acumulado
 * (soma dos saldos do início de uso até este mês).
 */
export function ResumoMesHeader({ resumo }: ResumoMesHeaderProps) {
  return (
    <section aria-label="Resumo do mês" className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-borda">
        <div className="bg-surface">
          <Celula rotulo="Entradas" valor={resumo.entradas} cor="entrada" />
        </div>
        <div className="bg-surface">
          <Celula rotulo="Despesas" valor={resumo.despesas} cor="despesa" />
        </div>
        <div className="bg-surface">
          <Celula rotulo="Saldo do mês" valor={resumo.saldo} cor="saldo" />
        </div>
      </div>
      <p className="flex items-baseline justify-between gap-2 rounded-2xl bg-surface px-4 py-2 text-sm shadow-sm">
        <span className="text-foreground/60">
          Acumulado até aqui
          <span className="block text-xs text-foreground/45">
            Saldo deste mês + meses anteriores
          </span>
        </span>
        <span
          className={`shrink-0 text-base font-bold tabular-nums ${
            resumo.acumulado < 0 ? "text-despesa" : "text-previsao"
          }`}
        >
          {formatarBRL(resumo.acumulado)}
        </span>
      </p>
    </section>
  );
}
