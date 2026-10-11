"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Barcode, CreditCard, Plus, QrCode } from "lucide-react";
import { Abas } from "@/components/Abas";
import { CampoValor } from "@/components/CampoValor";
import { IconeBanco } from "@/components/IconeBanco";
import { adicionarDespesa, adicionarEntrada } from "@/lib/repositorio";
import { formatarBRL } from "@/lib/dinheiro";
import { dividirParcelas, mesAtual, mesValido, nomeMes, somarMes } from "@/lib/mes";
import type { Forma } from "@/lib/tipos";
import { useDados } from "@/lib/useDados";

type Modo = "despesa" | "entrada";

const inputClasse =
  "botao-min w-full min-w-0 rounded-xl border border-borda bg-campo px-4 py-2.5 text-[15px] outline-none focus:border-previsao focus:ring-2 focus:ring-menta";
const botaoPrimario =
  "botao-min w-full rounded-xl bg-previsao px-4 py-3 text-base font-semibold text-white hover:opacity-90 disabled:opacity-60";

const OPCOES_PARCELAS = Array.from({ length: 24 }, (_, i) => i + 1);

export default function PaginaAdicionar() {
  const router = useRouter();
  const { carregando, cartoes } = useDados();

  const [modo, setModo] = useState<Modo>("despesa");
  const [valorCentavos, setValorCentavos] = useState(0);
  const [descricao, setDescricao] = useState("");
  // Mês vem da query (?mes=2026-10) quando aberto a partir da tela Mês.
  const [mes, setMes] = useState(() => {
    if (typeof window === "undefined") return mesAtual();
    const m = new URLSearchParams(window.location.search).get("mes");
    return m && mesValido(m) ? m : mesAtual();
  });
  const [forma, setForma] = useState<Forma>("pix");
  const [cartaoId, setCartaoId] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [recebida, setRecebida] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const valorValido = valorCentavos > 0;
  const partes = valorValido && parcelas > 1 ? dividirParcelas(valorCentavos, parcelas) : null;

  function limparFormulario() {
    setValorCentavos(0);
    setDescricao("");
    setForma("pix");
    setCartaoId("");
    setParcelas(1);
    setRecebida(false);
    setErro("");
  }

  async function salvar() {
    if (salvando) return;
    if (!valorValido) {
      setErro("Digite um valor maior que zero.");
      return;
    }
    if (!descricao.trim()) {
      setErro("Escreva uma descrição.");
      return;
    }
    if (modo === "despesa" && forma === "cartao" && !cartaoId) {
      setErro("Escolha o cartão.");
      return;
    }

    setSalvando(true);
    setErro("");
    try {
      if (modo === "entrada") {
        await adicionarEntrada({
          descricao,
          valor: valorCentavos,
          mes,
          parcelas,
          // A 1x pode entrar já como recebida; parcelas são sempre a receber.
          ...(parcelas === 1 ? { recebida } : {}),
        });
      } else {
        await adicionarDespesa({
          descricao,
          valor: valorCentavos,
          mes,
          forma,
          ...(forma === "cartao" ? { cartaoId } : {}),
          parcelas,
        });
      }

      // Feedback mínimo de salvamento antes de liberar o botão.
      await new Promise((resolve) => setTimeout(resolve, 1000));
      limparFormulario();
      router.push("/");
    } catch {
      setErro("Não foi possível salvar. Tente de novo.");
    } finally {
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
              className={`botao-min flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold capitalize transition-colors ${
                modo === m ? "bg-surface text-foreground shadow-sm" : "text-foreground/60"
              }`}
            >
              {m === "despesa" ? (
                <CreditCard aria-hidden className="h-4 w-4" strokeWidth={2} />
              ) : (
                <Plus aria-hidden className="h-4 w-4" strokeWidth={2.5} />
              )}
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
          <CampoValor
            id="valor"
            label={`Valor ${parcelas > 1 ? "total" : ""}`}
            centavos={valorCentavos}
            onCentavos={(c) => {
              setValorCentavos(c);
              setErro("");
            }}
            disabled={salvando}
            erro={!!erro && !valorValido ? erro : undefined}
            descricao={
              partes ? `${parcelas}x de ${formatarBRL(partes[0])}` : undefined
            }
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="descricao" className="text-sm font-medium">
              Descrição
            </label>
            <input
              id="descricao"
              autoComplete="off"
              maxLength={80}
              disabled={salvando}
              value={descricao}
              onChange={(e) => {
                setDescricao(e.target.value);
                setErro("");
              }}
              placeholder={modo === "despesa" ? "Ex.: Internet" : "Ex.: Salário"}
              className={inputClasse}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="mes" className="text-sm font-medium">
              Mês de {modo === "despesa" ? "pagamento" : "recebimento"}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMes(somarMes(mes, -1))}
                aria-label="Mês anterior"
                className="botao-min shrink-0 rounded-full hover:bg-foreground/5"
              >
                <span aria-hidden className="text-xl">
                  ‹
                </span>
              </button>
              <input
                id="mes"
                readOnly
                disabled={salvando}
                value={nomeMes(mes)}
                aria-readonly="true"
                className={`${inputClasse} min-w-0 flex-1 text-center`}
              />
              <button
                type="button"
                onClick={() => setMes(somarMes(mes, 1))}
                aria-label="Próximo mês"
                className="botao-min shrink-0 rounded-full hover:bg-foreground/5"
              >
                <span aria-hidden className="text-xl">
                  ›
                </span>
              </button>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={salvando || mes === mesAtual()}
                onClick={() => setMes(mesAtual())}
                className="rounded-full px-3 py-1 text-xs font-medium text-previsao hover:bg-menta/20 disabled:opacity-40"
              >
                Mês atual
              </button>
              <button
                type="button"
                disabled={salvando || mes === somarMes(mesAtual(), 1)}
                onClick={() => setMes(somarMes(mesAtual(), 1))}
                className="rounded-full px-3 py-1 text-xs font-medium text-previsao hover:bg-menta/20 disabled:opacity-40"
              >
                Próximo mês
              </button>
            </div>
          </div>

          {/* Parcelas: vale para despesa e entrada */}
          <div className="flex flex-col gap-1">
            <label htmlFor="parcelas" className="text-sm font-medium">
              {modo === "despesa" ? "Pagar" : "Receber"}
            </label>
            <select
              id="parcelas"
              disabled={salvando}
              value={parcelas}
              onChange={(e) => setParcelas(Number(e.target.value))}
              className={inputClasse}
            >
              {OPCOES_PARCELAS.map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? "1x (à vista)" : `${n}x`}
                </option>
              ))}
            </select>
          </div>

          {modo === "despesa" && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Pagou com</legend>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["pix", "Pix", <QrCode key="pix" aria-hidden className="h-5 w-5" strokeWidth={2} />],
                    ["boleto", "Boleto", <Barcode key="boleto" aria-hidden className="h-5 w-5" strokeWidth={2} />],
                    ["cartao", "Cartão", <CreditCard key="cartao" aria-hidden className="h-5 w-5" strokeWidth={2} />],
                  ] as const
                ).map(([f, rotulo, icone]) => (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={forma === f}
                    disabled={salvando}
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

          {modo === "despesa" && forma === "cartao" && (
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
                  <div className="flex min-w-0 items-center gap-2">
                    {(() => {
                      const c = cartoes.find((x) => x.id === cartaoId);
                      return c ? (
                        <IconeBanco nome={c.nome} tamanho={36} className="shrink-0" />
                      ) : null;
                    })()}
                    <select
                      id="cartao"
                      disabled={salvando}
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
                </div>
              )}
            </div>
          )}

          {modo === "entrada" && parcelas === 1 && (
            <label className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-sm">
              <input
                type="checkbox"
                disabled={salvando}
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
        </form>
      </main>
      <Abas />
    </div>
  );
}
