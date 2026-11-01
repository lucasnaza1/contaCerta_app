"use client";

import { useState } from "react";
import { Abas } from "@/components/Abas";
import { CampoValor } from "@/components/CampoValor";
import { db } from "@/lib/db";
import { calcularSobra, resumirMes, simularEconomia, type Simulacao } from "@/lib/calculos";
import { formatarBRL } from "@/lib/dinheiro";
import { mesAtual, nomeMesAno, somarMes } from "@/lib/mes";
import type { FixaExterna } from "@/lib/tipos";
import { useDados } from "@/lib/useDados";

const inputClasse =
  "botao-min w-full min-w-0 rounded-xl border border-borda bg-campo px-4 py-2.5 text-[15px] outline-none focus:border-previsao focus:ring-2 focus:ring-menta";

const OPCOES_MESES = Array.from({ length: 24 }, (_, i) => i + 1);

export default function PaginaSimular() {
  const { carregando, config, despesas, entradas, fixasExternas } = useDados();
  const mesRef = mesAtual();

  const [valorAlvo, setValorAlvo] = useState(0);
  const [nMeses, setNMeses] = useState(12);
  // Simulação começa no mês subsequente por padrão (como as contas).
  const [mesInicial, setMesInicial] = useState(somarMes(mesRef, 1));
  const [rendimento, setRendimento] = useState(0);

  const [nomeFixa, setNomeFixa] = useState("");
  const [valorFixa, setValorFixa] = useState(0);
  const [erroFixa, setErroFixa] = useState("");
  const [erro, setErro] = useState("");

  if (carregando) {
    return (
      <div className="flex flex-1 items-center justify-center" role="status" aria-label="Carregando">
        <p className="animate-pulse text-sm text-foreground/50">Carregando…</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex flex-1 flex-col">
        <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-6">
          <h1 className="pb-4 text-lg font-bold">Simular</h1>
          <p className="text-sm text-foreground/60">
            Faça o cadastro inicial na tela Mês para começar.
          </p>
        </main>
        <Abas />
      </div>
    );
  }

  const resumoAtual = resumirMes(config, despesas, entradas, mesRef);
  const sobra = calcularSobra(resumoAtual.entradas, resumoAtual.despesas, fixasExternas);
  const totalFixas = fixasExternas.reduce((s, f) => s + f.valor, 0);

  const simulacao: Simulacao | null =
    valorAlvo > 0 && nMeses >= 1
      ? simularEconomia(valorAlvo, nMeses, mesInicial, rendimento / 100)
      : null;
  const cabeNaSobra = simulacao ? simulacao.depositoMensal <= sobra : false;

  async function adicionarFixa() {
    const nome = nomeFixa.trim();
    if (!nome || valorFixa <= 0) {
      setErroFixa("Preencha nome e valor mensal.");
      return;
    }
    const fixa: FixaExterna = { id: crypto.randomUUID(), nome, valor: valorFixa };
    await db.fixasExternas.add(fixa);
    setNomeFixa("");
    setValorFixa(0);
    setErroFixa("");
  }

  async function removerFixa(id: string) {
    await db.fixasExternas.delete(id);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <main className="mx-auto w-full max-w-md min-w-0 flex-1 px-4 pt-4 pb-6">
        <h1 className="pb-4 text-lg font-bold">Simular</h1>

        {/* Simulação de economia */}
        <section aria-labelledby="titulo-simulacao" className="pb-6">
          <h2 id="titulo-simulacao" className="pb-2 text-[15px] font-bold">
            Quanto guardar por mês
          </h2>
          <div className="flex flex-col gap-4 rounded-2xl bg-surface p-4 shadow-sm">
            <CampoValor
              id="valor-alvo"
              label="Quero juntar"
              centavos={valorAlvo}
              onCentavos={(c) => {
                setValorAlvo(c);
                setErro("");
              }}
              erro={!!erro && valorAlvo <= 0 ? erro : undefined}
            />

            <div className="flex flex-col gap-1">
              <label htmlFor="n-meses" className="text-sm font-medium">
                Em quantos meses
              </label>
              <select
                id="n-meses"
                value={nMeses}
                onChange={(e) => setNMeses(Number(e.target.value))}
                className={inputClasse}
              >
                {OPCOES_MESES.map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? "1 mês" : `${n} meses`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="mes-inicial" className="text-sm font-medium">
                Começando em
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMesInicial(somarMes(mesInicial, -1))}
                  aria-label="Mês anterior"
                  className="botao-min shrink-0 rounded-full hover:bg-foreground/5"
                >
                  <span aria-hidden className="text-xl">
                    ‹
                  </span>
                </button>
                <input
                  id="mes-inicial"
                  readOnly
                  value={nomeMesAno(mesInicial)}
                  aria-readonly="true"
                  className={`${inputClasse} min-w-0 flex-1 text-center`}
                />
                <button
                  type="button"
                  onClick={() => setMesInicial(somarMes(mesInicial, 1))}
                  aria-label="Próximo mês"
                  className="botao-min shrink-0 rounded-full hover:bg-foreground/5"
                >
                  <span aria-hidden className="text-xl">
                    ›
                  </span>
                </button>
              </div>
            </div>

            <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-foreground/60">
              Rendimento: {rendimento.toLocaleString("pt-BR")}% a.m. (opcional)
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={rendimento}
                onChange={(e) => setRendimento(Number(e.target.value))}
                className="accent-menta-escura dark:accent-menta"
                aria-label="Rendimento mensal em porcentagem"
              />
            </label>

            {simulacao ? (
              <div className="flex flex-col gap-2" aria-live="polite">
                <p className="break-words text-sm">
                  Guarde{" "}
                  <strong className="tabular-nums text-previsao">
                    {formatarBRL(simulacao.depositoMensal)}
                  </strong>{" "}
                  por mês durante {nMeses === 1 ? "1 mês" : `${nMeses} meses`} e você terá{" "}
                  <strong className="tabular-nums text-previsao">
                    {formatarBRL(simulacao.total)}
                  </strong>{" "}
                  em {nomeMesAno(simulacao.mesFinal)}.
                </p>
                <p
                  className={`text-xs font-medium ${
                    cabeNaSobra ? "text-previsao" : "text-despesa"
                  }`}
                >
                  {cabeNaSobra
                    ? `Cabe na sua sobra de ${formatarBRL(sobra)}/mês (${nomeMesAno(mesRef)}).`
                    : `Não cabe na sua sobra de ${formatarBRL(sobra)}/mês (${nomeMesAno(mesRef)}).`}
                </p>

                {/* Cenário mês a mês */}
                <div className="overflow-hidden rounded-xl border border-borda">
                  <table className="w-full text-sm">
                    <caption className="sr-only">
                      Simulação mês a mês de {nomeMesAno(simulacao.meses[0]?.mes ?? mesInicial)} a{" "}
                      {nomeMesAno(simulacao.mesFinal)}
                    </caption>
                    <thead>
                      <tr className="bg-foreground/5 text-left text-xs text-foreground/60">
                        <th scope="col" className="px-3 py-2 font-medium">
                          Mês
                        </th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">
                          Depósito
                        </th>
                        {rendimento > 0 && (
                          <th scope="col" className="px-3 py-2 text-right font-medium">
                            Rend.
                          </th>
                        )}
                        <th scope="col" className="px-3 py-2 text-right font-medium">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulacao.meses.map((m) => (
                        <tr key={m.mes} className="border-t border-borda">
                          <td className="px-3 py-2">{nomeMesAno(m.mes)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatarBRL(m.deposito)}
                          </td>
                          {rendimento > 0 && (
                            <td className="px-3 py-2 text-right tabular-nums text-previsao">
                              {formatarBRL(m.rendimento)}
                            </td>
                          )}
                          <td className="px-3 py-2 text-right font-semibold tabular-nums">
                            {formatarBRL(m.acumulado)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-foreground/50">
                Digite quanto quer juntar para ver a simulação.
              </p>
            )}
          </div>
        </section>

        {/* Fixas de fora: base da sobra usada na simulação */}
        <section aria-labelledby="titulo-fixas">
          <h2 id="titulo-fixas" className="pb-2 text-[15px] font-bold">
            Despesas fixas fora do app
          </h2>
          <div className="flex flex-col gap-2 rounded-2xl bg-surface p-4 shadow-sm">
            <p className="text-xs text-foreground/50">
              {nomeMesAno(mesRef)}: {formatarBRL(resumoAtual.entradas)} de entradas −{" "}
              {formatarBRL(resumoAtual.despesas)} de despesas do app −{" "}
              {formatarBRL(totalFixas)} de fixas de fora = sobra de{" "}
              <strong className="text-previsao">{formatarBRL(sobra)}</strong>
            </p>
            {fixasExternas.length > 0 && (
              <ul className="flex flex-col gap-1">
                {fixasExternas.map((f) => (
                  <li key={f.id} className="flex min-w-0 items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">
                      {f.nome} · <span className="tabular-nums">{formatarBRL(f.valor)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removerFixa(f.id)}
                      aria-label={`Remover ${f.nome}`}
                      className="botao-min shrink-0 rounded-full px-2 text-foreground/40 hover:text-despesa"
                    >
                      <span aria-hidden>×</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-[3] basis-40">
                <label htmlFor="nome-fixa" className="text-sm font-medium">
                  Nome
                </label>
                <input
                  id="nome-fixa"
                  value={nomeFixa}
                  onChange={(e) => {
                    setNomeFixa(e.target.value);
                    setErroFixa("");
                  }}
                  placeholder="Ex.: Aluguel"
                  className={inputClasse}
                />
              </div>
              <div className="min-w-0 flex-[2] basis-32">
                <CampoValor
                  id="valor-fixa"
                  label="Valor/mês"
                  centavos={valorFixa}
                  onCentavos={(c) => {
                    setValorFixa(c);
                    setErroFixa("");
                  }}
                />
              </div>
              <button
                type="button"
                onClick={adicionarFixa}
                className="botao-min shrink-0 rounded-xl bg-menta px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-menta/80"
              >
                Adicionar
              </button>
            </div>
            <p aria-live="polite" className="min-h-5 text-sm text-despesa">
              {erroFixa}
            </p>
          </div>
        </section>
      </main>
      <Abas />
    </div>
  );
}
