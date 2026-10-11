"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Abas } from "@/components/Abas";
import { AguaNivel } from "@/components/AguaNivel";
import { CadastroInicial } from "@/components/CadastroInicial";
import { ChecklistMes } from "@/components/ChecklistMes";
import { ResumoMesHeader } from "@/components/ResumoMes";
import { resumirMes } from "@/lib/calculos";
import { mesAtual, mesValido, nomeMesAno, somarMes } from "@/lib/mes";
import { useDados } from "@/lib/useDados";
import { useUltimoBackup } from "@/lib/useUltimoBackup";

export default function PaginaMes() {
  const { carregando, config, cartoes, despesas, entradas } = useDados();
  const { diasSemBackup } = useUltimoBackup();
  const mesRef = mesAtual();
  // Abre no mês passado pela URL (ex.: vindo da tela Meses).
  const [mes, setMes] = useState(() => {
    if (typeof window === "undefined") return mesRef;
    const m = new URLSearchParams(window.location.search).get("mes");
    return m && mesValido(m) ? m : mesRef;
  });

  if (carregando) {
    return (
      <div className="flex flex-1 items-center justify-center" role="status" aria-label="Carregando">
        <p className="animate-pulse text-sm text-foreground/50">Carregando…</p>
      </div>
    );
  }

  if (!config) {
    return (
      <CadastroInicial
        onPronto={() => {
          /* useLiveQuery reage à gravação da config e re-renderiza */
        }}
      />
    );
  }

  const resumo = resumirMes(config, despesas, entradas, mes);
  // Proporção gasta da previsão do mês, para o nível da água.
  const base = resumo.saldoInicio + resumo.entradas;
  const proporcaoGasta = base > 0 ? resumo.despesas / base : 1;
  const disponivel = resumo.previsao;

  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-28">
        <nav aria-label="Trocar mês" className="flex items-center justify-between pb-4">
          <button
            type="button"
            onClick={() => setMes(somarMes(mes, -1))}
            aria-label={`Mês anterior, ${nomeMesAno(somarMes(mes, -1))}`}
            className="botao-min flex items-center justify-center rounded-full hover:bg-foreground/5"
          >
            <ChevronLeft aria-hidden className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold">{nomeMesAno(mes)}</h1>
          <button
            type="button"
            onClick={() => setMes(somarMes(mes, 1))}
            aria-label={`Próximo mês, ${nomeMesAno(somarMes(mes, 1))}`}
            className="botao-min flex items-center justify-center rounded-full hover:bg-foreground/5"
          >
            <ChevronRight aria-hidden className="h-6 w-6" />
          </button>
        </nav>

        <div className="flex flex-col gap-4">
          <ResumoMesHeader resumo={resumo} />
          {!resumo.historico && (
            <AguaNivel proporcao={proporcaoGasta} valor={disponivel} />
          )}
          {resumo.historico && (
            <p className="rounded-xl bg-surface px-4 py-2 text-xs text-foreground/60 shadow-sm">
              Mês anterior ao início de uso ({nomeMesAno(config.mesInicial)}). Os lançamentos
              ficam registrados como histórico e não contam no saldo.
            </p>
          )}
          {diasSemBackup >= 30 && (
            <p className="rounded-xl bg-surface px-4 py-2 text-xs text-foreground/60 shadow-sm">
              Faz {diasSemBackup === Infinity ? "tempo" : `${diasSemBackup} dias`} que você não
              exporta um backup. Toque em Ajustes → Backup para não perder seus dados.
            </p>
          )}
          <ChecklistMes
            mes={mes}
            mesRef={mesRef}
            despesas={despesas}
            entradas={entradas}
            cartoes={cartoes}
          />
        </div>
      </main>

      <Link
        href={`/adicionar?mes=${mes}`}
        aria-label="Adicionar despesa ou entrada"
        className="fixed right-5 bottom-24 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-previsao text-white shadow-lg hover:opacity-90 md:right-[max(1.25rem,calc(50%-16rem))] md:translate-x-4"
      >
        <Plus aria-hidden className="h-7 w-7" strokeWidth={2.5} />
      </Link>

      <Abas />
    </div>
  );
}
