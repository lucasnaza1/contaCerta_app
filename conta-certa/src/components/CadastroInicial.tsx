"use client";

import { useState } from "react";
import { IconeBanco } from "@/components/IconeBanco";
import { db, salvarConfig } from "@/lib/db";
import { mesAtual } from "@/lib/mes";
import type { Cartao } from "@/lib/tipos";

interface CadastroInicialProps {
  onPronto: () => void;
}

/** Cadastro rápido: cartões que usa (opcional). */
export function CadastroInicial({ onPronto }: CadastroInicialProps) {
  const [nomeCartao, setNomeCartao] = useState("");
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [salvando, setSalvando] = useState(false);

  async function adicionarCartao() {
    const nome = nomeCartao.trim();
    if (!nome || cartoes.some((c) => c.nome.toLowerCase() === nome.toLowerCase())) {
      setNomeCartao("");
      return;
    }
    setCartoes([...cartoes, { id: crypto.randomUUID(), nome }]);
    setNomeCartao("");
  }

  async function finalizar(pularCartoes: boolean) {
    if (salvando) return;
    setSalvando(true);
    try {
      const lista = pularCartoes ? [] : cartoes;
      await salvarConfig({ mesInicial: mesAtual() });
      if (lista.length) await db.cartoes.bulkPut(lista);
      onPronto();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Conta Certa</h1>
        <p className="text-sm text-foreground/60">
          Um passo rápido e você já pode usar o app.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="cartao" className="text-sm font-medium text-foreground">
          Quais cartões você usa?{" "}
          <span className="font-normal text-foreground/50">(opcional)</span>
        </label>
        <div className="flex gap-2">
          <input
            id="cartao"
            autoComplete="off"
            value={nomeCartao}
            onChange={(e) => setNomeCartao(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                adicionarCartao();
              }
            }}
            placeholder="Ex.: Nubank"
            className="botao-min flex-1 rounded-xl border border-borda bg-campo px-4 py-2 outline-none focus:border-previsao focus:ring-2 focus:ring-menta"
          />
          <button
            type="button"
            onClick={adicionarCartao}
            className="botao-min rounded-xl bg-menta px-4 py-2 font-semibold text-foreground hover:bg-menta/80"
          >
            Adicionar
          </button>
        </div>
        {cartoes.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-1" aria-label="Cartões adicionados">
            {cartoes.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setCartoes(cartoes.filter((x) => x.id !== c.id))}
                  className="botao-min flex items-center gap-2 rounded-full bg-surface py-1.5 pr-3 pl-1.5 text-sm font-medium shadow-sm"
                  aria-label={`Remover cartão ${c.nome}`}
                >
                  <IconeBanco nome={c.nome} tamanho={22} className="rounded-full" />
                  {c.nome}
                  <span aria-hidden className="text-foreground/40">
                    ×
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={salvando}
          onClick={() => finalizar(false)}
          className="botao-min rounded-xl bg-previsao px-4 py-3 text-base font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {salvando ? "Salvando…" : "Começar"}
        </button>
        <button
          type="button"
          disabled={salvando}
          onClick={() => finalizar(true)}
          className="botao-min rounded-xl px-4 py-2 text-sm font-medium text-foreground/60 hover:text-foreground disabled:opacity-60"
        >
          Pular cartões e começar
        </button>
      </div>
    </div>
  );
}

