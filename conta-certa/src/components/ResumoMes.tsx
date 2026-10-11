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
  cor: "inicio" | "entrada" | "despesa" | "atual";
}) {
  const classes = {
    inicio: "text-foreground",
    entrada: "text-entrada",
    despesa: "text-despesa",
    atual: (valor: number) => (valor < 0 ? "text-despesa" : "text-previsao"),
  } as const;

  return (
    <div className="flex min-w-0 flex-col gap-1 p-3">
      <span className="text-rotulo font-medium uppercase tracking-wide text-foreground/50">
        {rotulo}
      </span>
      <span
        className={`truncate text-base font-semibold tabular-nums ${
          cor === "atual" ? classes.atual(valor) : classes[cor]
        }`}
      >
        {formatarBRL(valor)}
      </span>
    </div>
  );
}

/**
 * Header do mês: Saldo no início + Entradas − Despesas = Saldo atual.
 * 2×2 no celular, uma linha a partir de sm.
 */
export function ResumoMesHeader({ resumo }: ResumoMesHeaderProps) {
  const saldoAtual = resumo.saldoInicio + resumo.entradas - resumo.despesas;
  return (
    <section
      aria-label="Resumo do mês"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-borda sm:grid-cols-4"
    >
      <div className="bg-surface">
        <Celula rotulo="Início do mês" valor={resumo.saldoInicio} cor="inicio" />
      </div>
      <div className="bg-surface">
        <Celula rotulo="Entradas" valor={resumo.entradas} cor="entrada" />
      </div>
      <div className="bg-surface">
        <Celula rotulo="Despesas" valor={resumo.despesas} cor="despesa" />
      </div>
      <div className="bg-surface">
        <Celula rotulo="Saldo atual" valor={saldoAtual} cor="atual" />
      </div>
    </section>
  );
}
