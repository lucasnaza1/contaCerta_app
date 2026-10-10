"use client";

import { useState } from "react";
import { Abas } from "@/components/Abas";
import { db } from "@/lib/db";
import {
  avaliarPlano,
  calcularSobra,
  projetarAcumulado,
  resumirMes,
} from "@/lib/calculo";
import { formatarMoeda, mesAtual, nomeMesCurto, parseMoeda, somarMes } from "@/lib/mes";
import type { FixaExterna, Plano } from "@/lib/types";
import { useDados } from "@/lib/useDados";

const inputClasse =
  "botao-min w-full rounded-xl border border-borda bg-campo px-4 py-2.5 text-[15px] outline-none focus:border-previsao focus:ring-2 focus:ring-menta";

export default function PaginaSimular() {
  const { carregando, config, despesas, entradas, fixasExternas, planos } = useDados();
  const mesRef = mesAtual();

  const [nomeFixa, setNomeFixa] = useState("");
  const [valorFixa, setValorFixa] = useState("");
  const [erroFixa, setErroFixa] = useState("");

  const [nMeses, setNMeses] = useState(6);
  const [rendimento, setRendimento] = useState(0);

  const [nomePlano, setNomePlano] = useState("");
  const [valorPlano, setValorPlano] = useState("");
  const [prazoPlano, setPrazoPlano] = useState("");
  const [erroPlano, setErroPlano] = useState("");

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

  const resumoAtual = resumirMes(config, despesas, entradas, mesRef, mesRef);
  const sobra = calcularSobra(resumoAtual.entradas, resumoAtual.despesas, fixasExternas);
  const projecao = projetarAcumulado(sobra, nMeses, rendimento / 100);

  async function adicionarFixa() {
    const valor = parseMoeda(valorFixa);
    const nome = nomeFixa.trim();
    if (!nome || !Number.isFinite(valor) || valor <= 0) {
      setErroFixa("Preencha nome e valor mensal.");
      return;
    }
    const fixa: FixaExterna = { id: crypto.randomUUID(), nome, valor };
    await db.fixasExternas.add(fixa);
    setNomeFixa("");
    setValorFixa("");
    setErroFixa("");
  }

  async function removerFixa(id: string) {
    await db.fixasExternas.delete(id);
  }

  async function adicionarPlano() {
    const valor = parseMoeda(valorPlano);
    const prazo = Math.trunc(Number(prazoPlano));
    const nome = nomePlano.trim();
    if (!nome || !Number.isFinite(valor) || valor <= 0 || !Number.isFinite(prazo) || prazo < 1) {
      setErroPlano("Preencha nome, valor-alvo e prazo (em meses).");
      return;
    }
    const plano: Plano = { id: crypto.randomUUID(), nome, valorAlvo: valor, prazoMeses: prazo };
    await db.planos.add(plano);
    setNomePlano("");
    setValorPlano("");
    setPrazoPlano("");
    setErroPlano("");
  }

  async function removerPlano(id: string) {
    await db.planos.delete(id);
  }

  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-6">
        <h1 className="pb-4 text-lg font-bold">Simular</h1>

        {/* Fixas de fora: sempre visível; a pergunta só aparece enquanto não há fixas. */}
        <section aria-labelledby="titulo-fixas" className="pb-6">
          <h2 id="titulo-fixas" className="pb-2 text-[15px] font-bold">
            Despesas fixas fora do app
          </h2>
          {fixasExternas.length === 0 ? (
            <p className="pb-2 text-sm text-foreground/60">
              Você tem contas que paga todo mês e não registra aqui (ex.: aluguel, escola)?
              Adicione abaixo para a simulação ficar mais real.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 pb-2">
              {fixasExternas.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">
                    {f.nome} · <span className="tabular-nums">{formatarMoeda(f.valor)}</span>
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
          <div className="flex flex-col gap-2 rounded-2xl bg-surface p-4 shadow-sm">
            <div className="flex gap-2">
              <input
                aria-label="Nome da despesa fixa"
                value={nomeFixa}
                onChange={(e) => {
                  setNomeFixa(e.target.value);
                  setErroFixa("");
                }}
                placeholder="Ex.: Aluguel"
                className={inputClasse}
              />
              <input
                aria-label="Valor por mês"
                inputMode="decimal"
                value={valorFixa}
                onChange={(e) => {
                  setValorFixa(e.target.value);
                  setErroFixa("");
                }}
                placeholder="0,00"
                className={`${inputClasse} w-28 shrink-0 tabular-nums`}
              />
            </div>
            <button
              type="button"
              onClick={adicionarFixa}
              className="botao-min self-start rounded-xl bg-menta px-4 py-2 text-sm font-semibold text-foreground hover:bg-menta/80"
            >
              Adicionar
            </button>
            <p aria-live="polite" className="min-h-5 text-sm text-despesa">
              {erroFixa}
            </p>
          </div>
        </section>

        {/* Sobra */}
        <section aria-labelledby="titulo-sobra" className="pb-6">
          <h2 id="titulo-sobra" className="pb-2 text-[15px] font-bold">
            Quanto dá para guardar por mês
          </h2>
          <div className="rounded-2xl bg-surface p-4 shadow-sm">
            <p className="text-2xl font-bold tabular-nums text-previsao">
              {formatarMoeda(sobra)}
            </p>
            <p className="pt-1 text-xs text-foreground/50">
              {nomeMesCurto(mesRef)}: {formatarMoeda(resumoAtual.entradas)} de entradas −{" "}
              {formatarMoeda(resumoAtual.despesas)} de despesas do app −{" "}
              {formatarMoeda(fixasExternas.reduce((s, f) => s + f.valor, 0))} de fixas de fora
            </p>

            <div className="flex items-center gap-4 pt-4">
              <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-foreground/60">
                Projeção: {nMeses} meses
                <input
                  type="range"
                  min={1}
                  max={24}
                  value={nMeses}
                  onChange={(e) => setNMeses(Number(e.target.value))}
                  className="accent-menta-escura dark:accent-menta"
                  aria-label="Meses de projeção"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-foreground/60">
                Rendimento: {rendimento}% a.m.
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
            </div>

            <p className="pt-3 text-sm text-foreground/70">
              Em {nomeMesCurto(somarMes(mesRef, nMeses))}:{" "}
              <strong className="tabular-nums text-previsao">
                {formatarMoeda(projecao[projecao.length - 1] ?? 0)}
              </strong>{" "}
              acumulados
            </p>
          </div>
        </section>

        {/* Planos */}
        <section aria-labelledby="titulo-planos">
          <h2 id="titulo-planos" className="pb-2 text-[15px] font-bold">
            Planos
          </h2>
          <div className="flex flex-col gap-3">
            {planos.map((p) => {
              const r = avaliarPlano(p, sobra);
              return (
                <div key={p.id} className="rounded-2xl bg-surface p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[15px] font-semibold">{p.nome}</p>
                      <p className="text-xs text-foreground/50">
                        {formatarMoeda(p.valorAlvo)} em {p.prazoMeses} meses
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removerPlano(p.id)}
                      aria-label={`Remover plano ${p.nome}`}
                      className="botao-min shrink-0 rounded-full px-2 text-foreground/40 hover:text-despesa"
                    >
                      <span aria-hidden>×</span>
                    </button>
                  </div>
                  <p
                    className={`pt-2 text-sm font-medium ${
                      r.cabeNaSobra ? "text-previsao" : "text-despesa"
                    }`}
                  >
                    Guardar {formatarMoeda(r.guardarPorMes)}/mês —{" "}
                    {r.cabeNaSobra
                      ? "cabe na sua sobra"
                      : r.mesesNecessarios
                        ? `faltam ${formatarMoeda(r.faltaPorMes)}/mês; com a sobra atual dá em ${r.mesesNecessarios} meses`
                        : `faltam ${formatarMoeda(r.faltaPorMes)}/mês e não há sobra`}
                  </p>
                </div>
              );
            })}

            <div className="flex flex-col gap-2 rounded-2xl bg-surface p-4 shadow-sm">
              <div className="flex gap-2">
                <input
                  aria-label="Nome do plano"
                  value={nomePlano}
                  onChange={(e) => {
                    setNomePlano(e.target.value);
                    setErroPlano("");
                  }}
                  placeholder="Ex.: Viagem"
                  className={inputClasse}
                />
                <input
                  aria-label="Valor-alvo"
                  inputMode="decimal"
                  value={valorPlano}
                  onChange={(e) => {
                    setValorPlano(e.target.value);
                    setErroPlano("");
                  }}
                  placeholder="Valor"
                  className={`${inputClasse} w-28 shrink-0 tabular-nums`}
                />
              </div>
              <div className="flex gap-2">
                <input
                  aria-label="Prazo em meses"
                  inputMode="numeric"
                  value={prazoPlano}
                  onChange={(e) => {
                    setPrazoPlano(e.target.value);
                    setErroPlano("");
                  }}
                  placeholder="Prazo (meses)"
                  className={inputClasse}
                />
                <button
                  type="button"
                  onClick={adicionarPlano}
                  className="botao-min shrink-0 rounded-xl bg-menta px-4 py-2 text-sm font-semibold text-foreground hover:bg-menta/80"
                >
                  Adicionar
                </button>
              </div>
              <p aria-live="polite" className="min-h-5 text-sm text-despesa">
                {erroPlano}
              </p>
            </div>
          </div>
        </section>
      </main>
      <Abas />
    </div>
  );
}
