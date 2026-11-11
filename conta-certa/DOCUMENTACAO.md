# Conta Certa — Documentação do Projeto

> Aplicativo web (PWA) de finanças pessoais, offline-first, para registrar entradas e despesas, acompanhar contas a pagar e simular economia mensal. Todo o dado fica no aparelho do usuário (IndexedDB), sem servidor e sem conta.

---

## Contexto

O Conta Certa resolve um problema simples e recorrente de finanças pessoais: saber, a qualquer momento, **quanto ainda dá para gastar no mês** e **quais contas vencem em breve**. Ele nasce como um "checklist de contas do mês": você lança o que vai pagar/receber, risca o que já resolveu e vê o saldo e o acumulado — sem cadastro, sem nuvem, sem publicidade.

Princípios do produto:

- **Offline-first**: funciona 100% sem internet (service worker + IndexedDB).
- **Privacidade total**: nenhum dado sai do aparelho; backup é um arquivo JSON que o próprio usuário guarda.
- **Mês fechado nele mesmo**: cada mês é `entradas − despesas`; o acumulado é a soma dos saldos desde o início de uso. Não existe "saldo carregado" entre meses.
- **Mobile-first**: layout de 1 coluna (max-width `md`), navegação por abas inferiores, alvo de toque mínimo de 44px.

---

## Tecnologia utilizada

| Biblioteca | Versão | Papel no projeto |
| --- | --- | --- |
| [Next.js](https://nextjs.org) | 16.4.0 | Framework React (App Router). Build em modo `output: "export"` → **SPA estática**, sem servidor. |
| [React](https://react.dev) / React DOM | 19.3.0 | UI. Todas as telas são Client Components (`"use client"`). |
| [TypeScript](https://www.typescriptlang.org) | ^5 | Tipagem estática em todo o código (`strict`). |
| [Tailwind CSS](https://tailwindcss.com) | ^4 | Estilização utilitária, via plugin `@tailwindcss/turbopack`. Tema claro/escuro por variáveis CSS + `@custom-variant dark`. |
| [Dexie.js](https://dexie.org) | ^4.4.6 | Wrapper de IndexedDB: schema versionado, transações e índices. |
| dexie-export-import | ^4.4.1 | Exportar/importar o banco inteiro como JSON (backup). Import dinâmico (quebra SSR se carregado no servidor). |
| dexie-react-hooks | ^4.4.0 | `useLiveQuery`: reatividade em tempo real — a UI atualiza sozinha quando o IndexedDB muda. |
| [motion](https://motion.dev) | ^14.1.0 | Animações (risco no item pago, expansão de faturas, nível da água). Respeita `prefers-reduced-motion` em todos os usos. |
| [lucide-react](https://lucide.dev) | ^1.55.0 | Ícones (abas, formas de pagamento, ações de ajustes). |
| @edusites/bancos-brasil | ^1.2.0 | SVGs oficiais de logos de bancos brasileiros (Nubank, Itaú…). Import direto de `src/core.js` via alias no `next.config.ts` (o barrel principal reexporta um componente Vue). |
| [Vitest](https://vitest.dev) | ^2.1.9 | Testes unitários das funções puras (`calculos.test.ts`, `mes.test.ts`). |
| ESLint + eslint-config-next | ^9 | Lint padrão do Next. |

Scripts do `package.json`:

```bash
npm run dev     # ambiente de desenvolvimento (service worker desativado)
npm run build   # build estático (output: export)
npm run start   # serve o build
npm run lint    # ESLint
npm run test    # Vitest (modo run, single pass)
```

---

## Arquitetura

O projeto segue camadas bem separadas — **nenhum componente fala com o Dexie diretamente** (exceções pontuais e conscientes: `simular/page.tsx` usa `db.fixasExternas` e `CadastroInicial` grava config/cartões):

```
src/
├── app/                     # Telas (App Router, uma rota por pasta)
│   ├── page.tsx             # /        → Mês (home)
│   ├── adicionar/page.tsx   # /adicionar
│   ├── meses/page.tsx       # /meses
│   ├── simular/page.tsx     # /simular
│   ├── ajustes/page.tsx     # /ajustes
│   ├── layout.tsx           # Fonts, metadata PWA, script anti-flash de tema
│   └── globals.css          # Design tokens (cores, textos) + utilitários
├── components/              # Blocos de UI reutilizáveis
└── lib/                     # Regra de negócio e acesso a dados
    ├── tipos.ts             # Tipos de domínio (fonte da verdade)
    ├── db.ts                # Dexie: schema, versões, backup export/import
    ├── repositorio.ts       # CRUD de despesas/entradas/cartões (camada de dados)
    ├── calculos.ts          # Funções PURAS (sem Dexie): resumos, faturas, alertas, simulação
    ├── mes.ts / dinheiro.ts # Utilitários de mês ("2026-10") e moeda (centavos)
    ├── useDados.ts          # Hook: snapshot reativo de TODAS as tabelas
    ├── useModoEscuro.ts     # Tema via classe no <html> + localStorage
    └── useUltimoBackup.ts   # Data do último backup (aviso dos 30 dias)
```

**Fluxo de dados (reativo):** componente chama `useDados()` → `useLiveQuery` observa as tabelas → qualquer escrita via `repositorio.ts` (ou direto no `db`) dispara re-render automático de todas as telas. Não existe estado global manual nem fetch.

**Fluxo de cálculo:** as telas recebem `despesas/entradas/cartoes` de `useDados()` e chamam funções puras de `calculos.ts` em render (dados pequenos, cálculo barato — não há cache).

---

## Modelo de dados

Fonte: [tipos.ts](src/lib/tipos.ts). **Todos os valores monetários são inteiros em centavos** (evita erro de ponto flutuante). Meses são strings `"AAAA-MM"`; datas de vencimento, `"AAAA-MM-DD"`.

| Tabela Dexie | Tipo | Descrição |
| --- | --- | --- |
| `despesas` | `Despesa` | Conta a pagar. Campos: `valor` (centavos **da parcela**), `forma` (`pix \| boleto \| cartao`), `cartaoId?`, `compraId?` (agrupa parcelas), `parcela/parcelas?`, `paga`, `vencimento?` (dia 1–31). |
| `entradas` | `Entrada` | Dinheiro a receber. `grupoId?` agrupa parcelas (equivalente ao `compraId`). |
| `cartoes` | `Cartao` | Cartão de crédito: `nome` + `diaFechamento?` e `diaVencimento?` da fatura (1–31). |
| `config` | `Config` | Registro único `id: "config"` com `mesInicial` (mês do primeiro uso; limita o acumulado). |
| `planos` | `Plano` | (Reservado) plano de economia: `valorAlvo` + `prazoMeses`. |
| `fixasExternas` | `FixaExterna` | Despesas fixas que o usuário paga fora do app (ex.: aluguel), usadas no cálculo da sobra. |

Evolução do schema Dexie ([db.ts](src/lib/db.ts)):

- **v1** — tabelas base; índices por `mes`, `compraId`, `cartaoId`, `paga`.
- **v2** — índice `grupoId` em `entradas`.
- **v3** — índices compostos `[mes+paga]` e `[mes+recebida]` (consultas de pendentes por mês).

### Regras de parcelamento

- O usuário digita o **valor total**; `dividirParcelas()` divide em N parcelas com `base = floor(total/n)` e **a diferença de centavos cai na última parcela**.
- Cada parcela é um registro independente com o mesmo `compraId`/`grupoId` e `mes` incrementado (`somarMes`).
- Editar/excluir uma parcela de um grupo, por padrão, vale para **todas** as parcelas do grupo (`escopo: "uma" | "todas"`).

### Regras de vencimento

- Dia 31 em fevereiro vira 28 (`dataVencimento`) — mesma regra de fatura de cartão.
- Vencimento efetivo de uma despesa ([diaVencimentoDespesa](src/lib/calculos.ts)): o próprio `vencimento`, senão o `diaVencimento` da fatura do cartão vinculado. Pix/boleto sem dia não geram alerta.

---

## Interface e telas

Navegação por **barra de abas inferior fixa** ([Abas.tsx](src/components/Abas.tsx)): `Mês · Adicionar · Meses · Simular · Ajustes`. Largura máxima `md` (mobile-first, centralizada no desktop). Aba ativa destacada em verde (`previsao`).

### 1. Cadastro Inicial (primeiro uso)

[components/CadastroInicial.tsx](src/components/CadastroInicial.tsx) — exibido quando `config === undefined`. Um passo só: cadastrar os cartões que usa (opcional, com ícone do banco quando o nome casa com um banco conhecido). "Começar" grava `config.mesInicial = mês atual` e os cartões; há atalho "Pular cartões". Após isso, `useLiveQuery` reage e o app abre.

### 2. Mês (`/` — home)

[app/page.tsx](src/app/page.tsx). Abre por padrão no **mês subsequente ao atual** (faturas de cartão costumam vencer no mês seguinte); aceita `?mes=AAAA-MM` na URL (usado pela tela Meses). Composição, de cima para baixo:

- **Navegação de mês** — setas ‹ › com `aria-label` do mês destino.
- **Resumo do mês** ([ResumoMes.tsx](src/components/ResumoMes.tsx)) — grade `Entradas | Despesas | Saldo do mês` + faixa "Acumulado até aqui" (soma dos saldos desde `mesInicial`). Saldo negativo em vermelho.
- **Nível da água** ([AguaNivel.tsx](src/components/AguaNivel.tsx)) — card "Disponível" com onda animada que desce conforme a proporção `despesas/entradas` sobe (mola suave; desativada com reduced-motion).
- **Aviso de backup** — quando `diasSemBackup >= 30`, lembrete para exportar backup.
- **Alertas de vencimento** ([AlertasVencimento.tsx](src/components/AlertasVencimento.tsx)) — até 5 grupos de contas pendentes por data, com urgência: `vencida`/`hoje` (vermelho), `amanha` (coral), `proximos` (verde, "em N dias"). Ícone muda conforme a criticidade.
- **Checklist do mês** ([ChecklistMes.tsx](src/components/ChecklistMes.tsx)) — o coração do app (detalhado abaixo).
- **FAB "+"** flutuante → `/adicionar?mes=...`.

**Checklist do mês** — agrupa despesas:

- **Faturas por cartão** (cards expansíveis, ordenados por total): logo do banco, nº de compras, pendentes, dias de fechamento/vencimento e total. Expandir revela os itens.
- **Chips de filtro** por banco/cartão ("Todos", cada cartão, "Sem cartão" = pix/boleto + entradas).
- **Itens avulsos e entradas** — lista com riscado animado.
- **Interação de toque**: *toque curto* alterna paga/recebida (com risco animado e ícone de check); *toque longo (500 ms, com vibração)* ou menu de contexto abre o painel de edição. Movimento de rolagem cancela o toque longo.
- Estado vazio convida a adicionar contas do mês.

### 3. Adicionar (`/adicionar`)

[app/adicionar/page.tsx](src/app/adicionar/page.tsx). Abas internas **Despesa | Entrada**. Campos:

- **Valor** ([CampoValor.tsx](src/components/CampoValor.tsx)) — máscara bancária pt-BR: os 2 últimos dígitos digitados são os centavos ("1234" → `12,34`); prefixo "R$" fixo; mostra "N× de R$ X" quando parcelado.
- **Descrição** (máx. 80 caracteres) e **mês** com setas + atalhos "Mês atual"/"Próximo mês".
- **Parcelas** — 1× a 24×, para despesa **e** entrada.
- **Vencimento (opcional, dia 1–31)** — despesas; se o cartão escolhido tem dia de vencimento de fatura, o campo é substituído por um aviso "vence junto com a fatura".
- **Forma de pagamento** (despesa): Pix (QR), Boleto (código de barras) ou Cartão — com ícones.
- **Cartão** (se forma = cartão): select com ícone do banco; exige cartão cadastrado (senão orienta ir a Ajustes).
- **"Já recebi"** — checkbox só para entrada 1×.
- Validações inline (valor > 0, descrição, cartão, dia 1–31) e feedback "Salvando…" animado.

### 4. Meses (`/meses`)

[app/meses/page.tsx](src/app/meses/page.tsx). Consolidado mês a mês ([consolidar](src/lib/calculos.ts)), do primeiro mês com dados em diante. Cada card mostra: saldo do mês, acumulado, barras comparativas de entradas (verde) × despesas (vermelho) normalizadas pelo maior mês, e totais. Expandir revela as **faturas do mês por cartão**. Tocar no card navega para `/?mes=...`.

### 5. Simular (`/simular`)

[app/simular/page.tsx](src/app/simular/page.tsx). Duas seções:

- **Quanto guardar por mês** — inputs: valor-alvo, nº de meses (1–24), mês inicial (padrão: próximo mês) e rendimento mensal opcional (slider 0–2% a.m.). Resultado: depósito mensal necessário, total ao fim, veredito "cabe / não cabe na sua sobra", e **tabela mês a mês** (depósito, rendimento, acumulado).
- **Despesas fixas fora do app** — CRUD de `FixaExterna`. A fórmula da sobra (mostrada na tela): `entradas do mês − despesas do app − fixas de fora`.

### 6. Ajustes (`/ajustes`)

[app/ajustes/page.tsx](src/app/ajustes/page.tsx). Três seções:

- **Aparência** — toggle de modo escuro (classe `dark` + persistência em `localStorage`, com script inline no layout para evitar flash de tema errado).
- **Cartões** — adicionar (sem duplicatas, case-insensitive), renomear (prompt), remover (confirm; despesas existentes ficam sem cartão), e editar **dia de fechamento/vencimento da fatura** (1–31) inline.
- **Backup** — Exportar baixa `conta-certa-backup-AAAA-MM-DD.json` (formato dexie-export-import) e registra a data; Importar lê o arquivo, valida que é um backup do app, mostra **prévia com contagens** e confirmação explícita ("vai apagar os dados atuais") antes de substituir tudo.

### 7. Edição de lançamento (painel modal)

[components/EditarLancamento.tsx](src/components/EditarLancamento.tsx) — bottom sheet modal (`role="dialog"`, fecha com Escape/clique fora, trava rolagem do fundo). Edita valor/descrição/mês/forma/cartão/vencimento; em grupos de parcelas, avisa que **a edição vale para todas** e o valor mostrado é por parcela (com total do grupo). Exclusão em duas etapas (botão vermelho → "Sim, excluir"), removendo todas as parcelas do grupo.

---

## Funcionalidades (resumo)

1. Lançar despesas e entradas, à vista ou em até 24× (parcelas com diferença de centavos na última).
2. Marcar contas como pagas/recebidas com um toque (risco animado).
3. Editar/excluir com toque longo; grupos de parcelas editados/excluídos em bloco.
4. Faturas de cartão consolidadas por cartão, com filtro por banco.
5. Cartões com dia de fechamento/vencimento da fatura herdado pelas despesas.
6. Alertas de vencimento com urgência (vencida/hoje/amanhã/próximos), considerando despesas do mês atual em diante.
7. Resumo do mês (entradas, despesas, saldo) + acumulado histórico + nível da água "Disponível".
8. Consolidado mensal com barras comparativas e faturas expansíveis.
9. Simulação de economia com rendimento composto e checagem contra a sobra mensal real (descontando fixas de fora).
10. Modo claro/escuro persistente, sem flash na carga.
11. PWA instalável + uso 100% offline + armazenamento persistente (`navigator.storage.persist()`).
12. Backup exportável/importável como arquivo JSON, com prévia e confirmação, e aviso quando passam 30 dias sem exportar.

---

## Serviços (`src/lib`)

### `db.ts` — banco e backup

- `ContaCertaDB` (Dexie) com 6 tabelas e schema versionado v1→v3.
- `lerConfig()` / `salvarConfig()` — registro único de configuração.
- `exportarBackup()` — `exportDB` como Blob JSON (import dinâmico de `dexie-export-import` porque o pacote referencia `self` e quebraria o prerender estático).
- `lerBackup(arquivo)` — valida o formato (`formatName === "dexie"`, tabelas `despesas`+`config`), retorna `{ resumo: contagens, importar: () => limpa tudo e importa }`.
- `exportarBackupLegado()` / `importarBackupLegado()` — formato JSON simples (`Backup`, `versao: 1`) mantido para compatibilidade.

### `repositorio.ts` — CRUD

Camada única de escrita: `adicionarDespesa/Entrada` (com expansão de parcelas), `marcarPaga/Recebida`, `editarDespesa/Entrada` e `excluirDespesa/Entrada` (ambos com `escopo "uma"|"todas"` para grupos), `listarDoMes`, e o CRUD de cartões (`adicionarCartao`, `renomearCartao`, `atualizarDiasCartao`, `removerCartao` — este em transação, desvinculando despesas).

### `calculos.ts` — regra de negócio pura

Sem dependência de Dexie; 100% testável (e testada):

- `resumirMes(config, despesas, entradas, mes)` → `ResumoMes { mes, entradas, despesas, saldo, acumulado }` (respeita `mesInicial`; ignora meses futuros no acumulado).
- `consolidar(config, ...)` → lista de `ResumoMes` do primeiro ao último mês com dados.
- `agruparFaturas(despesas, cartoes)` → faturas por cartão com total, dias e itens (ordenadas por total).
- `diaVencimentoDespesa(despesa, cartoes)` → dia efetivo (próprio > fatura do cartão).
- `calcularAlertasVencimento(despesas, cartoes, mesRef, hoje?)` → grupos por data com `dias` e `urgencia`; `hoje` injetável para testes; despesas de meses passados contam como vencidas.
- `simularEconomia(valorAlvo, nMeses, mesInicial, rendimentoMensal?)` → série mensal `{ deposito, rendimento, acumulado }`.
- `calcularSobra(rendaMes, despesasMes, fixasExternas)` → `renda − despesas − fixas`.

### `mes.ts` / `dinheiro.ts` — utilitários

Manipulação de mês string (`somarMes`, `diferencaMeses`, `diasNoMes`, `dataVencimento`, `diasAteData`), nomes em português (`nomeMes`, `nomeMesAno`, `nomeMesCurto`), validação (`mesValido`, `diaValido`) e moeda em centavos (`formatarMoeda`/`formatarBRL`, `parseMoeda`, `aplicarMascaraMoeda`, `dividirParcelas`).

### Hooks

- `useDados()` — `useLiveQuery` que carrega config + 5 tabelas de uma vez; `carregando: true` até o primeiro snapshot; `config === undefined` após carregar ⇒ primeiro uso.
- `useModoEscuro()` — `useSyncExternalStore` sobre a classe `dark` do `<html>`; persiste em `localStorage` e sincroniza entre componentes via evento customizado.
- `useUltimoBackup()` — data do último backup e `diasSemBackup` (`Infinity` se nunca), via `localStorage` + eventos.

---

## PWA e offline

- **Manifest** ([public/manifest.json](public/manifest.json)): `display: standalone`, ícones 192/512 + maskable, cores de tema menta (`#5EEAC0`) / fundo claro.
- **Service worker** ([public/sw.js](public/sw.js)), registrado só em produção (em dev o cache serve CSS antigo):
  - Navegações: **rede primeiro**, cai para o cache quando offline (fallback `/`).
  - Estáticos: **cache primeiro**, atualização em segundo plano (stale-while-revalidate).
- **Armazenamento persistente**: `navigator.storage.persist()` no primeiro load (importante no iOS, que pode expurgar IndexedDB sob pressão de espaço).
- **Build estático**: `output: "export"` no [next.config.ts](next.config.ts) — o deploy é qualquer host de arquivos estáticos (sem funções de servidor). `images.unoptimized: true` acompanha o modo export.

### Design system (globals.css)

Tokens por tema (claro/escuro) expostos como cores Tailwind via `@theme inline`: `background`, `surface`, `campo`, `borda`, `foreground`, `previsao` (verde/positivo), `despesa` (vermelho), `entrada` (azul), `neutra` (riscado/concluído), `menta` (destaque/ações), `coral` (urgência intermediária). Utilitários: `.botao-min` (alvo de toque ≥ 44px), `.pontinhos` (animação "Salvando…"), placeholder e autofill adaptados ao tema, e `@media (prefers-reduced-motion)` global.

---

## Decisões técnicas (por quê)

| Decisão | Justificativa |
| --- | --- |
| **Centavos como inteiros** | Elimina erros de aritmética de ponto flutuante; a diferença de divisões cai na última parcela, garantindo que a soma das parcelas seja exatamente o total. |
| **Mês fechado nele mesmo** | Modelo mental de "contas do mês": o saldo não vaza entre meses; quem quer o histórico usa o **acumulado**. Simplifica todos os cálculos e evita retrabalho em edições retroativas. |
| **IndexedDB (Dexie) em vez de servidor** | Privacidade + offline real + zero custo de infra. Custo assumido: sincronização entre aparelhos não existe (mitigado pelo backup em arquivo). |
| **`useLiveQuery` como "estado global"** | O banco é a fonte da verdade; qualquer escrita re-renderiza quem observa. Remove boilerplate de contexto/Redux e não dessincroniza. |
| **Cálculos como funções puras fora dos componentes** | Testáveis com Vitest sem mock de Dexie/React; `hoje` é injetável, permitindo testar "vence amanhã" de forma determinística. |
| **Cada parcela é um registro** (não um campo `parcelas` só) | Permite pagar/editar/excluir parcelas individuais e agrupar por `compraId`/`grupoId` quando a ação vale para o grupo. |
| **Import dinâmico do dexie-export-import** | O pacote referencia `self` no escopo do módulo, quebrando o prerender estático do Next; carregar só no navegador mantém o build funcionando. |
| **Alias para `@edusites/bancos-brasil/src/core.js`** | O barrel do pacote reexporta um componente Vue, que entraria no bundle React; o core puro (funções de SVG) é suficiente. |
| **Service worker só em produção** | Cache agressivo em dev serve assets antigos e confunde o desenvolvedor. |
| **Script inline de tema no `<head>`** | Aplica o tema salvo antes da hidratação, evitando flash de tema errado (FOUC) no modo escuro. |

---

## Como testar

```bash
npm run test    # Vitest: calculos.test.ts e mes.test.ts
npm run lint    # ESLint (config Next)
npm run build   # valida tipos e build estático
```

Os testes cobrem: fechamento de mês, acumulado (inclusive exclusão de meses futuros), agrupamento de faturas, vencimento efetivo por cartão, alertas com urgência, divisão de parcelas com resto na última, simulação com/sem rendimento e sobra. Ao adicionar comportamento novo em `calculos.ts`/`mes.ts`, adicione caso de teste correspondente — são funções puras, o custo é mínimo.

## Como modificar com segurança

- **Nova tela** → pasta em `src/app/<rota>/page.tsx` com `"use client"` + `<Pagina>` ou `<Abas>`; consuma dados via `useDados()`.
- **Novo campo em uma tabela** → adicione ao tipo em `tipos.ts`, crie `this.version(n+1).stores(...)` em `db.ts` (Dexie faz migração transparente para índices; dados antigos ganham `undefined` no campo novo) e trate a ausência nos cálculos.
- **Nova regra de negócio** → comece em `calculos.ts` como função pura + teste; só suba para componente/hook depois.
- **Cores/tema** → apenas os tokens em `globals.css`; todos os componentes já consomem as variáveis.

---

## Riscos e melhorias sugeridas

**Riscos**

1. **Dado único no aparelho** — perda do dispositivo = perda de dados sem backup. Mitigado pelo aviso dos 30 dias, mas é o maior risco do produto.
2. **`useDados()` carrega tudo** — escala mal para muitos anos de lançamentos (hoje irrisório para uso pessoal; redesenho só se doer).
3. **Import de backup apaga tudo** — correto e confirmado, mas sem desfazer; um erro no arquivo importado é irreversível.
4. **`planos` está sem uso na UI** — tabela e tipo existem, mas nenhuma tela lê/escreve (a simulação é ad hoc). Risco de divergência futura.

**Melhorias sugeridas (em ordem de valor)**

1. Usar a tabela `planos` para salvar simulações nomeadas (o modelo já existe).
2. Página de detalhe por fatura (hoje só o expansível do mês).
3. Exportação automática periódica (ex.: lembrar a cada 30 dias já existe; um download silencioso programável seria o próximo passo).
4. Gráfico de evolução do acumulado na tela Meses.
5. Remover o backup legado quando o fluxo novo estiver consolidado em bases instaladas.

---

## Conhecimentos importantes

- **Dexie 4**: schema versionado, `bulkPut/bulkAdd`, `where().equals()`, índices compostos `[a+b]`, transações `db.transaction("rw", ...)`, e `useLiveQuery` do pacote de hooks.
- **Tailwind 4**: sem `tailwind.config`; tema via `@theme inline` e variáveis CSS, `@custom-variant dark` para tema por classe (não por media query).
- **Next.js 16 App Router**: `Metadata`/`Viewport` exportados do layout, `LayoutProps`, `output: "export"` para SPA estática, turbopack com loaders e `resolveAlias` customizados.
- **motion (v14)**: `motion/react`, `AnimatePresence`, `layout` para reordenação, `useReducedMotion` — usado em todo o app com fallback sem animação.
- **PWA**: estratégias de cache no `fetch` do SW, `manifest` standalone, `navigator.storage.persist()`.

## Próximos pontos de atenção

- **Next 16 tem breaking changes** em relação a versões anteriores (ver `node_modules/next/dist/docs/` antes de mexer em APIs do framework — o próprio `AGENTS.md` do repo avisa).
- Qualquer mudança no formato de backup precisa considerar **arquivos já exportados por usuários** (o import é `acceptVersionDiff: true`, mas campos novos simplesmente não existirão).
- Manter a disciplina de **funções puras + testes** em `lib/` — é o que mantém o projeto simples conforme cresce.
- O `escopo "uma"` de editar/excluir existe na API do repositório, mas a UI atual sempre usa `"todas"` — se a intenção for editar parcela individual, é só expor o toggle no painel.
