"use client";

import { useRef, useState } from "react";
import { Abas } from "@/components/Abas";
import { CampoMoeda } from "@/components/CampoMoeda";
import { db, exportarBackup, importarBackup, salvarConfig } from "@/lib/db";
import { formatarMoeda } from "@/lib/mes";
import type { Backup, Cartao } from "@/lib/types";
import { useDados } from "@/lib/useDados";
import { useModoEscuro } from "@/lib/useModoEscuro";

const inputClasse =
  "botao-min w-full min-w-0 rounded-xl border border-borda bg-campo px-4 py-2.5 text-[15px] outline-none focus:border-previsao focus:ring-2 focus:ring-menta";

export default function PaginaAjustes() {
  const { carregando, config, cartoes, despesas } = useDados();
  const { escuro, alternar } = useModoEscuro();
  // null = ainda não editado: mostra o saldo salvo como ponto de partida.
  const [saldoEdicao, setSaldoEdicao] = useState<number | null>(null);
  const [nomeCartao, setNomeCartao] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const inputArquivo = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);

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
          <h1 className="pb-4 text-lg font-bold">Ajustes</h1>
          <p className="text-sm text-foreground/60">
            Faça o cadastro inicial na tela Mês para começar.
          </p>
        </main>
        <Abas />
      </div>
    );
  }

  const configAtual = config;
  const saldoCampo = saldoEdicao ?? configAtual.saldoInicial;

  async function salvarSaldo() {
    if (saldoCampo < 0) {
      setErro("Digite um saldo válido.");
      return;
    }
    await salvarConfig({ saldoInicial: saldoCampo, mesInicial: configAtual.mesInicial });
    setErro("");
    setAviso("Saldo inicial salvo.");
  }

  async function adicionarCartao() {
    const nome = nomeCartao.trim();
    if (!nome) return;
    if (cartoes.some((c) => c.nome.toLowerCase() === nome.toLowerCase())) {
      setNomeCartao("");
      return;
    }
    const cartao: Cartao = { id: crypto.randomUUID(), nome };
    await db.cartoes.add(cartao);
    setNomeCartao("");
  }

  async function renomearCartao(cartao: Cartao) {
    const nome = window.prompt("Novo nome do cartão:", cartao.nome)?.trim();
    if (!nome || nome === cartao.nome) return;
    await db.cartoes.update(cartao.id, { nome });
  }

  async function removerCartao(cartao: Cartao) {
    const emUso = despesas.filter((d) => d.cartaoId === cartao.id).length;
    const confirmou = window.confirm(
      emUso > 0
        ? `Existem ${emUso} despesa(s) neste cartão. Elas continuam existindo, mas ficam sem cartão. Remover "${cartao.nome}"?`
        : `Remover o cartão "${cartao.nome}"?`
    );
    if (!confirmou) return;
    await db.transaction("rw", [db.cartoes, db.despesas], async () => {
      await db.cartoes.delete(cartao.id);
      await db.despesas.where("cartaoId").equals(cartao.id).modify({ cartaoId: undefined });
    });
  }

  async function baixarBackup() {
    const backup = await exportarBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conta-certa-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function aoEscolherArquivo(arquivo: File) {
    setImportando(true);
    setAviso("");
    setErro("");
    try {
      const texto = await arquivo.text();
      const backup = JSON.parse(texto) as Backup;
      await importarBackup(backup);
      setAviso("Backup importado com sucesso.");
    } catch {
      setErro("Não foi possível importar. Confira se o arquivo é um backup do Conta Certa.");
    } finally {
      setImportando(false);
      if (inputArquivo.current) inputArquivo.current.value = "";
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-6">
        <h1 className="pb-4 text-lg font-bold">Ajustes</h1>

        <div className="flex flex-col gap-6">
          {/* Aparência */}
          <section aria-labelledby="titulo-aparencia" className="flex flex-col gap-2">
            <h2 id="titulo-aparencia" className="text-[15px] font-bold">
              Aparência
            </h2>
            <label className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-4 shadow-sm">
              <span className="text-[15px] font-medium">Modo escuro</span>
              <span className="relative inline-flex">
                <input
                  type="checkbox"
                  checked={escuro}
                  onChange={(e) => alternar(e.target.checked)}
                  className="peer sr-only"
                  aria-label="Ativar modo escuro"
                />
                <span
                  aria-hidden
                  className="h-7 w-12 rounded-full border-2 border-borda bg-background transition-colors peer-checked:border-previsao peer-checked:bg-previsao peer-focus-visible:ring-2 peer-focus-visible:ring-menta"
                />
                <span
                  aria-hidden
                  className="absolute top-1 left-1 h-5 w-5 rounded-full bg-foreground/70 shadow transition-transform peer-checked:translate-x-5 peer-checked:bg-white"
                />
              </span>
            </label>
          </section>

          {/* Saldo inicial */}
          <section aria-labelledby="titulo-saldo" className="flex flex-col gap-2">
            <h2 id="titulo-saldo" className="text-[15px] font-bold">
              Saldo inicial
            </h2>
            <div className="flex flex-wrap items-end gap-2">
              <CampoMoeda
                id="saldo-inicial"
                rotulo="Quanto você tinha"
                valorCentavos={saldoCampo}
                onValor={(c) => {
                  setSaldoEdicao(c);
                  setErro("");
                  setAviso("");
                }}
                className="min-w-0 flex-1 basis-44"
              />
              <button
                type="button"
                onClick={salvarSaldo}
                className="botao-min shrink-0 rounded-xl bg-previsao px-4 py-2.5 text-sm font-semibold text-white"
              >
                Salvar
              </button>
            </div>
            <p className="text-xs text-foreground/50">
              Quanto você tinha quando começou a usar o app
              {configAtual.saldoInicial > 0 ? ` (hoje: ${formatarMoeda(configAtual.saldoInicial)})` : ""}.
            </p>
          </section>

          {/* Cartões */}
          <section aria-labelledby="titulo-cartoes" className="flex flex-col gap-2">
            <h2 id="titulo-cartoes" className="text-[15px] font-bold">
              Cartões
            </h2>
            <ul className="flex flex-col gap-1 rounded-2xl bg-surface p-4 shadow-sm">
              {cartoes.length === 0 ? (
                <li className="text-sm text-foreground/50">Nenhum cartão cadastrado.</li>
              ) : (
                cartoes.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <span className="truncate text-[15px]">{c.nome}</span>
                    <span className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => renomearCartao(c)}
                        aria-label={`Renomear ${c.nome}`}
                        className="botao-min rounded-full px-2 text-foreground/50 hover:text-foreground"
                      >
                        <span aria-hidden>✎</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removerCartao(c)}
                        aria-label={`Remover ${c.nome}`}
                        className="botao-min rounded-full px-2 text-foreground/40 hover:text-despesa"
                      >
                        <span aria-hidden>×</span>
                      </button>
                    </span>
                  </li>
                ))
              )}
            </ul>
            <div className="flex gap-2">
              <input
                aria-label="Nome do novo cartão"
                value={nomeCartao}
                onChange={(e) => setNomeCartao(e.target.value)}
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
                className="botao-min shrink-0 rounded-xl bg-menta px-4 py-2 text-sm font-semibold text-foreground hover:bg-menta/80"
              >
                Adicionar
              </button>
            </div>
          </section>

          {/* Backup */}
          <section aria-labelledby="titulo-backup" className="flex flex-col gap-2">
            <h2 id="titulo-backup" className="text-[15px] font-bold">
              Backup
            </h2>
            <p className="text-xs text-foreground/50">
              Seus dados ficam só neste aparelho. Exporte de tempos em tempos para não
              perder nada ao trocar de celular.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={baixarBackup}
                className="botao-min rounded-xl bg-previsao px-4 py-2.5 text-sm font-semibold text-white"
              >
                Exportar
              </button>
              <button
                type="button"
                onClick={() => inputArquivo.current?.click()}
                disabled={importando}
                className="botao-min rounded-xl border border-borda bg-surface px-4 py-2.5 text-sm font-semibold text-foreground/70 disabled:opacity-60"
              >
                {importando ? "Importando…" : "Importar"}
              </button>
            </div>
            <input
              ref={inputArquivo}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Selecionar arquivo de backup"
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                if (arquivo) aoEscolherArquivo(arquivo);
              }}
            />
          </section>

          <p aria-live="polite" className="min-h-5 text-sm">
            {erro && <span className="text-despesa">{erro}</span>}
            {aviso && <span className="text-previsao">{aviso}</span>}
          </p>
        </div>
      </main>
      <Abas />
    </div>
  );
}
