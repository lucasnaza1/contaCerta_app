"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { Abas } from "@/components/Abas";
import { IconeBanco } from "@/components/IconeBanco";
import { agruparFaturas, consolidar } from "@/lib/calculos";
import { formatarBRL } from "@/lib/dinheiro";
import { nomeMesAno } from "@/lib/mes";
import { useDados } from "@/lib/useDados";

export default function PaginaMeses() {
  const { carregando, config, cartoes, despesas, entradas } = useDados();
  const [mesAberto, setMesAberto] = useState<string | null>(null);

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
            {resumos.map((r) => {
              const aberto = mesAberto === r.mes;
              const faturas = agruparFaturas(
                despesas.filter((d) => d.mes === r.mes),
                cartoes
              );
              return (
                <li key={r.mes} className="rounded-2xl bg-surface shadow-sm">
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/?mes=${r.mes}`}
                      className="botao-min min-w-0 flex-1 p-4"
                      aria-label={`Abrir ${nomeMesAno(r.mes)}`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <h2 className="text-[15px] font-bold">{nomeMesAno(r.mes)}</h2>
                        <span
                          className={`text-[15px] font-semibold tabular-nums ${
                            r.saldo < 0 ? "text-despesa" : "text-previsao"
                          }`}
                        >
                          {formatarBRL(r.saldo)}
                        </span>
                      </div>
                      <p
                        className={`pt-0.5 text-right text-xs font-medium tabular-nums ${
                          r.acumulado < 0 ? "text-despesa" : "text-previsao/80"
                        }`}
                      >
                        acumulado: {formatarBRL(r.acumulado)}
                      </p>

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
                    {faturas.length > 0 && (
                      <BotaoExpandir
                        aberto={aberto}
                        onClick={() => setMesAberto(aberto ? null : r.mes)}
                        rotulo={`Faturas de ${nomeMesAno(r.mes)}`}
                      />
                    )}
                  </div>

                  <AnimatePresence initial={false}>
                    {aberto && faturas.length > 0 && (
                      <motion.div
                        key="faturas"
                        initial={false}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <ul className="flex list-none flex-col gap-1 px-4 pb-4">
                          {faturas.map((f) => (
                            <li
                              key={f.cartaoId || "sem-cartao"}
                              className="flex min-w-0 items-center gap-2 rounded-xl bg-background/50 px-3 py-2"
                            >
                              <IconeBanco nome={f.nome} tamanho={20} className="rounded-[4px]" />
                              <span className="min-w-0 flex-1 truncate text-sm">{f.nome}</span>
                              <span className="shrink-0 text-sm font-semibold tabular-nums text-despesa">
                                {formatarBRL(f.total)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <Abas />
    </div>
  );
}

function BotaoExpandir({
  aberto,
  onClick,
  rotulo,
}: {
  aberto: boolean;
  onClick: () => void;
  rotulo: string;
}) {
  const semMovimento = useReducedMotion();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={aberto}
      aria-label={rotulo}
      className="botao-min m-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-foreground/50 hover:bg-foreground/5"
    >
      <motion.span
        aria-hidden
        animate={{ rotate: aberto ? 180 : 0 }}
        transition={semMovimento ? { duration: 0 } : { duration: 0.2 }}
      >
        <ChevronDown className="h-5 w-5" />
      </motion.span>
    </button>
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
