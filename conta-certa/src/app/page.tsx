"use client";

import { useState } from "react";
import Link from "next/link";
import { Abas } from "@/components/Abas";
import { CadastroInicial } from "@/components/CadastroInicial";
import { ChecklistMes } from "@/components/ChecklistMes";
import { TresNumeros } from "@/components/TresNumeros";
import { resumirMes } from "@/lib/calculo";
import { mesAtual, mesValido, nomeMesAno, somarMes } from "@/lib/mes";
import { useDados } from "@/lib/useDados";

export default function PaginaMes() {
  const { carregando, config, cartoes, despesas, entradas } = useDados();
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

  const resumo = resumirMes(config, despesas, entradas, mes, mesRef);

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
            <span aria-hidden className="text-xl">
              ‹
            </span>
          </button>
          <h1 className="text-lg font-bold">{nomeMesAno(mes)}</h1>
          <button
            type="button"
            onClick={() => setMes(somarMes(mes, 1))}
            aria-label={`Próximo mês, ${nomeMesAno(somarMes(mes, 1))}`}
            className="botao-min flex items-center justify-center rounded-full hover:bg-foreground/5"
          >
            <span aria-hidden className="text-xl">
              ›
            </span>
          </button>
        </nav>

        <div className="flex flex-col gap-4">
          <TresNumeros resumo={resumo} mesAtual={mes === mesRef} />
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
        className="fixed right-5 bottom-24 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-previsao text-3xl font-light text-white shadow-lg hover:opacity-90 md:right-[max(1.25rem,calc(50%-16rem))] md:translate-x-4"
      >
        <span aria-hidden>＋</span>
      </Link>

      <Abas />
    </div>
  );
}
