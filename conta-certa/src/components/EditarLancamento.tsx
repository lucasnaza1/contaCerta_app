"use client";

import { useEffect, useState } from "react";
import { CampoMoeda } from "@/components/CampoMoeda";
import { IconeBoleto, IconeCartao, IconeEntrada, IconePix } from "@/components/icones";
import { db } from "@/lib/db";
import { formatarMoeda, nomeMes, somarMes } from "@/lib/mes";
import type { Cartao, Despesa, Entrada, Forma } from "@/lib/types";

const inputClasse =
  "botao-min w-full min-w-0 rounded-xl border border-borda bg-campo px-4 py-2.5 text-[15px] outline-none focus:border-previsao focus:ring-2 focus:ring-menta";

interface EditarLancamentoProps {
  despesa: Despesa | null;
  entrada: Entrada | null;
  cartoes: Cartao[];
  onFechar: () => void;
}

/**
 * Painel inferior para editar ou excluir um lançamento. Para parcelas,
 * a edição vale para o grupo inteiro; excluir remove todas as parcelas.
 * O pai controla a montagem (renderiza só com item e usa `key` do id),
 * então o estado inicial vem das props sem precisar de efeito.
 */
export function EditarLancamento({ despesa, entrada, cartoes, onFechar }: EditarLancamentoProps) {
  const eDespesa = !!despesa;
  const item = despesa ?? entrada;
  if (!item) return null;

  return (
    <PainelEditar
      key={item.id}
      item={item}
      eDespesa={eDespesa}
      cartoes={cartoes}
      onFechar={onFechar}
    />
  );
}

interface PainelEditarProps {
  item: Despesa | Entrada;
  eDespesa: boolean;
  cartoes: Cartao[];
  onFechar: () => void;
}

function PainelEditar({ item, eDespesa, cartoes, onFechar }: PainelEditarProps) {
  const despesa = item as Despesa;
  const entrada = item as Entrada;
  const ehGrupo = !!(despesa.compraId || entrada.grupoId);
  const nParcelas = item.parcelas ?? 1;

  const [valorCentavos, setValorCentavos] = useState(item.valor);
  const [descricao, setDescricao] = useState(item.descricao);
  const [mes, setMes] = useState(item.mes);
  const [forma, setForma] = useState<Forma>(despesa.forma ?? "pix");
  const [cartaoId, setCartaoId] = useState(despesa.cartaoId ?? "");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  // Bloqueia rolagem do fundo com o painel aberto.
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, []);

  // Fecha com Escape.
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  async function salvar() {
    if (salvando) return;
    if (valorCentavos <= 0) {
      setErro("Digite um valor maior que zero.");
      return;
    }
    if (!descricao.trim()) {
      setErro("Escreva uma descrição.");
      return;
    }
    if (eDespesa && forma === "cartao" && !cartaoId) {
      setErro("Escolha o cartão.");
      return;
    }

    setSalvando(true);
    setErro("");
    try {
      const descricaoLimpa = descricao.trim();

      if (eDespesa) {
        if (despesa.compraId) {
          const parcelas = await db.despesas
            .where("compraId")
            .equals(despesa.compraId)
            .sortBy("parcela");
          await Promise.all(
            parcelas.map((p) =>
              db.despesas.update(p.id, {
                descricao: descricaoLimpa,
                valor: valorCentavos,
                mes: somarMes(mes, (p.parcela ?? 1) - 1),
                forma,
                ...(forma === "cartao" ? { cartaoId } : { cartaoId: undefined }),
              })
            )
          );
        } else {
          await db.despesas.update(despesa.id, {
            descricao: descricaoLimpa,
            valor: valorCentavos,
            mes,
            forma,
            ...(forma === "cartao" ? { cartaoId } : { cartaoId: undefined }),
          });
        }
      } else {
        if (entrada.grupoId) {
          const parcelas = await db.entradas
            .where("grupoId")
            .equals(entrada.grupoId)
            .sortBy("parcela");
          await Promise.all(
            parcelas.map((p) =>
              db.entradas.update(p.id, {
                descricao: descricaoLimpa,
                valor: valorCentavos,
                mes: somarMes(mes, (p.parcela ?? 1) - 1),
              })
            )
          );
        } else {
          await db.entradas.update(entrada.id, {
            descricao: descricaoLimpa,
            valor: valorCentavos,
            mes,
          });
        }
      }
      onFechar();
    } catch {
      setErro("Não foi possível salvar. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (excluindo) return;
    setExcluindo(true);
    try {
      if (eDespesa) {
        if (despesa.compraId) {
          await db.despesas.where("compraId").equals(despesa.compraId).delete();
        } else {
          await db.despesas.delete(despesa.id);
        }
      } else {
        if (entrada.grupoId) {
          await db.entradas.where("grupoId").equals(entrada.grupoId).delete();
        } else {
          await db.entradas.delete(entrada.id);
        }
      }
      onFechar();
    } catch {
      setErro("Não foi possível excluir. Tente de novo.");
      setExcluindo(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onFechar}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={eDespesa ? "Editar despesa" : "Editar entrada"}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-foreground/15" aria-hidden />
        <div className="flex items-center gap-2 pb-3">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              eDespesa ? "bg-despesa/10 text-despesa" : "bg-entrada/10 text-entrada"
            }`}
            aria-hidden
          >
            {eDespesa ? <IconeCartao className="h-4 w-4" /> : <IconeEntrada className="h-4 w-4" />}
          </span>
          <h2 className="text-lg font-bold">
            {eDespesa ? "Editar despesa" : "Editar entrada"}
          </h2>
        </div>

        <div className="flex flex-col gap-4 pb-4">
          {ehGrupo && (
            <p className="rounded-xl bg-menta/15 px-4 py-2 text-sm text-previsao">
              Grupo de {nParcelas}x — as mudanças valem para todas as parcelas.
            </p>
          )}

          <CampoMoeda
            id="editar-valor"
            rotulo={ehGrupo ? "Valor de cada parcela" : "Valor"}
            valorCentavos={valorCentavos}
            onValor={(c) => {
              setValorCentavos(c);
              setErro("");
            }}
            disabled={salvando || excluindo}
            invalido={!!erro && valorCentavos <= 0}
            descricao={
              ehGrupo ? `Total do grupo: ${formatarMoeda(valorCentavos * nParcelas)}` : undefined
            }
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="editar-descricao" className="text-sm font-medium">
              Descrição
            </label>
            <input
              id="editar-descricao"
              autoComplete="off"
              maxLength={80}
              disabled={salvando || excluindo}
              value={descricao}
              onChange={(e) => {
                setDescricao(e.target.value);
                setErro("");
              }}
              className={inputClasse}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="editar-mes" className="text-sm font-medium">
              Mês da {ehGrupo ? "primeira parcela" : eDespesa ? "pagamento" : "recebimento"}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={salvando || excluindo}
                onClick={() => setMes(somarMes(mes, -1))}
                aria-label="Mês anterior"
                className="botao-min shrink-0 rounded-full hover:bg-foreground/5"
              >
                <span aria-hidden className="text-xl">
                  ‹
                </span>
              </button>
              <input
                id="editar-mes"
                readOnly
                disabled={salvando || excluindo}
                value={nomeMes(mes)}
                aria-readonly="true"
                className={`${inputClasse} min-w-0 flex-1 text-center`}
              />
              <button
                type="button"
                disabled={salvando || excluindo}
                onClick={() => setMes(somarMes(mes, 1))}
                aria-label="Próximo mês"
                className="botao-min shrink-0 rounded-full hover:bg-foreground/5"
              >
                <span aria-hidden className="text-xl">
                  ›
                </span>
              </button>
            </div>
          </div>

          {eDespesa && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Pagou com</legend>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["pix", "Pix", <IconePix key="pix" className="h-5 w-5" />],
                    ["boleto", "Boleto", <IconeBoleto key="boleto" className="h-5 w-5" />],
                    ["cartao", "Cartão", <IconeCartao key="cartao" className="h-5 w-5" />],
                  ] as const
                ).map(([f, rotulo, icone]) => (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={forma === f}
                    disabled={salvando || excluindo}
                    onClick={() => {
                      setForma(f);
                      setErro("");
                    }}
                    className={`botao-min flex flex-col items-center justify-center gap-1 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors ${
                      forma === f
                        ? "border-previsao bg-previsao text-white"
                        : "border-borda bg-campo text-foreground/70"
                    }`}
                  >
                    {icone}
                    {rotulo}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {eDespesa && forma === "cartao" && (
            <div className="flex flex-col gap-1">
              <label htmlFor="editar-cartao" className="text-sm font-medium">
                Cartão
              </label>
              <select
                id="editar-cartao"
                disabled={salvando || excluindo}
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

          <p aria-live="polite" className="min-h-5 text-sm text-despesa">
            {erro}
          </p>

          <button
            type="button"
            onClick={salvar}
            disabled={salvando || excluindo}
            className="botao-min w-full rounded-xl bg-previsao px-4 py-3 text-base font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {salvando ? (
              <span className="inline-flex items-center gap-1">
                Salvando
                <span className="pontinhos" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
              </span>
            ) : (
              "Salvar"
            )}
          </button>

          {/* Excluir com confirmação em duas etapas */}
          {confirmando ? (
            <div className="flex flex-col gap-2 rounded-xl border border-despesa bg-despesa/5 p-3">
              <p className="text-sm font-medium text-despesa">
                {ehGrupo
                  ? `Excluir todas as ${nParcelas} parcelas de "${descricao}"?`
                  : `Excluir "${descricao}"?`}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={excluir}
                  disabled={excluindo}
                  className="botao-min flex-1 rounded-xl bg-despesa px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {excluindo ? "Excluindo…" : "Sim, excluir"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmando(false)}
                  disabled={excluindo}
                  className="botao-min flex-1 rounded-xl border border-borda bg-surface px-4 py-2 text-sm font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              disabled={salvando || excluindo}
              className="botao-min w-full rounded-xl px-4 py-2 text-sm font-medium text-despesa hover:bg-despesa/10 disabled:opacity-60"
            >
              Excluir {ehGrupo ? "todas as parcelas" : ""}
            </button>
          )}

          <button
            type="button"
            onClick={onFechar}
            className="botao-min w-full rounded-xl px-4 py-2 text-sm font-medium text-foreground/60 hover:text-foreground"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
