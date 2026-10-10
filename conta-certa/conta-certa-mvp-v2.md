# Conta Certa — MVP v2 (PWA offline)

Substitui o `conta-certa-mvp.md`. Mudanças principais: sem backend e sem banco de
servidor, todos os dados ficam no próprio aparelho, e o app gira em torno de um
**checklist de contas do mês**.

## Ideia em uma frase

Você registra o que ganha e o que gasta, risca o que já pagou e vê sempre três
números: quanto tem, quanto vai gastar e quanto deve ter no fim do mês.

## Os três números

| Número | Cor | O que é |
|---|---|---|
| **Saldo** | Preto | Dinheiro que você tem agora |
| **Despesas** | Vermelho | Total de despesas do mês (pagas e a pagar) |
| **Previsão** | Verde | Quanto você deve ter no fim do mês, contando o que ainda vai entrar e sair |

Os lançamentos futuros (parcelas dos próximos meses, entradas ainda não recebidas)
também aparecem em verde.

### Regras de cálculo

- **Saldo** = saldo inicial + entradas marcadas como recebidas − despesas marcadas como pagas.
- **Previsão do mês** = saldo no início do mês + entradas do mês − despesas do mês
  (todas, pagas ou não).
- **Saldo no início de um mês** = previsão do mês anterior. O primeiro mês usa o
  saldo inicial informado.
- Em um mês que não é o atual, o primeiro número mostra o saldo previsto no início
  daquele mês.
- Valores guardados em **centavos (inteiros)** para não ter erro de arredondamento.

### Cores com contraste

Os blocos da identidade (menta, sol, coral) não servem como cor de texto sobre o
fundo claro. Para os números, usar:

| Uso | Hex |
|---|---|
| Saldo | `#05211E` |
| Despesas | `#D63B2F` |
| Previsão e futuros | `#0C6B54` |
| Conta paga (riscada) | `#7A918B` com `line-through` |

## Telas

### 1. Mês (tela inicial)
- Navegação `‹ Outubro ›` para trocar de mês.
- Os três números no topo.
- **Checklist** das contas do mês, pendentes primeiro. Cada linha tem uma caixa
  grande de marcar (mínimo 44 px), nome, forma de pagamento e valor. Marcou, risca.
- Entradas aparecem na mesma lista, com a marca de "recebido".
- Botão `+` fixo para adicionar.

### 2. Adicionar
Dois modos: **Despesa** e **Entrada**.

Despesa:
1. Valor total e descrição
2. Mês (padrão: o mês que está aberto; pode ser passado ou futuro)
3. Pagou com: **Pix**, **Boleto** ou **Cartão**
4. Se cartão: qual cartão e quantas parcelas

Entrada: valor, descrição, mês e se já foi recebida.

Compra parcelada vira uma parcela por mês, cada uma com seu próprio item no
checklist ("Notebook 2/6"). O valor da parcela é o total dividido pelo número de
parcelas, com a diferença de centavos na última.

### 3. Meses (consolidado)
- Lista de meses com entradas, despesas e previsão de cada um.
- Barras simples de entradas contra despesas para comparar.
- Tocar em um mês abre a tela Mês dele, onde dá para adicionar e editar.

### 4. Simular
- Pergunta: "Você tem despesas fixas fora do app?" Se sim, adiciona (nome e valor,
  quantas quiser).
- Calcula: renda do mês − despesas do app − despesas fixas de fora = **quanto dá
  para guardar por mês**.
- Projeção em N meses do valor acumulado. Rendimento é opcional (padrão 0%).
- **Planos**: nome (compra, viagem, outro), valor-alvo e prazo. O app mostra
  quanto guardar por mês e se cabe na sobra. Se não cabe, mostra quanto falta por
  mês ou em quantos meses dá.

### 5. Ajustes
- Saldo inicial
- Cartões (adicionar, renomear, remover)
- **Exportar e importar backup** (arquivo JSON)

## Cadastro inicial

Rápido, só o necessário para usar no primeiro minuto:
1. Quanto você tem hoje (saldo inicial)
2. Quais cartões usa (opcional, dá para pular)

Tudo isso pode ser mudado depois em Ajustes.

## Dados e offline

| Item | Escolha |
|---|---|
| Armazenamento | IndexedDB (sugestão: Dexie) |
| Offline | Service worker com cache do app inteiro |
| Next.js | Export estático (`output: "export"`), sem rotas de servidor |
| Hospedagem | Arquivos estáticos em nginx via Coolify (Docker só serve os arquivos) |

### Modelo

```ts
type Forma = "pix" | "boleto" | "cartao";

interface Cartao {
  id: string;
  nome: string;
}

interface Despesa {
  id: string;
  descricao: string;
  valor: number;          // centavos (valor da parcela, se parcelada)
  mes: string;            // "2026-10"
  forma: Forma;
  cartaoId?: string;      // só se forma === "cartao"
  compraId?: string;      // agrupa as parcelas de uma mesma compra
  parcela?: number;       // 1..parcelas
  parcelas?: number;
  paga: boolean;
}

interface Entrada {
  id: string;
  descricao: string;
  valor: number;          // centavos
  mes: string;
  recebida: boolean;
}

interface Config {
  saldoInicial: number;   // centavos
  mesInicial: string;
}

interface Plano {
  id: string;
  nome: string;
  valorAlvo: number;      // centavos
  prazoMeses: number;
}

interface FixaExterna {
  id: string;
  nome: string;
  valor: number;          // centavos por mês
}
```

### Riscos de guardar tudo no aparelho

- **Sem backup, trocar de celular ou limpar os dados do navegador apaga tudo.**
  Por isso exportar e importar backup entra no MVP, e o app pode lembrar de
  exportar de tempos em tempos.
- **iOS (Safari)**: o app precisa estar **instalado na tela inicial**. Fora da
  tela inicial, o Safari pode apagar os dados de sites que ficam muito tempo sem
  uso. Chamar `navigator.storage.persist()` ao abrir ajuda a pedir
  armazenamento persistente.
- **Um aparelho só**: não há sincronização entre dispositivos. Se isso virar
  necessidade, aí sim entra um backend, e o modelo acima já serve de base.

## Ordem de construção sugerida

1. Base: Next.js estático, IndexedDB, tela Mês com checklist, adicionar despesa e entrada
2. Cartões e parcelas
3. Meses (consolidado) e navegação entre meses
4. Backup (exportar e importar)
5. PWA: manifest, service worker, ícones (os arquivos já estão prontos)
6. Simular e Planos

## Sugestões minhas (fora do que você pediu)

- **Repetir todo mês** em despesas fixas como aluguel e internet, para não
  digitar de novo. Seria uma opção ao adicionar.
- **Fatura do cartão**: agrupar no checklist os itens do mesmo cartão em um mês,
  com o total, para marcar a fatura inteira como paga de uma vez.
- Tela de **Mês** com a água da maré indicando quanto da previsão ainda está
  disponível, se você quiser manter esse elemento da identidade.

## Pontos em aberto

1. Lançamentos futuros em verde: estou entendendo como tudo o que ainda não
   aconteceu (parcelas de meses à frente e entradas a receber). Confirme se é isso.
2. Despesa no cartão: conta como paga quando você marca a parcela, e não no dia
   da compra. É mais simples, mas o saldo só cai quando você marca.
