"use client";

import { AlertTriangle, BellRing, CalendarClock } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import type { AlertaVencimento, UrgenciaAlerta } from "@/lib/calculos";
import { formatarBRL } from "@/lib/dinheiro";
import { nomeMesCurto } from "@/lib/mes";

interface AlertasVencimentoProps {
  alertas: AlertaVencimento[];
}

const ESTILO_URGENCIA: Record<UrgenciaAlerta, { rotulo: (dias: number) => string; classe: string }> = {
  vencida: {
    rotulo: () => "vencida",
    classe: "border-despesa bg-despesa/10 text-despesa",
  },
  hoje: {
    rotulo: () => "vence hoje",
    classe: "border-despesa bg-despesa/10 text-despesa",
  },
  amanha: {
    rotulo: () => "vence amanhã",
    classe: "border-coral bg-coral/10 text-coral",
  },
  proximos: {
    rotulo: (dias) => `em ${dias} dias`,
    classe: "border-previsao/40 bg-previsao/5 text-previsao",
  },
};

/** Cartão de alertas de vencimento do mês de referência para frente. */
export function AlertasVencimento({ alertas }: AlertasVencimentoProps) {
  const semMovimento = useReducedMotion();
  if (alertas.length === 0) return null;

  const vencidas = alertas.filter((a) => a.dias < 0);
  const temCritico = alertas.some((a) => a.dias <= 1);
  const Icone = vencidas.length > 0 ? AlertTriangle : temCritico ? BellRing : CalendarClock;

  return (
    <section
      aria-labelledby="titulo-alertas"
      className="rounded-2xl bg-surface p-4 shadow-sm"
    >
      <h2 id="titulo-alertas" className="flex items-center gap-2 pb-2 text-[15px] font-bold">
        <Icone aria-hidden className={`h-4 w-4 ${vencidas.length > 0 || temCritico ? "text-despesa" : "text-previsao"}`} />
        Vencimentos
      </h2>
      <ul className="flex list-none flex-col gap-2">
        <AnimatePresence initial={false}>
          {alertas.map((a) => {
            const estilo = ESTILO_URGENCIA[a.urgencia];
            return (
              <motion.li
                key={a.data}
                layout={!semMovimento}
                initial={semMovimento ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={semMovimento ? undefined : { opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex min-w-0 items-center justify-between gap-3 rounded-xl border px-3 py-2 ${estilo.classe}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {formatarBRL(a.total)} · {a.despesas.map((d) => d.descricao).join(", ")}
                  </span>
                  <span className="block text-xs opacity-80">
                    {diaMesPorExtenso(a.data)} · {estilo.rotulo(a.dias)}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {a.despesas.length} conta{a.despesas.length > 1 ? "s" : ""}
                </span>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </section>
  );
}

/** "2026-11-05" → "5 de nov." (ano só quando for de outro ano). */
function diaMesPorExtenso(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const anoAtual = new Date().getFullYear();
  const nome = nomeMesCurto(`${ano}-${String(mes).padStart(2, "0")}`).toLowerCase();
  return ano !== anoAtual ? `${dia} ${nome} ${ano}` : `${dia} ${nome}`;
}
