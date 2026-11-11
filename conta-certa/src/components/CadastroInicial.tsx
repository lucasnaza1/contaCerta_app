"use client";

import { useState } from "react";
import { IconeBanco } from "@/components/IconeBanco";
import { db, salvarConfig } from "@/lib/db";
import { diaValido, mesAtual } from "@/lib/mes";
import type { Cartao } from "@/lib/tipos";

interface CadastroInicialProps {
  onPronto: () => void;
}

const inputClasse =
  "botao-min w-full min-w-0 rounded-xl border border-borda bg-campo px-4 py-2 outline-none focus:border-previsao focus:ring-2 focus:ring-menta";
const inputDiaClasse =
  "botao-min w-full min-w-0 rounded-xl border border-borda bg-campo px-3 py-2 text-center outline-none focus:border-previsao focus:ring-2 focus:ring-menta";

/** Cadastro rápido: cartões que usa (opcional), com dias da fatura. */
export function CadastroInicial({ onPronto }: CadastroInicialProps) {
  const [nomeCartao, setNomeCartao] = useState("");
  const [fechamento, setFechamento] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function adicionarCartao() {
    const nome = nomeCartao.trim();
    if (!nome) return;
    if (cartoes.some((c) => c.nome.toLowerCase() === nome.toLowerCase())) {
      setNomeCartao("");
      return;
    }
    const f = fechamento ? Number(fechamento) : undefined;
    const v = vencimento ? Number(vencimento) : undefined;
    if ((f !== undefined && !diaValido(f)) || (v !== undefined && !diaValido(v))) {
      setErro("Os dias de fechamento/vencimento devem ser entre 1 e 31.");
      return;
    }
    setErro("");
    setCartoes([
      ...cartoes,
      {
        id: crypto.randomUUID(),
        nome,
        ...(f !== undefined ? { diaFechamento: f } : {}),
        ...(v !== undefined ? { diaVencimento: v } : {}),
      },
    ]);
    setNomeCartao("");
    setFechamento("");
    setVencimento("");
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
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              id="cartao"
              autoComplete="off"
              value={nomeCartao}
              onChange={(e) => {
                setNomeCartao(e.target.value);
                setErro("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  adicionarCartao();
                }
              }}
              placeholder="Ex.: Nubank"
              className={inputClasse}
            />
            <button
              type="button"
              onClick={adicionarCartao}
              className="botao-min shrink-0 rounded-xl bg-menta px-4 py-2 font-semibold text-foreground hover:bg-menta/80"
            >
              Adicionar
            </button>
          </div>
          {/* Dias da fatura já no cadastro (opcionais) */}
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="fechamento"
                className="block pb-1 text-xs font-medium text-foreground/60"
              >
                Fatura fecha dia <span className="font-normal">(opcional)</span>
              </label>
              <input
                id="fechamento"
                inputMode="numeric"
                value={fechamento}
                onChange={(e) => {
                  setFechamento(e.target.value.replace(/\D/g, "").slice(0, 2));
                  setErro("");
                }}
                placeholder="1–31"
                aria-label="Dia de fechamento da fatura"
                className={inputDiaClasse}
              />
            </div>
            <div className="min-w-0 flex-1">
              <label
                htmlFor="vencimento"
                className="block pb-1 text-xs font-medium text-foreground/60"
              >
                Fatura vence dia <span className="font-normal">(opcional)</span>
              </label>
              <input
                id="vencimento"
                inputMode="numeric"
                value={vencimento}
                onChange={(e) => {
                  setVencimento(e.target.value.replace(/\D/g, "").slice(0, 2));
                  setErro("");
                }}
                placeholder="1–31"
                aria-label="Dia de vencimento da fatura"
                className={inputDiaClasse}
              />
            </div>
          </div>
          <p aria-live="polite" className="min-h-5 text-sm text-despesa">
            {erro}
          </p>
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
                  {(c.diaFechamento || c.diaVencimento) && (
                    <span className="text-xs font-normal text-foreground/50">
                      {c.diaFechamento ? `fecha ${c.diaFechamento}` : ""}
                      {c.diaFechamento && c.diaVencimento ? " · " : ""}
                      {c.diaVencimento ? `vence ${c.diaVencimento}` : ""}
                    </span>
                  )}
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
