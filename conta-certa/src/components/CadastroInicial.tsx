"use client";

import { useState } from "react";
import { db, salvarConfig } from "@/lib/db";
import { formatarMoeda, mesAtual, parseMoeda } from "@/lib/mes";
import type { Cartao } from "@/lib/types";

interface CadastroInicialProps {
  onPronto: (saldo: number) => void;
}

/** Cadastro rápido: quanto você tem hoje + cartões (opcional). */
export function CadastroInicial({ onPronto }: CadastroInicialProps) {
  const [saldoTexto, setSaldoTexto] = useState("");
  const [nomeCartao, setNomeCartao] = useState("");
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const saldo = parseMoeda(saldoTexto);
  const saldoValido = Number.isFinite(saldo) && saldo >= 0;

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
    if (!saldoValido) {
      setErro("Digite quanto você tem hoje (ex.: 1500,00).");
      return;
    }
    setSalvando(true);
    try {
      const lista = pularCartoes ? [] : cartoes;
      await salvarConfig({ saldoInicial: saldo, mesInicial: mesAtual() });
      if (lista.length) await db.cartoes.bulkPut(lista);
      onPronto(saldo);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Conta Certa</h1>
        <p className="text-sm text-foreground/60">
          Dois passos rápidos e você já pode usar o app.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="saldo" className="text-sm font-medium text-foreground">
          Quanto você tem hoje?
        </label>
        <input
          id="saldo"
          inputMode="decimal"
          autoComplete="off"
          value={saldoTexto}
          onChange={(e) => {
            setSaldoTexto(e.target.value);
            setErro("");
          }}
          placeholder="0,00"
          aria-invalid={!!erro}
          aria-describedby={erro ? "saldo-erro" : undefined}
          className="botao-min rounded-xl border border-borda bg-campo px-4 py-3 text-lg font-semibold tabular-nums outline-none focus:border-previsao focus:ring-2 focus:ring-menta"
        />
        <p id="saldo-erro" aria-live="polite" className="min-h-5 text-sm text-despesa">
          {erro}
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
                  className="botao-min flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-sm font-medium shadow-sm"
                  aria-label={`Remover cartão ${c.nome}`}
                >
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
          {salvando
            ? "Salvando…"
            : saldoValido
              ? `Começar com ${formatarMoeda(saldo)}`
              : "Começar"}
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
