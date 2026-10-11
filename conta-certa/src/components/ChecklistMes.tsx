"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { EditarLancamento } from "@/components/EditarLancamento";
import { IconeBanco } from "@/components/IconeBanco";
import { IconeForma } from "@/components/IconeForma";
import { agruparFaturas, type Fatura } from "@/lib/calculos";
import { marcarPaga, marcarRecebida } from "@/lib/repositorio";
import { formatarBRL } from "@/lib/dinheiro";
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
  mesFuturo: boolean;
  onEditar: (d: Despesa) => void;
}

function ItemDespesa({ despesa, cartoes, mesFuturo, onEditar }: ItemDespesaProps) {
  const [salvando, setSalvando] = useState(false);
  const semMovimento = useReducedMotion();
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
            className={`flex min-w-0 items-center gap-1.5 truncate text-xs ${
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
          </span>
        </span>
        <span
          className={`shrink-0 text-[15px] font-semibold tabular-nums transition-colors duration-300 ${
            despesa.paga
              ? "text-neutra"
              : mesFuturo
                ? "text-previsao"
                : "text-despesa"
          }`}
        >
          {formatarBRL(despesa.valor)}
        </span>
      </button>
    </motion.li>
  );
}

interface ItemEntradaProps {
  entrada: Entrada;
  mesFuturo: boolean;
  onEditar: (e: Entrada) => void;
}

function ItemEntrada({ entrada, mesFuturo, onEditar }: ItemEntradaProps) {
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
              ? "border-entrada bg-entrada text-white"
              : "border-borda bg-surface text-entrada"
          }`}
        >
          {entrada.recebida ? <Check aria-hidden className="h-5 w-5" strokeWidth={2.5} /> : <Plus aria-hidden className="h-5 w-5" strokeWidth={2.5} />}
        </span>
        <span className="min-w-0 flex-1">
          <NomeRiscado texto={`${entrada.descricao}${parcela}`} riscado={entrada.recebida} />
          <span
            className={`block text-xs ${entrada.recebida ? "text-neutra" : "text-entrada"}`}
          >
            {entrada.recebida ? "Recebida" : "A receber"}
          </span>
        </span>
        <span
          className={`shrink-0 text-[15px] font-semibold tabular-nums transition-colors duration-300 ${
            entrada.recebida
              ? "text-neutra"
              : mesFuturo
                ? "text-previsao"
                : "text-entrada"
          }`}
        >
          {formatarBRL(entrada.valor)}
        </span>
      </button>
    </motion.li>
  );
}

interface CartaoFaturaProps {
  fatura: Fatura;
  mesFuturo: boolean;
  onEditar: (d: Despesa) => void;
}

/** Fatura de um cartão: consolidado com setinha para expandir os itens. */
function CartaoFatura({ fatura, mesFuturo, onEditar }: CartaoFaturaProps) {
  const [aberta, setAberta] = useState(false);
  const semMovimento = useReducedMotion();
  const pendentes = fatura.despesas.filter((d) => !d.paga).length;
  const tudoPago = pendentes === 0;

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
          <span className="block truncate text-[15px] font-semibold">{fatura.nome}</span>
          <span className="block text-xs text-foreground/50">
            {fatura.despesas.length} compra{fatura.despesas.length > 1 ? "s" : ""} ·{" "}
            {tudoPago ? "tudo pago" : `${pendentes} a pagar`}
          </span>
        </span>
        <span
          className={`shrink-0 text-[15px] font-semibold tabular-nums ${
            tudoPago ? "text-neutra" : mesFuturo ? "text-previsao" : "text-despesa"
          }`}
        >
          {formatarBRL(fatura.total)}
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
                  cartoes={[]}
                  mesFuturo={mesFuturo}
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

export function ChecklistMes({ mes, mesRef, despesas, entradas, cartoes }: ChecklistMesProps) {
  const [despesaEdicao, setDespesaEdicao] = useState<Despesa | null>(null);
  const [entradaEdicao, setEntradaEdicao] = useState<Entrada | null>(null);
  // "" = todos; id do cartão filtra; "outros" = pix/boleto.
  const [filtro, setFiltro] = useState("");

  const mesFuturo = mes > mesRef;
  const doMesDespesas = despesas.filter((d) => d.mes === mes);
  const doMesEntradas = entradas.filter((e) => e.mes === mes);

  const faturas = agruparFaturas(doMesDespesas, cartoes);
  const faturasVisiveis = filtro ? faturas.filter((f) => f.cartaoId === filtro) : faturas;
  // Despesas avulsas: fora de cartão (pix/boleto) ou de cartão sem cartão definido.
  const idsFiltrados = new Set(faturasVisiveis.flatMap((f) => f.despesas.map((d) => d.id)));
  const avulsasVisiveis = doMesDespesas.filter(
    (d) => d.forma !== "cartao" && (!filtro || filtro === "outros") && !idsFiltrados.has(d.id)
  );
  const entradasVisiveis = !filtro || filtro === "outros" ? doMesEntradas : [];

  const vazio = doMesDespesas.length + doMesEntradas.length === 0;

  return (
    <>
      {/* Filtro por banco/cartão */}
      {faturas.length > 0 && (
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
          <>
            {/* Consolidado de faturas por cartão (expansível) */}
            {faturasVisiveis.length > 0 && (
              <ul className="flex list-none flex-col gap-2 py-2">
                {faturasVisiveis.map((f) => (
                  <CartaoFatura
                    key={f.cartaoId || "sem-cartao"}
                    fatura={f}
                    mesFuturo={mesFuturo}
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
                      mesFuturo={mesFuturo}
                      onEditar={setDespesaEdicao}
                    />
                  ))}
                  {entradasVisiveis.map((e) => (
                    <ItemEntrada key={e.id} entrada={e} mesFuturo={mesFuturo} onEditar={setEntradaEdicao} />
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
