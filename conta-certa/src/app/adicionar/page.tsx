"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Abas } from "@/components/Abas";
import { db } from "@/lib/db";
import {
  dividirParcelas,
  formatarMoeda,
  mesAtual,
  mesValido,
  nomeMes,
  parseMoeda,
  somarMes,
} from "@/lib/mes";
import type { Forma } from "@/lib/types";
import { useDados } from "@/lib/useDados";

type Modo = "despesa" | "entrada";

const inputClasse =
  "botao-min w-full rounded-xl border border-borda bg-campo px-4 py-2.5 text-[15px] outline-none focus:border-previsao focus:ring-2 focus:ring-menta";
const botaoPrimario =
  "botao-min w-full rounded-xl bg-previsao px-4 py-3 text-base font-semibold text-white hover:opacity-90 disabled:opacity-60";

export default function PaginaAdicionar() {
  const router = useRouter();
  const { carregando, cartoes } = useDados();

  const [modo, setModo] = useState<Modo>("despesa");
  const [valorTexto, setValorTexto] = useState("");
  const [descricao, setDescricao] = useState("");
  // Mês vem da query (?mes=2026-10) quando aberto a partir da tela Mês.
  const [mes, setMes] = useState(() => {
    if (typeof window === "undefined") return mesAtual();
    const m = new URLSearchParams(window.location.search).get("mes");
    return m && mesValido(m) ? m : mesAtual();
  });
  const [forma, setForma] = useState<Forma>("pix");
  const [cartaoId, setCartaoId] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [recebida, setRecebida] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const valor = parseMoeda(valorTexto);
  const valorValido = Number.isFinite(valor) && valor > 0;
  const nParcelas = Math.max(1, Math.min(48, Math.trunc(Number(parcelas) || 1)));

  async function salvar() {
    if (!valorValido) {
      setErro("Digite um valor maior que zero.");
      return;
    }
    if (!descricao.trim()) {
      setErro("Escreva uma descrição.");
      return;
    }
    if (forma === "cartao" && !cartaoId) {
      setErro("Escolha o cartão.");
      return;
    }
    setSalvando(true);
    try {
      if (modo === "entrada") {
        await db.entradas.add({
          id: crypto.randomUUID(),
          descricao: descricao.trim(),
          valor,
          mes,
          recebida,
        });
      } else if (forma === "cartao" && nParcelas > 1) {
        const compraId = crypto.randomUUID();
        const partes = dividirParcelas(valor, nParcelas);
        await db.despesas.bulkAdd(
          partes.map((parte, i) => ({
            id: crypto.randomUUID(),
            descricao: descricao.trim(),
            valor: parte,
            mes: somarMes(mes, i),
            forma: "cartao" as Forma,
            cartaoId,
            compraId,
            parcela: i + 1,
            parcelas: nParcelas,
            paga: false,
          }))
        );
      } else {
        await db.despesas.add({
          id: crypto.randomUUID(),
          descricao: descricao.trim(),
          valor,
          mes,
          forma,
          ...(forma === "cartao" ? { cartaoId } : {}),
          paga: false,
        });
      }
      router.push("/");
    } catch {
      setErro("Não foi possível salvar. Tente de novo.");
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex flex-1 items-center justify-center" role="status" aria-label="Carregando">
        <p className="animate-pulse text-sm text-foreground/50">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-6">
        <h1 className="pb-4 text-lg font-bold">Adicionar</h1>

        <div
          role="tablist"
          aria-label="Tipo de lançamento"
          className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-foreground/5 p-1"
        >
          {(["despesa", "entrada"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={modo === m}
              onClick={() => {
                setModo(m);
                setErro("");
              }}
              className={`botao-min rounded-lg px-3 py-2 text-sm font-semibold capitalize transition-colors ${
                modo === m ? "bg-surface text-foreground shadow-sm" : "text-foreground/60"
              }`}
            >
              {m === "despesa" ? "Despesa" : "Entrada"}
            </button>
          ))}
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="valor" className="text-sm font-medium">
              Valor {modo === "despesa" && nParcelas > 1 ? "total" : ""} (R$)
            </label>
            <input
              id="valor"
              inputMode="decimal"
              autoComplete="off"
              value={valorTexto}
              onChange={(e) => {
                setValorTexto(e.target.value);
                setErro("");
              }}
              placeholder="0,00"
              aria-invalid={!!erro && !valorValido}
              className={`${inputClasse} text-lg font-semibold tabular-nums`}
            />
            {modo === "despesa" && forma === "cartao" && valorValido && nParcelas > 1 && (
              <p className="text-xs text-foreground/50">
                {nParcelas}x de {formatarMoeda(dividirParcelas(valor, nParcelas)[0])}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="descricao" className="text-sm font-medium">
              Descrição
            </label>
            <input
              id="descricao"
              autoComplete="off"
              maxLength={80}
              value={descricao}
              onChange={(e) => {
                setDescricao(e.target.value);
                setErro("");
              }}
              placeholder={
                modo === "despesa" ? "Ex.: Internet" : "Ex.: Salário"
              }
              className={inputClasse}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="mes" className="text-sm font-medium">
              Mês
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMes(somarMes(mes, -1))}
                aria-label="Mês anterior"
                className="botao-min rounded-full hover:bg-foreground/5"
              >
                <span aria-hidden className="text-xl">
                  ‹
                </span>
              </button>
              <input
                id="mes"
                readOnly
                value={nomeMes(mes)}
                aria-readonly="true"
                className={`${inputClasse} flex-1 text-center`}
              />
              <button
                type="button"
                onClick={() => setMes(somarMes(mes, 1))}
                aria-label="Próximo mês"
                className="botao-min rounded-full hover:bg-foreground/5"
              >
                <span aria-hidden className="text-xl">
                  ›
                </span>
              </button>
            </div>
          </div>

          {modo === "despesa" ? (
            <>
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium">Pagou com</legend>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["pix", "Pix"],
                      ["boleto", "Boleto"],
                      ["cartao", "Cartão"],
                    ] as const
                  ).map(([f, rotulo]) => (
                    <button
                      key={f}
                      type="button"
                      role="radio"
                      aria-checked={forma === f}
                      onClick={() => {
                        setForma(f);
                        setErro("");
                      }}
                      className={`botao-min rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                        forma === f
                          ? "border-previsao bg-previsao text-white"
                          : "border-borda bg-surface text-foreground/70"
                      }`}
                    >
                      {rotulo}
                    </button>
                  ))}
                </div>
              </fieldset>

              {forma === "cartao" && (
                <div className="flex flex-col gap-4 rounded-2xl bg-surface p-4 shadow-sm">
                  {cartoes.length === 0 ? (
                    <p className="text-sm text-foreground/60">
                      Você ainda não tem cartões. Adicione em Ajustes.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <label htmlFor="cartao" className="text-sm font-medium">
                        Cartão
                      </label>
                      <select
                        id="cartao"
                        value={cartaoId}
                        onChange={(e) => {
                          setCartaoId(e.target.value);
                          setErro("");
                        }}
                        className={inputClasse}
                      >
                        <option value="">Selecione…</option>
                        {cartoes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <label htmlFor="parcelas" className="text-sm font-medium">
                      Parcelas
                    </label>
                    <select
                      id="parcelas"
                      value={parcelas}
                      onChange={(e) => setParcelas(e.target.value)}
                      className={inputClasse}
                    >
                      {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n === 1 ? "À vista" : `${n}x`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </>
          ) : (
            <label className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-sm">
              <input
                type="checkbox"
                checked={recebida}
                onChange={(e) => setRecebida(e.target.checked)}
                className="h-6 w-6 accent-menta-escura"
              />
              <span className="text-[15px] font-medium">Já recebi</span>
            </label>
          )}

          <p aria-live="polite" className="min-h-5 text-sm text-despesa">
            {erro}
          </p>

          <button type="submit" disabled={salvando} className={botaoPrimario}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </form>
      </main>
      <Abas />
    </div>
  );
}
