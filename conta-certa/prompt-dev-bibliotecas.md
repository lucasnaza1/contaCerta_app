# Prompt para o dev — uso das bibliotecas no Conta Certa

> Anexe junto: `conta-certa-mvp-v2.md` (regras e telas) e `conta-certa-direcao-visual.md` (identidade).
> Cole o texto abaixo da linha.

---

## Contexto

Conta Certa é um PWA offline de finanças pessoais. Next.js (App Router) com
`output: "export"` (site estático, sem servidor), TypeScript e Tailwind CSS. Todos
os dados ficam no aparelho, em IndexedDB. Não existe backend.

As regras de cálculo, o modelo de dados e as telas estão em `conta-certa-mvp-v2.md`.
A identidade visual (cores, tipografia, formas) está em `conta-certa-direcao-visual.md`.
Siga os dois.

Bibliotecas já instaladas:

```
dexie ^4.4.6
dexie-export-import ^4.4.1
lucide-react ^1.55.0
motion ^14.1.0
react-number-format ^5.4.5
```

Antes de usar cada uma, confira a documentação da **versão instalada**, porque
nomes de import e de funções podem ter mudado entre versões maiores. Não
presuma o que lembra de versões anteriores.

## Regras gerais

- Todo componente que usa Dexie, `motion` ou `window` é Client Component
  (`"use client"`). Nada de IndexedDB durante o build: o `npm run build` com
  export estático precisa passar.
- Dinheiro sempre em **centavos (inteiros)** no banco e na lógica. Só vira texto
  na hora de exibir.
- Alvos de toque de no mínimo 44 px. Todo ícone que é só decoração leva
  `aria-hidden`; todo botão só com ícone leva `aria-label` em português.
- Respeitar `prefers-reduced-motion`.
- Textos da interface em português do Brasil.
- Não adicionar outras bibliotecas sem avisar.

## 1. Dexie — banco local

Criar `src/lib/db.ts` com uma instância única de `Dexie` e as tabelas:

| Tabela | Índices |
|---|---|
| `cartoes` | `id, nome` |
| `despesas` | `id, mes, compraId, [mes+paga]` |
| `entradas` | `id, mes, [mes+recebida]` |
| `planos` | `id` |
| `fixasExternas` | `id` |
| `config` | `chave` (guarda `saldoInicial` e `mesInicial`) |

- Os tipos (`Despesa`, `Entrada`, `Cartao`, `Plano`, `FixaExterna`) estão no
  documento de especificação. Exporte-os de `src/lib/tipos.ts`.
- IDs gerados com `crypto.randomUUID()`.
- Criar o banco de forma segura para SSR: não instanciar em nível de módulo se
  isso quebrar o build. Uma função `getDb()` que cria sob demanda no cliente é
  uma saída.
- Reatividade: a tela precisa atualizar sozinha quando os dados mudam. O pacote
  `dexie-react-hooks` (`useLiveQuery`) **não está instalado**. Instale-o ou
  escreva um hook equivalente em `src/lib/useDados.ts`, e me avise qual
  escolheu.
- Criar `src/lib/repositorio.ts` com as operações, sem espalhar chamadas ao
  Dexie pelos componentes:
  - `adicionarDespesa(dados)`: se for cartão com N parcelas, cria N registros
    (um por mês), com o mesmo `compraId`. Valor da parcela = total ÷ N, com a
    diferença de centavos na última.
  - `marcarPaga(id, paga)`, `marcarRecebida(id, recebida)`
  - `editarDespesa`, `excluirDespesa` (se tiver `compraId`, perguntar se exclui
    só esta parcela ou todas)
  - `adicionarEntrada`, `listarDoMes(mes)`
- Ao abrir o app, chamar `navigator.storage.persist()` (se existir) para pedir
  armazenamento persistente.
- Criar `src/lib/calculos.ts` com **funções puras** (sem Dexie) para saldo,
  previsão do mês e saldo no início do mês, conforme as regras do documento.
  Escrever testes para elas.

## 2. dexie-export-import — backup

Tela Ajustes, seção "Backup":

- **Exportar**: gerar o JSON do banco inteiro e baixar como
  `conta-certa-backup-AAAA-MM-DD.json`.
- **Importar**: escolher o arquivo, mostrar um resumo (quantas despesas,
  entradas e cartões o arquivo tem) e pedir confirmação clara de que **vai
  substituir** os dados atuais. Só então importar, limpando as tabelas antes.
- Antes de importar, validar que o arquivo é um backup do Conta Certa e que o
  formato é compatível (a lib oferece uma leitura prévia do arquivo). Arquivo
  inválido mostra mensagem de erro e não altera nada.
- Mostrar a data do último backup feito e, se passar de 30 dias (ou nunca
  houve), um aviso discreto na tela Mês pedindo para exportar.
- Tratar erros (arquivo corrompido, cota de armazenamento) com mensagem em
  português, sem travar o app.

## 3. react-number-format — campo de valor

Criar o componente `CampoValor` (`src/components/CampoValor.tsx`) usando
`NumericFormat`:

- Prefixo `R$ `, separador de milhar `.`, decimal `,`, 2 casas fixas, sem
  negativos.
- `inputMode="decimal"` para abrir o teclado numérico no celular.
- Entrega o valor ao formulário **em centavos** (arredondar com
  `Math.round(floatValue * 100)`), nunca em float.
- Aceita `label` visível, `erro` e `autoFocus`. O `label` fica ligado ao
  `input` por `id`/`htmlFor`.
- Fonte e tamanho seguem a tela de Cadastro da direção visual (número grande,
  peso 800).
- Criar `src/lib/dinheiro.ts` com `centavosParaReais(centavos)` e
  `formatarBRL(centavos)` usando `Intl.NumberFormat("pt-BR", { style:
  "currency", currency: "BRL" })`. Usar essas funções em **todo** lugar onde
  aparece dinheiro.

## 4. lucide-react — ícones de interface

- Importar apenas os ícones usados, por nome, para não aumentar o bundle.
- Tamanho padrão 24, `strokeWidth` 2. Cor herdada do texto (`currentColor`).
- Mapeamento sugerido:

| Uso | Ícone |
|---|---|
| Aba Mês | `CalendarDays` |
| Aba Meses | `ChartColumn` |
| Aba Simular | `PiggyBank` |
| Aba Ajustes | `Settings` |
| Adicionar | `Plus` |
| Mês anterior / próximo | `ChevronLeft` / `ChevronRight` |
| Conta paga | `Check` |
| Forma: boleto | `Barcode` |
| Forma: cartão | `CreditCard` |
| Forma: pix | `QrCode` (não existe ícone oficial do Pix na lib) |
| Editar / excluir | `Pencil` / `Trash2` |
| Exportar / importar | `Download` / `Upload` |
| Plano de compra ou viagem | `Target` |

- Os ícones dos **bancos** continuam vindo da biblioteca que já usamos para
  isso. Não misturar: lucide só para a interface.
- Criar um componente `IconeForma` que recebe `"pix" | "boleto" | "cartao"` e
  devolve o ícone certo.

## 5. motion — animações

Usar o pacote `motion` com o import de React da versão instalada (confira na
documentação). Só três animações, de propósito:

1. **Nível da água (tela Mês).** O bloco da água sobe e desce com uma mola
   suave quando o valor muda (por exemplo, ao marcar uma conta como paga). A
   borda ondulada pode ter um movimento lento e contínuo. Com
   `prefers-reduced-motion`, sem ondulação e sem mola: só a troca de nível.
2. **Riscar a conta.** Ao marcar uma conta como paga, uma linha atravessa o
   nome da esquerda para a direita (animar a escala horizontal de um elemento
   de linha, porque `text-decoration` não anima) e o texto esmaece para a cor
   de conta paga (`#7A918B`).
3. **Reordenação da lista.** Quando uma conta marcada passa de "pendentes"
   para "pagas", ela desliza para a nova posição (`layout` +
   `AnimatePresence`), sem pulo.

Não animar mais nada além disso nesta etapa. Duração curta (até 300 ms), exceto
a ondulação da água, que é lenta e contínua.

## Entrega esperada

- Código em `src/lib`, `src/components` e nas telas, com a estrutura acima.
- `npm run build` passando com `output: "export"`.
- Testes (Vitest) para as funções de `calculos.ts` e para a divisão de
  parcelas, incluindo o caso em que o valor não divide exato (ex.: R$ 100,00
  em 3x).
- Um resumo curto no final dizendo o que foi feito, o que ficou de fora e
  qualquer decisão que tomou por conta própria.

## Critérios de aceite

- [ ] Digitar `1234,5` no campo de valor mostra `R$ 1.234,50` e grava `123450`.
- [ ] Compra de R$ 100,00 em 3x cria 3 itens: 33,33 + 33,33 + 33,34.
- [ ] Marcar uma conta como paga risca com animação e atualiza Saldo e Previsão
      sem recarregar.
- [ ] Exportar e depois importar o backup devolve exatamente os mesmos dados.
- [ ] Importar um arquivo que não é do Conta Certa mostra erro e não altera nada.
- [ ] Com o celular em modo avião, o app abre e funciona.
- [ ] Com `prefers-reduced-motion` ligado, não há animação contínua.
