"use client";

import { motion, useReducedMotion } from "motion/react";
import { formatarBRL } from "@/lib/dinheiro";

interface AguaNivelProps {
  /** Quanto da previsão ainda está disponível (0..1). */
  proporcao: number;
  valor: number;
}

/**
 * Nível da água: mostra quanto da previsão do mês ainda está disponível.
 * A água sobe/desce com mola suave; a borda ondula devagar (contínuo).
 * Com prefers-reduced-motion, troca de nível sem mola nem ondulação.
 */
export function AguaNivel({ proporcao, valor }: AguaNivelProps) {
  const semMovimento = useReducedMotion();
  // Água restante: 100% quando nada foi gasto, caindo conforme gasta.
  const nivel = Math.max(0, Math.min(1, 1 - proporcao)) * 100;

  return (
    <section
      aria-label="Disponível do mês"
      className="relative h-28 overflow-hidden rounded-2xl bg-surface shadow-sm"
    >
      <motion.div
        className="absolute inset-x-0 bottom-0 bg-menta/70 dark:bg-menta/40"
        initial={false}
        animate={{ height: `${nivel}%` }}
        transition={
          semMovimento
            ? { duration: 0 }
            : { type: "spring", stiffness: 60, damping: 16 }
        }
      >
        {/* Borda ondulada lenta; desligada com reduced-motion */}
        {!semMovimento && (
          <motion.svg
            className="absolute -top-2 left-0 h-2 w-[200%] text-menta"
            viewBox="0 0 1200 16"
            preserveAspectRatio="none"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            aria-hidden
          >
            <path
              d="M0 8c100-8 200 8 300 8s200-16 300-16 200 16 300 16 200-16 300-16v16H0z"
              fill="currentColor"
            />
          </motion.svg>
        )}
      </motion.div>
      <div className="relative flex h-full flex-col items-center justify-center">
        <span className="text-rotulo font-medium uppercase tracking-wide text-foreground/50">
          Disponível
        </span>
        <span
          className={`text-2xl font-extrabold tabular-nums ${
            valor < 0 ? "text-despesa" : "text-previsao"
          }`}
        >
          {formatarBRL(valor)}
        </span>
      </div>
    </section>
  );
}
