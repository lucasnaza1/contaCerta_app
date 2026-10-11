"use client";

import { useRef, useState } from "react";
import { Download, Pencil, Trash2, Upload } from "lucide-react";
import { Abas } from "@/components/Abas";
import { CampoValor } from "@/components/CampoValor";
import { IconeBanco } from "@/components/IconeBanco";
import { exportarBackup, lerBackup, salvarConfig, type ResumoBackup } from "@/lib/db";
import { formatarBRL } from "@/lib/dinheiro";
import {
  adicionarCartao,
  removerCartao,
  renomearCartao,
} from "@/lib/repositorio";
import { registrarBackupFeito, useUltimoBackup } from "@/lib/useUltimoBackup";
import { useDados } from "@/lib/useDados";
import { useModoEscuro } from "@/lib/useModoEscuro";

const inputClasse =
  "botao-min w-full min-w-0 rounded-xl border border-borda bg-campo px-4 py-2.5 text-[15px] outline-none focus:border-previsao focus:ring-2 focus:ring-menta";

export default function PaginaAjustes() {
  const { carregando, config, cartoes, despesas } = useDados();
  const { escuro, alternar } = useModoEscuro();
  const { ultimo } = useUltimoBackup();
  // null = ainda não editado: mostra o saldo salvo como ponto de partida.
  const [saldoEdicao, setSaldoEdicao] = useState<number | null>(null);
  const [nomeCartao, setNomeCartao] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const inputArquivo = useRef<HTMLInputElement>(null);

  // Estado da importação: arquivo lido, aguardando confirmação.
  const [previa, setPrevia] = useState<{ resumo: ResumoBackup; importar: () => Promise<void> } | null>(
    null
  );
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

  async function aoAdicionarCartao() {
    const nome = nomeCartao.trim();
    if (!nome) return;
    if (cartoes.some((c) => c.nome.toLowerCase() === nome.toLowerCase())) {
      setNomeCartao("");
      return;
    }
    await adicionarCartao(nome);
    setNomeCartao("");
  }

  async function aoRenomearCartao(id: string, nomeAtual: string) {
    const nome = window.prompt("Novo nome do cartão:", nomeAtual)?.trim();
    if (!nome || nome === nomeAtual) return;
    await renomearCartao(id, nome);
  }

  async function aoRemoverCartao(id: string, nome: string) {
    const emUso = despesas.filter((d) => d.cartaoId === id).length;
    const confirmou = window.confirm(
      emUso > 0
        ? `Existem ${emUso} despesa(s) neste cartão. Elas continuam existindo, mas ficam sem cartão. Remover "${nome}"?`
        : `Remover o cartão "${nome}"?`
    );
    if (!confirmou) return;
    await removerCartao(id);
  }

  async function baixarBackup() {
    const blob = await exportarBackup();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conta-certa-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    registrarBackupFeito();
    setAviso("Backup exportado.");
  }

  async function aoEscolherArquivo(arquivo: File) {
    setAviso("");
    setErro("");
    try {
      const leitura = await lerBackup(arquivo);
      setPrevia(leitura);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível ler o arquivo.");
    } finally {
      if (inputArquivo.current) inputArquivo.current.value = "";
    }
  }

  async function confirmarImportacao() {
    if (!previa) return;
    setImportando(true);
    try {
      await previa.importar();
      setPrevia(null);
      setAviso("Backup importado com sucesso.");
    } catch {
      setErro("Falha ao importar o backup. Nada foi alterado.");
    } finally {
      setImportando(false);
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
              <CampoValor
                id="saldo-inicial"
                label="Quanto você tinha"
                centavos={saldoCampo}
                onCentavos={(c) => {
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
              {configAtual.saldoInicial > 0 ? ` (hoje: ${formatarBRL(configAtual.saldoInicial)})` : ""}.
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
                  <li key={c.id} className="flex items-center justify-between gap-2 py-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <IconeBanco nome={c.nome} tamanho={24} />
                      <span className="truncate text-[15px]">{c.nome}</span>
                    </span>
                    <span className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => aoRenomearCartao(c.id, c.nome)}
                        aria-label={`Renomear ${c.nome}`}
                        className="botao-min rounded-full px-2 text-foreground/50 hover:text-foreground"
                      >
                        <Pencil aria-hidden className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => aoRemoverCartao(c.id, c.nome)}
                        aria-label={`Remover ${c.nome}`}
                        className="botao-min rounded-full px-2 text-foreground/40 hover:text-despesa"
                      >
                        <Trash2 aria-hidden className="h-4 w-4" />
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
                    aoAdicionarCartao();
                  }
                }}
                placeholder="Ex.: Nubank"
                className={inputClasse}
              />
              <button
                type="button"
                onClick={aoAdicionarCartao}
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
              {ultimo
                ? ` Último backup: ${ultimo.toLocaleDateString("pt-BR")}.`
                : " Você ainda não exportou nenhum backup."}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={baixarBackup}
                className="botao-min inline-flex items-center justify-center gap-2 rounded-xl bg-previsao px-4 py-2.5 text-sm font-semibold text-white"
              >
                <Download aria-hidden className="h-4 w-4" />
                Exportar
              </button>
              <button
                type="button"
                onClick={() => inputArquivo.current?.click()}
                className="botao-min inline-flex items-center justify-center gap-2 rounded-xl border border-borda bg-surface px-4 py-2.5 text-sm font-semibold text-foreground/70"
              >
                <Upload aria-hidden className="h-4 w-4" />
                Importar
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

            {/* Confirmação de importação com resumo */}
            {previa && (
              <div
                role="alertdialog"
                aria-labelledby="importar-titulo"
                className="flex flex-col gap-3 rounded-2xl border-2 border-despesa/60 bg-surface p-4 shadow-sm"
              >
                <h3 id="importar-titulo" className="text-[15px] font-bold text-despesa">
                  Substituir todos os dados?
                </h3>
                <p className="text-sm text-foreground/70">
                  O arquivo tem {previa.resumo.despesas} despesa(s), {previa.resumo.entradas}{" "}
                  entrada(s) e {previa.resumo.cartoes} cartão(ões). Importar{" "}
                  <strong>vai apagar os dados atuais</strong> deste aparelho.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={confirmarImportacao}
                    disabled={importando}
                    className="botao-min flex-1 rounded-xl bg-despesa px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {importando ? "Importando…" : "Sim, importar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrevia(null)}
                    disabled={importando}
                    className="botao-min flex-1 rounded-xl border border-borda bg-surface px-4 py-2 text-sm font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
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
