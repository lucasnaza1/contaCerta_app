"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import type { Cartao, Config, Despesa, Entrada, FixaExterna, Plano } from "./types";

export interface Dados {
  carregando: boolean;
  config: Config | undefined;
  cartoes: Cartao[];
  despesas: Despesa[];
  entradas: Entrada[];
  planos: Plano[];
  fixasExternas: FixaExterna[];
}

/**
 * Fonte única de dados do app. `config === undefined` após carregar
 * significa primeiro uso (mostrar cadastro inicial).
 */
export function useDados(): Dados {
  const dados = useLiveQuery(async () => {
    const [config, cartoes, despesas, entradas, planos, fixasExternas] =
      await Promise.all([
        db.config.get("config"),
        db.cartoes.toArray(),
        db.despesas.toArray(),
        db.entradas.toArray(),
        db.planos.toArray(),
        db.fixasExternas.toArray(),
      ]);
    return { config, cartoes, despesas, entradas, planos, fixasExternas };
  }, []);

  if (!dados) {
    return {
      carregando: true,
      config: undefined,
      cartoes: [],
      despesas: [],
      entradas: [],
      planos: [],
      fixasExternas: [],
    };
  }
  return { carregando: false, ...dados };
}
