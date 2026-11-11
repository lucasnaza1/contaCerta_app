"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown, Plus, SlidersHorizontal, X } from "lucide-react";
import { EditarLancamento } from "@/components/EditarLancamento";
import { IconeBanco } from "@/components/IconeBanco";
import { IconeForma } from "@/components/IconeForma";
import {
  agruparFaturas,
  diaVencimentoDespesa,
  filtrarDespesas,
  filtrarEntradas,
  type Fatura,
} from "@/lib/calculos";
import { marcarPaga, marcarRecebida } from "@/lib/repositorio";
import { formatarBRL, formatarNumero } from "@/lib/dinheiro";
import { nomeMesCurto, somarMes } from "@/lib/mes";
import type { Cartao, Despesa, Entrada } from "@/lib/tipos";

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

/** Nome da conta com risco animado da esquerda para a direita ao pagar. */
function NomeRiscado({ texto, riscado }: { texto: string; riscado: boolean }) {
  const semMovimento = useReducedMotion();
  return (
    <span className="relative inline-block min-w-0">
      <span
        className={`block truncate transition-colors duration-300 ${
          riscado ? "text-neutra" : "text-foreground"
        }`}
      >
        {texto}
      </span>
      <motion.span
        aria-hidden
        className="absolute top-1/2 left-0 h-[2px] w-full origin-left bg-neutra"
        initial={false}
        animate={{ scaleX: riscado ? 1 : 0 }}
        transition={
          semMovimento ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }
        }
      />
    </span>
  );
}

interface ItemDespesaProps {
  despesa: Despesa;
  cartoes: Cartao[];
  onEditar: (d: Despesa) => void;
}

function ItemDespesa({ despesa, cartoes, onEditar }: ItemDespesaProps) {
  const [salvando, setSalvando] = useState(false);
  const semMovimento = useReducedMotion();
  const toques = useToqueLongo(alternar, () => onEditar(despesa));

  const cartao = despesa.cartaoId
    ? cartoes.find((c) => c.id === despesa.cartaoId)
    : undefined;
  const nomeCartao = cartao?.nome;
  const parcela =
    despesa.parcela && despesa.parcelas ? ` ${despesa.parcela}/${despesa.parcelas}` : "";
  // Vencimento efetivo: o próprio ou o da fatura do cartão.
  const vencimento = diaVencimentoDespesa(despesa, cartoes);
  // Fechamento da fatura do cartão, ao lado do status da despesa.
  const fechamento = cartao?.diaFechamento;

  async function alternar() {
    if (salvando) return;
    setSalvando(true);
    try {
      await marcarPaga(despesa.id, !despesa.paga);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <motion.li
      layout={!semMovimento}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="border-b border-borda last:border-0"
    >
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
          {despesa.paga ? <Check aria-hidden className="h-5 w-5" strokeWidth={2.5} /> : <IconeForma forma={despesa.forma} className="h-5 w-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <NomeRiscado texto={`${despesa.descricao}${parcela}`} riscado={despesa.paga} />
          <span
            className={`flex min-w-0 flex-wrap items-center gap-1.5 truncate text-xs ${
              despesa.paga ? "text-neutra" : "text-foreground/50"
            }`}
          >
            {nomeCartao ? (
              <>
                <IconeBanco nome={nomeCartao} tamanho={14} className="rounded-[4px]" />
                <span className="truncate">{nomeCartao}</span>
              </>
            ) : despesa.forma === "cartao" ? (
              "Cartão"
            ) : null}
            {fechamento ? <span>fecha dia {fechamento}</span> : null}
            {vencimento ? <span>vence dia {vencimento}</span> : null}
          </span>
        </span>
        <span
          className={`shrink-0 text-[15px] font-semibold tabular-nums transition-colors duration-300 ${
            despesa.paga ? "text-neutra" : "text-despesa"
          }`}
        >
          R$ -{formatarNumero(despesa.valor)}
        </span>
      </button>
    </motion.li>
  );
}

interface ItemEntradaProps {
  entrada: Entrada;
  onEditar: (e: Entrada) => void;
}

function ItemEntrada({ entrada, onEditar }: ItemEntradaProps) {
  const [salvando, setSalvando] = useState(false);
  const semMovimento = useReducedMotion();
  const toques = useToqueLongo(alternar, () => onEditar(entrada));

  async function alternar() {
    if (salvando) return;
    setSalvando(true);
    try {
      await marcarRecebida(entrada.id, !entrada.recebida);
    } finally {
      setSalvando(false);
    }
  }

  const parcela =
    entrada.parcela && entrada.parcelas ? ` ${entrada.parcela}/${entrada.parcelas}` : "";

  return (
    <motion.li
      layout={!semMovimento}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="border-b border-borda last:border-0"
    >
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
              ? "border-previsao bg-previsao text-white"
              : "border-borda bg-surface text-previsao"
          }`}
        >
          {entrada.recebida ? <Check aria-hidden className="h-5 w-5" strokeWidth={2.5} /> : <Plus aria-hidden className="h-5 w-5" strokeWidth={2.5} />}
        </span>
        <span className="min-w-0 flex-1">
          <NomeRiscado texto={`${entrada.descricao}${parcela}`} riscado={entrada.recebida} />
          <span
            className={`block text-xs ${entrada.recebida ? "text-neutra" : "text-previsao"}`}
          >
            {entrada.recebida ? "Recebida" : "A receber"}
          </span>
        </span>
        <span
          className={`shrink-0 text-[15px] font-semibold tabular-nums transition-colors duration-300 ${
            entrada.recebida ? "text-neutra" : "text-previsao"
          }`}
        >
          {formatarBRL(entrada.valor)}
        </span>
      </button>
    </motion.li>
  );
}

/** Badge com dia de fechamento/vencimento da fatura. */
function BadgeDia({ tipo, dia }: { tipo: "fecha" | "vence"; dia: number }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        tipo === "fecha"
          ? "bg-previsao/10 text-previsao"
          : "bg-despesa/10 text-despesa"
      }`}
    >
      {tipo === "fecha" ? "fecha" : "vence"} dia {dia}
    </span>
  );
}

interface CartaoFaturaProps {
  fatura: Fatura;
  cartoes: Cartao[];
  onEditar: (d: Despesa) => void;
}

/** Fatura de um cartão: consolidado com setinha para expandir os itens. */
function CartaoFatura({ fatura, cartoes, onEditar }: CartaoFaturaProps) {
  const [aberta, setAberta] = useState(false);
  const semMovimento = useReducedMotion();
  const pendentes = fatura.despesas.filter((d) => !d.paga).length;
  const tudoPago = pendentes === 0;
  // Cartão da fatura, para mostrar os dias dela nos itens expandidos.
  const cartao = fatura.cartaoId
    ? cartoes.find((c) => c.id === fatura.cartaoId)
    : undefined;

  return (
    <li className="rounded-2xl bg-surface shadow-sm">
      <button
        type="button"
        onClick={() => setAberta(!aberta)}
        aria-expanded={aberta}
        aria-controls={`fatura-${fatura.cartaoId || "sem-cartao"}`}
        className="botao-min flex w-full min-w-0 items-center gap-3 p-4 text-left"
      >
        <IconeBanco nome={fatura.nome} tamanho={36} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate text-[15px] font-semibold">{fatura.nome}</span>
            <span
              className={`shrink-0 text-[15px] font-semibold tabular-nums ${
                tudoPago ? "text-neutra" : "text-despesa"
              }`}
            >
              R$ -{formatarNumero(fatura.total)}
            </span>
          </span>
          {/* Fechamento/vencimento da fatura ao lado do cartão, acima das despesas */}
          <span className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-foreground/50">
            <span>
              {fatura.despesas.length} compra{fatura.despesas.length > 1 ? "s" : ""}
              {tudoPago ? " · tudo pago" : ` · ${pendentes} a pagar`}
            </span>
            {fatura.diaFechamento !== undefined && (
              <BadgeDia tipo="fecha" dia={fatura.diaFechamento} />
            )}
            {fatura.diaVencimento !== undefined && (
              <BadgeDia tipo="vence" dia={fatura.diaVencimento} />
            )}
          </span>
        </span>
        <motion.span
          aria-hidden
          animate={{ rotate: aberta ? 180 : 0 }}
          transition={semMovimento ? { duration: 0 } : { duration: 0.2 }}
          className="shrink-0 text-foreground/40"
        >
          <ChevronDown className="h-5 w-5" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {aberta && (
          <motion.div
            id={`fatura-${fatura.cartaoId || "sem-cartao"}`}
            key="conteudo"
            initial={semMovimento ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={semMovimento ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <ul className="list-none px-4 pb-2">
              {fatura.despesas.map((d) => (
                <ItemDespesa
                  key={d.id}
                  despesa={d}
                  cartoes={cartao ? [cartao] : []}
                  onEditar={onEditar}
                />
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
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

const selectClasse =
  "botao-min w-full min-w-0 rounded-xl border border-borda bg-campo px-3 py-2 text-sm outline-none focus:border-previsao focus:ring-2 focus:ring-menta";
const DIAS = Array.from({ length: 31 }, (_, i) => i + 1);

export function ChecklistMes({ mes, mesRef, despesas, entradas, cartoes }: ChecklistMesProps) {
  const [despesaEdicao, setDespesaEdicao] = useState<Despesa | null>(null);
  const [entradaEdicao, setEntradaEdicao] = useState<Entrada | null>(null);
  // "" = todos; id do cartão filtra; "outros" = pix/boleto.
  const [filtro, setFiltro] = useState("");
  // Filtros de vencimento/valor (lista plana quando ativos).
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [diaVenc, setDiaVenc] = useState("");
  const [valorMin, setValorMin] = useState(0);
  const [valorMax, setValorMax] = useState(0);
  const [ordem, setOrdem] = useState<"" | "menor" | "maior">("");

  const doMesDespesas = despesas.filter((d) => d.mes === mes);
  const doMesEntradas = entradas.filter((e) => e.mes === mes);

  const temFiltroValorVenc = diaVenc !== "" || valorMin > 0 || valorMax > 0;
  const temFiltroQualquer = temFiltroValorVenc || ordem !== "";

  function limparFiltros() {
    setDiaVenc("");
    setValorMin(0);
    setValorMax(0);
    setOrdem("");
  }

  const faturas = agruparFaturas(doMesDespesas, cartoes);
  const faturasVisiveis = filtro ? faturas.filter((f) => f.cartaoId === filtro) : faturas;
  // Despesas avulsas: fora de cartão (pix/boleto) ou de cartão sem cartão definido.
  const idsFiltrados = new Set(faturasVisiveis.flatMap((f) => f.despesas.map((d) => d.id)));
  const avulsasVisiveis = doMesDespesas.filter(
    (d) => d.forma !== "cartao" && (!filtro || filtro === "outros") && !idsFiltrados.has(d.id)
  );
  const entradasVisiveis = !filtro || filtro === "outros" ? doMesEntradas : [];

  // Lista plana com filtros de vencimento/valor (ignora agrupamento por fatura).
  const despesasFiltradas = temFiltroValorVenc
    ? filtrarDespesas(doMesDespesas, cartoes, {
        ...(diaVenc !== "" ? { diaVencimento: Number(diaVenc) } : {}),
        ...(valorMin > 0 ? { valorMin } : {}),
        ...(valorMax > 0 ? { valorMax } : {}),
        ...(ordem !== "" ? { ordenarPorValor: ordem } : {}),
      })
    : [];
  const entradasFiltradas = temFiltroValorVenc
    ? filtrarEntradas(doMesEntradas, {
        ...(valorMin > 0 ? { valorMin } : {}),
        ...(valorMax > 0 ? { valorMax } : {}),
        ...(ordem !== "" ? { ordenarPorValor: ordem } : {}),
      })
    : [];
  const resultadosFiltro = despesasFiltradas.length + entradasFiltradas.length;

  const vazio = doMesDespesas.length + doMesEntradas.length === 0;

  return (
    <>
      {/* Filtro por banco/cartão (só sem filtro de valor/vencimento ativo) */}
      {faturas.length > 0 && !temFiltroValorVenc && (
        <div
          role="group"
          aria-label="Filtrar por banco"
          className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <FiltroChip ativo={filtro === ""} onClick={() => setFiltro("")}>
            Todos
          </FiltroChip>
          {faturas.map((f) => (
            <FiltroChip key={f.cartaoId || "sem-cartao"} ativo={filtro === f.cartaoId} onClick={() => setFiltro(f.cartaoId)}>
              <IconeBanco nome={f.nome} tamanho={18} className="rounded-[4px]" />
              {f.nome}
            </FiltroChip>
          ))}
          <FiltroChip ativo={filtro === "outros"} onClick={() => setFiltro("outros")}>
            Sem cartão
          </FiltroChip>
        </div>
      )}

      {/* Painel de filtros por vencimento e valor (acima da lista de despesas) */}
      {!vazio && (
        <section aria-label="Filtrar lançamentos">
          <button
            type="button"
            onClick={() => setFiltrosAbertos(!filtrosAbertos)}
            aria-expanded={filtrosAbertos}
            aria-controls="painel-filtros"
            className={`botao-min flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              temFiltroQualquer
                ? "border-previsao bg-previsao text-white"
                : "border-borda bg-surface text-foreground/60 hover:text-foreground"
            }`}
          >
            <SlidersHorizontal aria-hidden className="h-3.5 w-3.5" />
            Filtros
            {temFiltroQualquer && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Limpar filtros"
                onClick={(e) => {
                  e.stopPropagation();
                  limparFiltros();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    limparFiltros();
                  }
                }}
                className="flex items-center"
              >
                <X aria-hidden className="h-3.5 w-3.5" />
              </span>
            )}
          </button>

          <AnimatePresence initial={false}>
            {filtrosAbertos && (
              <motion.div
                id="painel-filtros"
                key="filtros"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="mt-2 flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-0 flex-[2] basis-32">
                      <label
                        htmlFor="filtro-vencimento"
                        className="block pb-1 text-xs font-medium text-foreground/60"
                      >
                        Vence no dia (despesas)
                      </label>
                      <select
                        id="filtro-vencimento"
                        value={diaVenc}
                        onChange={(e) => setDiaVenc(e.target.value)}
                        className={selectClasse}
                      >
                        <option value="">Todos</option>
                        {DIAS.map((d) => (
                          <option key={d} value={d}>
                            dia {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-0 flex-[2] basis-28">
                      <label
                        htmlFor="filtro-ordem"
                        className="block pb-1 text-xs font-medium text-foreground/60"
                      >
                        Ordenar por valor
                      </label>
                      <select
                        id="filtro-ordem"
                        value={ordem}
                        onChange={(e) => setOrdem(e.target.value as "" | "menor" | "maior")}
                        className={selectClasse}
                      >
                        <option value="">Sem ordem</option>
                        <option value="menor">Menor primeiro</option>
                        <option value="maior">Maior primeiro</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-0 flex-[2] basis-28">
                      <label
                        htmlFor="filtro-valor-min"
                        className="block pb-1 text-xs font-medium text-foreground/60"
                      >
                        Valor mínimo
                      </label>
                      <input
                        id="filtro-valor-min"
                        inputMode="numeric"
                        value={valorMin ? (valorMin / 100).toFixed(2).replace(".", ",") : ""}
                        onChange={(e) =>
                          setValorMin(
                            Math.round(Number(e.target.value.replace(/\D/g, "")) ) || 0
                          )
                        }
                        placeholder="0,00"
                        className={selectClasse}
                      />
                    </div>
                    <div className="min-w-0 flex-[2] basis-28">
                      <label
                        htmlFor="filtro-valor-max"
                        className="block pb-1 text-xs font-medium text-foreground/60"
                      >
                        Valor máximo
                      </label>
                      <input
                        id="filtro-valor-max"
                        inputMode="numeric"
                        value={valorMax ? (valorMax / 100).toFixed(2).replace(".", ",") : ""}
                        onChange={(e) =>
                          setValorMax(
                            Math.round(Number(e.target.value.replace(/\D/g, "")) ) || 0
                          )
                        }
                        placeholder="0,00"
                        className={selectClasse}
                      />
                    </div>
                    {temFiltroQualquer && (
                      <button
                        type="button"
                        onClick={limparFiltros}
                        className="botao-min shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-foreground/60 hover:text-foreground"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-foreground/50">
                    O filtro de valor vale para despesas e entradas; o de vencimento, só
                    para despesas (conta própria ou fatura do cartão).
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

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
        ) : temFiltroValorVenc ? (
          /* Resultado da busca: lista plana de despesas + entradas */
          <>
            <p className="py-2 text-xs font-medium text-foreground/50" aria-live="polite">
              {resultadosFiltro} resultado{resultadosFiltro === 1 ? "" : "s"}
            </p>
            {resultadosFiltro === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <p className="text-[15px] font-medium text-foreground/70">
                  Nada com esses filtros
                </p>
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="rounded-full px-3 py-1 text-xs font-medium text-previsao hover:bg-menta/20"
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              <ul className="list-none">
                <AnimatePresence initial={false}>
                  {despesasFiltradas.map((d) => (
                    <ItemDespesa
                      key={d.id}
                      despesa={d}
                      cartoes={cartoes}
                      onEditar={setDespesaEdicao}
                    />
                  ))}
                  {entradasFiltradas.map((e) => (
                    <ItemEntrada key={e.id} entrada={e} onEditar={setEntradaEdicao} />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </>
        ) : (
          <>
            {/* Consolidado de faturas por cartão (expansível) */}
            {faturasVisiveis.length > 0 && (
              <ul className="flex list-none flex-col gap-2 py-2">
                {faturasVisiveis.map((f) => (
                  <CartaoFatura
                    key={f.cartaoId || "sem-cartao"}
                    fatura={f}
                    cartoes={cartoes}
                    onEditar={setDespesaEdicao}
                  />
                ))}
              </ul>
            )}

            {/* Avulsas (pix/boleto) + entradas */}
            {(avulsasVisiveis.length > 0 || entradasVisiveis.length > 0) && (
              <ul className="list-none">
                <AnimatePresence initial={false}>
                  {avulsasVisiveis.map((d) => (
                    <ItemDespesa
                      key={d.id}
                      despesa={d}
                      cartoes={cartoes}
                      onEditar={setDespesaEdicao}
                    />
                  ))}
                  {entradasVisiveis.map((e) => (
                    <ItemEntrada key={e.id} entrada={e} onEditar={setEntradaEdicao} />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </>
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

function FiltroChip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`botao-min flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        ativo
          ? "border-previsao bg-previsao text-white"
          : "border-borda bg-surface text-foreground/60 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
