"use client";

import { useRef, useState } from "react";
import { EditarLancamento } from "@/components/EditarLancamento";
import { IconeEntrada, IconeForma } from "@/components/icones";
import { db } from "@/lib/db";
import { formatarMoeda, nomeMesCurto, somarMes } from "@/lib/mes";
import type { Cartao, Despesa, Entrada } from "@/lib/types";

/** Toque curto alterna; toque longo (500ms) abre edição. */
function useToqueLongo(aoCurto: () => void, aoLongo: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const acionado = useRef(false);
  const posicao = useRef({ x: 0, y: 0 });

  function limpar() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  return {
    onClick: () => {
      // Ignora o clique que solta um toque longo.
      if (acionado.current) {
        acionado.current = false;
        return;
      }
      aoCurto();
    },
    onPointerDown: (e: React.PointerEvent) => {
      acionado.current = false;
      posicao.current = { x: e.clientX, y: e.clientY };
      limpar();
      timer.current = setTimeout(() => {
        acionado.current = true;
        aoLongo();
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(10);
        }
      }, 500);
    },
    onPointerUp: limpar,
    onPointerLeave: limpar,
    onPointerCancel: limpar,
    onPointerMove: (e: React.PointerEvent) => {
      // Movimento de rolagem cancela o toque longo.
      if (timer.current) {
        const d = Math.abs(e.clientX - posicao.current.x) + Math.abs(e.clientY - posicao.current.y);
        if (d > 10) limpar();
      }
    },
    onContextMenu: (e: React.MouseEvent) => {
      // Segurar no mobile abre o menu de contexto; abrimos a edição.
      e.preventDefault();
      if (!acionado.current) {
        acionado.current = true;
        aoLongo();
      }
    },
  };
}

interface ItemDespesaProps {
  despesa: Despesa;
  cartoes: Cartao[];
  mesFuturo: boolean;
  onEditar: (d: Despesa) => void;
}

function ItemDespesa({ despesa, cartoes, mesFuturo, onEditar }: ItemDespesaProps) {
  const [salvando, setSalvando] = useState(false);
  const toques = useToqueLongo(alternar, () => onEditar(despesa));

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
        aria-pressed={despesa.paga}
        title="Toque para marcar como paga; segure para editar"
        {...toques}
        className="flex w-full min-w-0 items-center gap-3 py-2.5 text-left"
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
  onEditar: (e: Entrada) => void;
}

function ItemEntrada({ entrada, mesFuturo, onEditar }: ItemEntradaProps) {
  const [salvando, setSalvando] = useState(false);
  const toques = useToqueLongo(alternar, () => onEditar(entrada));

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
        aria-pressed={entrada.recebida}
        title="Toque para marcar como recebida; segure para editar"
        {...toques}
        className="flex w-full min-w-0 items-center gap-3 py-2.5 text-left"
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
  const [despesaEdicao, setDespesaEdicao] = useState<Despesa | null>(null);
  const [entradaEdicao, setEntradaEdicao] = useState<Entrada | null>(null);

  const mesFuturo = mes > mesRef;
  const doMesDespesas = despesas.filter((d) => d.mes === mes);
  const doMesEntradas = entradas.filter((e) => e.mes === mes);
  const pendentesDespesas = doMesDespesas.filter((d) => !d.paga);
  const pagasDespesas = doMesDespesas.filter((d) => d.paga);
  const pendentesEntradas = doMesEntradas.filter((e) => !e.recebida);
  const recebidasEntradas = doMesEntradas.filter((e) => e.recebida);

  const vazio = doMesDespesas.length + doMesEntradas.length === 0;

  return (
    <>
      <section
        aria-label="Contas do mês"
        className="rounded-2xl bg-surface px-4 py-2 shadow-sm"
      >
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
              <ItemDespesa
                key={d.id}
                despesa={d}
                cartoes={cartoes}
                mesFuturo={mesFuturo}
                onEditar={setDespesaEdicao}
              />
            ))}
            {pendentesEntradas.map((e) => (
              <ItemEntrada key={e.id} entrada={e} mesFuturo={mesFuturo} onEditar={setEntradaEdicao} />
            ))}
            {pagasDespesas.map((d) => (
              <ItemDespesa
                key={d.id}
                despesa={d}
                cartoes={cartoes}
                mesFuturo={mesFuturo}
                onEditar={setDespesaEdicao}
              />
            ))}
            {recebidasEntradas.map((e) => (
              <ItemEntrada key={e.id} entrada={e} mesFuturo={mesFuturo} onEditar={setEntradaEdicao} />
            ))}
          </ul>
        )}
        <p className="sr-only">
          Mês de referência para previsões: {mesRef}. Próximo mês: {somarMes(mes, 1)}.
        </p>
      </section>

      <EditarLancamento
        despesa={despesaEdicao}
        entrada={entradaEdicao}
        cartoes={cartoes}
        onFechar={() => {
          setDespesaEdicao(null);
          setEntradaEdicao(null);
        }}
      />
    </>
  );
}
