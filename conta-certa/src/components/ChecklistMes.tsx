"use client";

import { useState } from "react";
import { IconeEntrada, IconeForma } from "@/components/icones";
import { db } from "@/lib/db";
import { formatarMoeda, nomeMesCurto, somarMes } from "@/lib/mes";
import type { Cartao, Despesa, Entrada } from "@/lib/types";

interface ItemDespesaProps {
  despesa: Despesa;
  cartoes: Cartao[];
  mesFuturo: boolean;
}

function ItemDespesa({ despesa, cartoes, mesFuturo }: ItemDespesaProps) {
  const [salvando, setSalvando] = useState(false);

  const nomeCartao = despesa.cartaoId
    ? cartoes.find((c) => c.id === despesa.cartaoId)?.nome
    : undefined;
  const parcela =
    despesa.parcela && despesa.parcelas ? ` ${despesa.parcela}/${despesa.parcelas}` : "";

  async function alternar() {
    if (salvando) return;
    setSalvando(true);
    try {
      await db.despesas.update(despesa.id, { paga: !despesa.paga });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <li className="border-b border-borda last:border-0">
      <button
        type="button"
        onClick={alternar}
        aria-pressed={despesa.paga}
        className="flex w-full items-center gap-3 py-2.5 text-left"
      >
        <span
          role="img"
          aria-label={despesa.paga ? "Paga" : "A pagar"}
          className={`botao-min flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-xl border-2 ${
            despesa.paga
              ? "border-despesa bg-despesa text-white"
              : "border-borda bg-surface text-despesa"
          }`}
        >
          <IconeForma forma={despesa.forma} className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[15px] font-medium ${
              despesa.paga ? "text-neutra line-through" : "text-foreground"
            }`}
          >
            {despesa.descricao}
            {parcela}
          </span>
          <span
            className={`block truncate text-xs ${
              despesa.paga ? "text-neutra" : "text-foreground/50"
            }`}
          >
            {nomeCartao ?? (despesa.forma === "cartao" ? "Cartão" : undefined)}
          </span>
        </span>
        <span
          className={`shrink-0 text-[15px] font-semibold tabular-nums ${
            despesa.paga
              ? "text-neutra line-through"
              : mesFuturo
                ? "text-previsao"
                : "text-despesa"
          }`}
        >
          {formatarMoeda(despesa.valor)}
        </span>
      </button>
    </li>
  );
}

interface ItemEntradaProps {
  entrada: Entrada;
  mesFuturo: boolean;
}

function ItemEntrada({ entrada, mesFuturo }: ItemEntradaProps) {
  const [salvando, setSalvando] = useState(false);

  async function alternar() {
    if (salvando) return;
    setSalvando(true);
    try {
      await db.entradas.update(entrada.id, { recebida: !entrada.recebida });
    } finally {
      setSalvando(false);
    }
  }

  const parcela =
    entrada.parcela && entrada.parcelas ? ` ${entrada.parcela}/${entrada.parcelas}` : "";

  return (
    <li className="border-b border-borda last:border-0">
      <button
        type="button"
        onClick={alternar}
        aria-pressed={entrada.recebida}
        className="flex w-full items-center gap-3 py-2.5 text-left"
      >
        <span
          role="img"
          aria-label={entrada.recebida ? "Recebida" : "A receber"}
          className={`botao-min flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-xl border-2 ${
            entrada.recebida
              ? "border-entrada bg-entrada text-white"
              : "border-borda bg-surface text-entrada"
          }`}
        >
          <IconeEntrada className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[15px] font-medium ${
              entrada.recebida ? "text-neutra line-through" : "text-foreground"
            }`}
          >
            {entrada.descricao}
            {parcela}
          </span>
          <span
            className={`block text-xs ${entrada.recebida ? "text-neutra" : "text-entrada"}`}
          >
            {entrada.recebida ? "Recebida" : "A receber"}
          </span>
        </span>
        <span
          className={`shrink-0 text-[15px] font-semibold tabular-nums ${
            entrada.recebida
              ? "text-neutra line-through"
              : mesFuturo
                ? "text-previsao"
                : "text-entrada"
          }`}
        >
          {formatarMoeda(entrada.valor)}
        </span>
      </button>
    </li>
  );
}

interface ChecklistMesProps {
  mes: string;
  mesRef: string;
  despesas: Despesa[];
  entradas: Entrada[];
  cartoes: Cartao[];
}

export function ChecklistMes({ mes, mesRef, despesas, entradas, cartoes }: ChecklistMesProps) {
  const mesFuturo = mes > mesRef;
  const doMesDespesas = despesas.filter((d) => d.mes === mes);
  const doMesEntradas = entradas.filter((e) => e.mes === mes);
  const pendentesDespesas = doMesDespesas.filter((d) => !d.paga);
  const pagasDespesas = doMesDespesas.filter((d) => d.paga);
  const pendentesEntradas = doMesEntradas.filter((e) => !e.recebida);
  const recebidasEntradas = doMesEntradas.filter((e) => e.recebida);

  const vazio = doMesDespesas.length + doMesEntradas.length === 0;

  return (
    <section aria-label="Contas do mês" className="rounded-2xl bg-surface px-4 py-2 shadow-sm">
      {vazio ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <p className="text-[15px] font-medium text-foreground/70">
            Nada por aqui ainda
          </p>
          <p className="max-w-60 text-sm text-foreground/50">
            Toque no botão + para adicionar as contas de {nomeMesCurto(mes).toLowerCase()}.
          </p>
        </div>
      ) : (
        <ul className="list-none">
          {pendentesDespesas.map((d) => (
            <ItemDespesa key={d.id} despesa={d} cartoes={cartoes} mesFuturo={mesFuturo} />
          ))}
          {pendentesEntradas.map((e) => (
            <ItemEntrada key={e.id} entrada={e} mesFuturo={mesFuturo} />
          ))}
          {pagasDespesas.map((d) => (
            <ItemDespesa key={d.id} despesa={d} cartoes={cartoes} mesFuturo={mesFuturo} />
          ))}
          {recebidasEntradas.map((e) => (
            <ItemEntrada key={e.id} entrada={e} mesFuturo={mesFuturo} />
          ))}
        </ul>
      )}
      <p className="sr-only">
        Mês de referência para previsões: {mesRef}. Próximo mês: {somarMes(mes, 1)}.
      </p>
    </section>
  );
}
