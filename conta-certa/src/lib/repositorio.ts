// Todas as operações de dados passam por aqui; nada de Dexie nos componentes.
import { db } from "./db";
import { dividirParcelas, somarMes } from "./mes";
import type { Cartao, Despesa, Entrada, Forma } from "./tipos";

// ---------- Despesas ----------

export interface NovaDespesa {
  descricao: string;
  /** Valor TOTAL em centavos (a parcela é calculada aqui). */
  valor: number;
  mes: string;
  forma: Forma;
  cartaoId?: string;
  parcelas?: number;
  paga?: boolean;
}

/**
 * Cria a despesa. Com N parcelas, cria N registros (um por mês) com o mesmo
 * `compraId`; o valor da parcela é total ÷ N com a diferença de centavos
 * na última.
 */
export async function adicionarDespesa(dados: NovaDespesa): Promise<void> {
  const n = dados.parcelas ?? 1;
  const base = {
    descricao: dados.descricao.trim(),
    forma: dados.forma,
    ...(dados.forma === "cartao" && dados.cartaoId ? { cartaoId: dados.cartaoId } : {}),
    ...(n > 1 ? { compraId: crypto.randomUUID() } : {}),
    ...(dados.paga !== undefined ? { paga: dados.paga } : { paga: false }),
  };
  if (n === 1) {
    await db.despesas.add({
      id: crypto.randomUUID(),
      ...base,
      valor: dados.valor,
      mes: dados.mes,
    });
    return;
  }
  const valores = dividirParcelas(dados.valor, n);
  await db.despesas.bulkAdd(
    valores.map((valor, i) => ({
      id: crypto.randomUUID(),
      ...base,
      valor,
      mes: somarMes(dados.mes, i),
      parcela: i + 1,
      parcelas: n,
    }))
  );
}

export async function marcarPaga(id: string, paga: boolean): Promise<void> {
  await db.despesas.update(id, { paga });
}

/** Edita a despesa; se pertencer a um grupo, pergunta via `escopo` ("uma"|"todas"). */
export async function editarDespesa(
  id: string,
  dados: Partial<Pick<Despesa, "descricao" | "valor" | "mes" | "forma" | "cartaoId" | "paga">>,
  escopo: "uma" | "todas" = "todas"
): Promise<void> {
  const atual = await db.despesas.get(id);
  if (!atual) return;

  if (atual.compraId && escopo === "todas") {
    const grupo = await db.despesas.where("compraId").equals(atual.compraId).sortBy("parcela");
    const mesBase = dados.mes ?? atual.mes;
    await Promise.all(
      grupo.map((p) =>
        db.despesas.update(p.id, {
          ...dados,
          mes: somarMes(mesBase, (p.parcela ?? 1) - 1),
        })
      )
    );
    return;
  }
  await db.despesas.update(id, dados);
}

/** Exclui a despesa; em grupo, `escopo` define se apaga só esta parcela ou todas. */
export async function excluirDespesa(id: string, escopo: "uma" | "todas" = "todas") {
  const atual = await db.despesas.get(id);
  if (!atual) return;
  if (atual.compraId && escopo === "todas") {
    await db.despesas.where("compraId").equals(atual.compraId).delete();
    return;
  }
  await db.despesas.delete(id);
}

// ---------- Entradas ----------

export interface NovaEntrada {
  descricao: string;
  /** Valor TOTAL em centavos. */
  valor: number;
  mes: string;
  parcelas?: number;
  recebida?: boolean;
}

export async function adicionarEntrada(dados: NovaEntrada): Promise<void> {
  const n = dados.parcelas ?? 1;
  const base = {
    descricao: dados.descricao.trim(),
    ...(dados.recebida !== undefined ? { recebida: dados.recebida } : { recebida: false }),
  };
  if (n === 1) {
    await db.entradas.add({
      id: crypto.randomUUID(),
      ...base,
      valor: dados.valor,
      mes: dados.mes,
    });
    return;
  }
  const valores = dividirParcelas(dados.valor, n);
  const grupoId = crypto.randomUUID();
  await db.entradas.bulkAdd(
    valores.map((valor, i) => ({
      id: crypto.randomUUID(),
      ...base,
      valor,
      mes: somarMes(dados.mes, i),
      grupoId,
      parcela: i + 1,
      parcelas: n,
    }))
  );
}

export async function marcarRecebida(id: string, recebida: boolean): Promise<void> {
  await db.entradas.update(id, { recebida });
}

export async function editarEntrada(
  id: string,
  dados: Partial<Pick<Entrada, "descricao" | "valor" | "mes" | "recebida">>,
  escopo: "uma" | "todas" = "todas"
): Promise<void> {
  const atual = await db.entradas.get(id);
  if (!atual) return;
  if (atual.grupoId && escopo === "todas") {
    const grupo = await db.entradas.where("grupoId").equals(atual.grupoId).sortBy("parcela");
    const mesBase = dados.mes ?? atual.mes;
    await Promise.all(
      grupo.map((p) =>
        db.entradas.update(p.id, {
          ...dados,
          mes: somarMes(mesBase, (p.parcela ?? 1) - 1),
        })
      )
    );
    return;
  }
  await db.entradas.update(id, dados);
}

export async function excluirEntrada(id: string, escopo: "uma" | "todas" = "todas") {
  const atual = await db.entradas.get(id);
  if (!atual) return;
  if (atual.grupoId && escopo === "todas") {
    await db.entradas.where("grupoId").equals(atual.grupoId).delete();
    return;
  }
  await db.entradas.delete(id);
}

// ---------- Consultas ----------

/** Despesas e entradas de um mês. */
export async function listarDoMes(mes: string): Promise<{ despesas: Despesa[]; entradas: Entrada[] }> {
  const [despesas, entradas] = await Promise.all([
    db.despesas.where("mes").equals(mes).toArray(),
    db.entradas.where("mes").equals(mes).toArray(),
  ]);
  return { despesas, entradas };
}

// ---------- Cartões ----------

export async function adicionarCartao(nome: string): Promise<Cartao> {
  const cartao: Cartao = { id: crypto.randomUUID(), nome: nome.trim() };
  await db.cartoes.add(cartao);
  return cartao;
}

export async function renomearCartao(id: string, nome: string): Promise<void> {
  await db.cartoes.update(id, { nome: nome.trim() });
}

/** Remove o cartão e desvincula as despesas que o usavam. */
export async function removerCartao(id: string): Promise<void> {
  await db.transaction("rw", [db.cartoes, db.despesas], async () => {
    await db.cartoes.delete(id);
    await db.despesas.where("cartaoId").equals(id).modify({ cartaoId: undefined });
  });
}
