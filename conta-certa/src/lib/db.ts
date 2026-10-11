import Dexie, { type Table } from "dexie";
import type {
  Backup,
  Cartao,
  Config,
  Despesa,
  Entrada,
  FixaExterna,
  Plano,
} from "./types";

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

export async function exportarBackup(): Promise<Backup> {
  const [config] = await db.config.toArray();
  return {
    versao: 1,
    exportadoEm: new Date().toISOString(),
    config: config ?? { id: "config", saldoInicial: 0, mesInicial: "" },
    cartoes: await db.cartoes.toArray(),
    despesas: await db.despesas.toArray(),
    entradas: await db.entradas.toArray(),
    planos: await db.planos.toArray(),
    fixasExternas: await db.fixasExternas.toArray(),
  };
}

export async function importarBackup(backup: Backup): Promise<void> {
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
      if (backup.fixasExternas?.length)
        await db.fixasExternas.bulkPut(backup.fixasExternas);
    }
  );
}
