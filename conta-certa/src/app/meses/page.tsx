"use client";

import Link from "next/link";
import { Abas } from "@/components/Abas";
import { consolidar } from "@/lib/calculos";
import { formatarBRL } from "@/lib/dinheiro";
import { nomeMesAno } from "@/lib/mes";
import { useDados } from "@/lib/useDados";

export default function PaginaMeses() {
  const { carregando, config, despesas, entradas } = useDados();

  if (carregando) {
    return (
      <div className="flex flex-1 items-center justify-center" role="status" aria-label="Carregando">
        <p className="animate-pulse text-sm text-foreground/50">Carregando…</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex flex-1 flex-col">
        <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-6">
          <h1 className="pb-4 text-lg font-bold">Meses</h1>
          <p className="text-sm text-foreground/60">
            Faça o cadastro inicial na tela Mês para começar.
          </p>
        </main>
        <Abas />
      </div>
    );
  }

  const resumos = consolidar(config, despesas, entradas);
  const maxBarra = Math.max(
    1,
    ...resumos.map((r) => Math.max(r.entradas, r.despesas))
  );

  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-6">
        <h1 className="pb-4 text-lg font-bold">Meses</h1>

        {resumos.length === 0 ? (
          <p className="py-8 text-center text-sm text-foreground/50">
            Adicione lançamentos para ver o consolidado por mês.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {resumos.map((r) => (
              <li key={r.mes}>
                <Link
                  href={`/?mes=${r.mes}`}
                  className="block rounded-2xl bg-surface p-4 shadow-sm transition-colors hover:bg-menta/10"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-[15px] font-bold">{nomeMesAno(r.mes)}</h2>
                    <span
                      className={`text-[15px] font-semibold tabular-nums ${
                        r.previsao < 0 ? "text-despesa" : "text-previsao"
                      }`}
                    >
                      {formatarBRL(r.previsao)}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-col gap-1" aria-hidden>
                    <Barra valor={r.entradas} max={maxBarra} cor="bg-previsao" />
                    <Barra valor={r.despesas} max={maxBarra} cor="bg-despesa" />
                  </div>

                  <dl className="mt-2 flex justify-between gap-4 text-xs text-foreground/60">
                    <div className="flex items-center gap-1.5">
                      <span aria-hidden className="h-2 w-2 rounded-full bg-previsao" />
                      <dt className="sr-only">Entradas</dt>
                      <dd className="tabular-nums">{formatarBRL(r.entradas)}</dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span aria-hidden className="h-2 w-2 rounded-full bg-despesa" />
                      <dt className="sr-only">Despesas</dt>
                      <dd className="tabular-nums">{formatarBRL(r.despesas)}</dd>
                    </div>
                  </dl>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Abas />
    </div>
  );
}

function Barra({ valor, max, cor }: { valor: number; max: number; cor: string }) {
  const largura = Math.round((valor / max) * 100);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/10">
      <div className={`h-full rounded-full ${cor}`} style={{ width: `${largura}%` }} />
    </div>
  );
}
