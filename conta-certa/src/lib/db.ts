import Dexie, { type Table } from "dexie";
import type {
  Backup,
  Cartao,
  Config,
  Despesa,
  Entrada,
  FixaExterna,
  Plano,
} from "./tipos";

// dexie-export-import referencia `self` no escopo do módulo, o que quebra o
// prerender estático (SSR) do Next. Carregamos só no navegador.
async function moduloExportImport() {
  return import("dexie-export-import");
}

export class ContaCertaDB extends Dexie {
  despesas!: Table<Despesa, string>;
  entradas!: Table<Entrada, string>;
  cartoes!: Table<Cartao, string>;
  config!: Table<Config, string>;
  planos!: Table<Plano, string>;
  fixasExternas!: Table<FixaExterna, string>;

  constructor() {
    super("conta-certa");
    this.version(1).stores({
      despesas: "id, mes, compraId, cartaoId, paga",
      entradas: "id, mes, recebida",
      cartoes: "id, nome",
      config: "id",
      planos: "id",
      fixasExternas: "id",
    });
    // v2: índice para buscar/excluir grupos de parcelas de entrada.
    this.version(2).stores({
      entradas: "id, mes, recebida, grupoId",
    });
    // v3: índices compostos do documento de bibliotecas.
    this.version(3).stores({
      despesas: "id, mes, compraId, cartaoId, paga, [mes+paga]",
      entradas: "id, mes, recebida, grupoId, [mes+recebida]",
    });
  }
}

export const db = new ContaCertaDB();

/** Config atual ou undefined no primeiro uso (antes do cadastro inicial). */
export async function lerConfig(): Promise<Config | undefined> {
  return db.config.get("config");
}

export async function salvarConfig(config: Omit<Config, "id">): Promise<void> {
  await db.config.put({ ...config, id: "config" });
}

/**
 * Exporta o banco inteiro (formato dexie-export-import) como Blob JSON.
 * A gravação da data do último backup fica a cargo do chamador
 * (localStorage), para o aviso dos 30 dias.
 */
export async function exportarBackup(): Promise<Blob> {
  const { exportDB } = await moduloExportImport();
  return exportDB(db, { prettyJson: true });
}

export interface ResumoBackup {
  despesas: number;
  entradas: number;
  cartoes: number;
}

/** Lê o arquivo escolhido e valida que é um backup do Conta Certa. */
export async function lerBackup(
  arquivo: File
): Promise<{ resumo: ResumoBackup; importar: () => Promise<void> }> {
  let preview;
  try {
    const { peakImportFile } = await moduloExportImport();
    preview = await peakImportFile(arquivo);
  } catch {
    throw new Error("Arquivo de backup inválido.");
  }
  if (!preview || preview.formatName !== "dexie" || !preview.data) {
    throw new Error("Arquivo de backup inválido.");
  }
  const nomes = new Set(
    // @ts-expect-error estrutura interna do preview por tabela
    Object.values(preview.data.tables as Record<string, { name: string }>).map((t) => t.name)
  );
  if (!nomes.has("despesas") || !nomes.has("config")) {
    throw new Error("Este arquivo não é um backup do Conta Certa.");
  }
  const contar = (tabela: string) =>
    // @ts-expect-error estrutura interna do preview por tabela
    Object.values(preview.data!.tables as Record<string, { name: string; rowCount: number }>).find(
      (t) => t.name === tabela
    )?.rowCount ?? 0;

  return {
    resumo: {
      despesas: contar("despesas"),
      entradas: contar("entradas"),
      cartoes: contar("cartoes"),
    },
    /** Confirmação dada: limpa as tabelas e importa o arquivo por cima. */
    importar: async () => {
      const { importInto } = await moduloExportImport();
      await importInto(db, arquivo, {
        clearTablesBeforeImport: true,
        acceptVersionDiff: true,
        acceptMissingTables: true,
        acceptNameDiff: true,
        acceptChangedPrimaryKey: true,
      });
    },
  };
}

// ---------- Backup legado (JSON simples, versão 1) ----------
// Mantido para o botão Exportar/Importar de Ajustes enquanto migramos
// para o fluxo novo com resumo e confirmação.

export async function exportarBackupLegado(): Promise<Backup> {
  const [config] = await db.config.toArray();
  return {
    versao: 1,
    exportadoEm: new Date().toISOString(),
    config: config ?? { id: "config", mesInicial: "" },
    cartoes: await db.cartoes.toArray(),
    despesas: await db.despesas.toArray(),
    entradas: await db.entradas.toArray(),
    planos: await db.planos.toArray(),
    fixasExternas: await db.fixasExternas.toArray(),
  };
}

export async function importarBackupLegado(backup: Backup): Promise<void> {
  if (!backup || backup.versao !== 1 || !backup.config?.id) {
    throw new Error("Arquivo de backup inválido.");
  }
  await db.transaction(
    "rw",
    [db.config, db.cartoes, db.despesas, db.entradas, db.planos, db.fixasExternas],
    async () => {
      await Promise.all([
        db.config.clear(),
        db.cartoes.clear(),
        db.despesas.clear(),
        db.entradas.clear(),
        db.planos.clear(),
        db.fixasExternas.clear(),
      ]);
      await db.config.put(backup.config);
      if (backup.cartoes?.length) await db.cartoes.bulkPut(backup.cartoes);
      if (backup.despesas?.length) await db.despesas.bulkPut(backup.despesas);
      if (backup.entradas?.length) await db.entradas.bulkPut(backup.entradas);
      if (backup.planos?.length) await db.planos.bulkPut(backup.planos);
      if (backup.fixasExternas?.length) await db.fixasExternas.bulkPut(backup.fixasExternas);
    }
  );
}
