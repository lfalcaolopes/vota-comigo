# Painel único de filtros

Plano de migração da barra de filtros da **Listagem de deputados** e do **Resultado do matcher** para um painel único, acionado por um botão. Cobre apenas os filtros que já existem hoje; ordenação por métricas de deputado é trabalho posterior e não está descrita aqui.

## Problema

Hoje as três superfícies com filtro — feed de proposições, listagem de deputados e resultado do matcher — apresentam todos os controles inline:

| Tela | Filtros | Controles |
| --- | --- | --- |
| Feed de proposições | ordenação, tema (+ busca) | `SegmentedControl` + trigger/painel de `Chip` |
| Listagem de deputados | em atividade, UF, partido (+ busca) | `Switch` + dois trigger/painel de `Chip` |
| Resultado do matcher | escopo, exigir concordância, em atividade | `SegmentedControl` + popover próprio + `Switch` |

Três defeitos, e o de espaço é o menos grave:

**A barra não escala por construção.** As três usam a mesma solução responsiva: `grid-cols-2` no mobile virando `sm:contents` para os filhos caírem no grid do pai (`deputados-feed-view.tsx:314`, `feed-view.tsx:146`). Com três itens funciona; com cinco ou seis o mobile vira uma grade de botões antes da lista. Os painéis abertos são `col-span-full order-last`, então abrir um filtro empurra a lista para baixo.

**Cada filtro tem interação própria.** UF, partido e tema abrem painel de chips; atividade é switch; escopo é segmented; concordância é um popover escrito à mão em `step-resultado.tsx:135-218`. São quatro modelos mentais na mesma barra. O estado de abertura também diverge: a listagem coordena um painel por vez com `openFilter` (`deputados-feed-view.tsx:79`), enquanto os controles aceitam também estado interno (`deputado-uf-control.tsx:35`).

**O custo de um filtro novo está no estado, não no layout.** Para UF, hoje se toca em `feed-url.ts` (parse, build e validador próprio), `feed-state.ts`, `use-deputado-feed-state.ts` (`changeUf` e `clearUf`) e na view (`handleUf` e `handleClearUf`, cada um repetindo o objeto inteiro de `buildDeputadosFeedHref`), mais os testes. `use-deputado-feed-state.ts` tem oito métodos que são o mesmo `reload` com um campo trocado.

## Formato

Busca inline, botão de filtros com contador, e chips do que está ativo logo abaixo:

```
[ Buscar por nome............. ] [Buscar]  [Filtros (2) v]
UF: São Paulo x   Em atividade x                Limpar filtros
```

A barra passa a ter custo constante em espaço. Os chips de ativos resolvem o principal defeito de esconder filtros atrás de um botão: sem eles, o usuário perde de vista por que a lista está filtrada. O painel é ancorado no desktop e centralizado no mobile.

Dentro do painel, a aplicação é em bloco — o painel mantém um rascunho e só grava no `Aplicar`. Hoje cada interação dispara um fetch; no matcher, cada toggle chama `runFetch` (`use-matcher-state.ts:150`, `use-matcher-state.ts:167`), então trocar escopo e atividade são dois POSTs de execução. Com aplicação em bloco, um.

## Onde cada filtro mora

Esta é a decisão que trava o resto, e ela não muda: **o filtro de concordância continua fora da URL**.

O ADR 021 e a regra correspondente do `CONTEXT.md` proíbem `externalIdProposicao` em endereço de página, porque a proposição marcada, cruzada com os deputados exibidos, permite inferir a posição declarada do usuário — convicção política. Levar a concordância para a query string por simetria com escopo e atividade trocaria essa proteção por conveniência de implementação, que é exatamente a alternativa que o ADR 021 já rejeitou.

O painel, portanto, lê de duas fontes:

- **URL** — escopo e atividade, via `parseResultadoUrlState` / `buildResultadoHref`.
- **Rascunho de execução do matcher** — concordância, via o provider.

E `Aplicar` grava nas duas dentro do mesmo handler: um `router.replace` para escopo e atividade, uma escrita no rascunho para a concordância.

A consequência é que voltar pelo histórico restaura escopo e atividade mas mantém a concordância. Isso não é regressão: é o mesmo comportamento que o ADR 021 já registrou como aceito ao dizer que duas abas podem exibir recortes diferentes do mesmo resultado. O que a migração precisa garantir é que a leitura seja sempre da combinação das duas fontes, nunca de uma cópia guardada no componente.

Manter a decisão também elimina trabalho que a alternativa exigiria: validar ids vindos da URL contra as proposições elegíveis antes de montar o payload — sem isso `validateExecucao` responde 400 e a tela troca a lista por um erro (`matcher-execucao-validation.ts:39-49`) — e canonizar a lista por ordem e duplicidade para não re-executar à toa.

## Pontos da migração

### 1. Rascunho do painel e histórico

Com `Aplicar`, a URL só muda no clique. A regra que evita estado velho é: o rascunho se inicializa das fontes aplicadas toda vez que o painel abre, e é descartado ao fechar sem aplicar. Painel fechado não guarda estado.

O `requestedFiltersRef` (`matcher-resultado.tsx:28`) evita re-execução comparando uma chave string dos filtros da URL. Como a concordância não entra na URL, essa chave continua como está.

### 2. CTAs de filtro fora da barra

`ResultadoVazio` e `ResultadoFiltroConcordanciaVazio` recebem `onEscopoChange` e `onToggleProposicao` e servem de recuperação do estado vazio (`step-resultado.tsx:281-291`). Com o escopo dentro do painel esses CTAs ficam mais importantes, não menos, e devem aplicar direto, sem abrir o painel. Isso reforça a regra anterior: o estado aplicado é a fonte de verdade, o rascunho do painel é efêmero.

### 3. Quebrar os controles em trigger e corpo

`DeputadoUfControl` e `DeputadoPartidoControl` expõem `open`, `onOpenChange`, `panelClassName` e `triggerClassName` — quatro props que existem só para o pai coordenar layout e garantir um painel aberto por vez. Dentro do painel único, cada controle vira a lista de chips e mais nada; as quatro props e o `openFilter` desaparecem.

Os specs desses dois controles testam abrir e fechar pelo trigger (`deputado-uf-control.spec.ts`, `deputado-partido-control.spec.ts`); passam a testar seleção. É reescrita, não ajuste.

### 4. Reusar a mecânica de popover que já existe

`shared/ui/help-popover.tsx` já resolve portal, posicionamento com flip quando não cabe abaixo, Escape, clique fora, gestão de foco e o modo centralizado no mobile. Nenhum filtro atual tem nada disso: os painéis são `hidden` inline e não fecham com Escape nem clicando fora. Extrair esse comportamento para um `Popover` genérico em `shared/ui` e reusar é mais barato e mais correto do que escrever o painel do zero.

### 5. Contador e rótulos

O contador do botão conta filtros fora do padrão. Escopo `estadual` e `emAtividade=false` são padrões e não somam — sem essa regra, uma tela sem filtro nenhum exibe "Filtros (1)". Concordância com três proposições conta como um filtro, com o chip dizendo o número.

Os chips ativos precisam de rótulo legível. UF tem `toEstadoLabel` e tema tem label próprio; partido é a sigla; escopo e concordância não têm nada hoje e precisam de duas funções de apresentação.

### 6. O que "limpar" significa

`handleClearFilters` hoje limpa também a busca (`deputados-feed-view.tsx:219`), e a lista vazia chama a mesma função via `onClearFilters`. Com a busca fora do painel, um "limpar" dentro do painel que apaga a busca é surpreendente.

- O painel limpa apenas filtros.
- A busca mantém o "Limpar busca" que já existe.
- O estado vazio da lista continua limpando tudo, com o rótulo dizendo isso.

No matcher, o escopo fica fora do "limpar": voltar para "Meu estado" troca o conjunto inteiro de resultados, é navegação disfarçada de filtro.

### 7. Estado de carregamento

O `disabled={status === "loading"}` espalhado por controle deixa de ser necessário: com aplicação em bloco, quem desabilita é o botão `Aplicar`.

## Impacto por arquivo

| Arquivo | Mudança |
| --- | --- |
| `features/deputados/components/deputados-feed-view.tsx` (390 l.) | Barra inline sai; os oito `handleX`/`handleClearX` viram um `applyFiltros(next)` |
| `features/matcher/components/resultado/step-resultado.tsx` (368 l.) | `renderFilterControls` sai; escopo, atividade e o popover de concordância viram itens do painel |
| `shared/deputado/use-deputado-feed-state.ts` (240 l.) | Oito métodos change/clear viram `applyFiltros` e `clearFiltros` |
| `shared/deputado/deputado-uf-control.tsx`, `deputado-partido-control.tsx` | Perdem o trigger e as props de layout |
| `shared/proposicao/feed-tema.tsx` | Idem, quando o feed migrar |
| `shared/ui/` | Ganha `Popover` genérico extraído de `help-popover.tsx`, e o painel de filtros |
| `features/feed/components/feed-view.tsx` | Migra por consistência, sem urgência |

## Ordem

1. `Popover` genérico extraído de `help-popover.tsx`, sem mudar o `HelpPopover` de lugar.
2. Painel na listagem de deputados, com os filtros que já existem e sem tocar em contrato de API.
3. Painel no resultado do matcher, trazendo escopo, atividade e concordância, com a leitura combinada das duas fontes.
4. Feed de proposições, por consistência.

## Fora de escopo

Ordenação por métricas de deputado — presença, custo, proposições assinadas, comissões. São quatro critérios com duas direções cada, mas um único controle de escolha única, e dependem de dado que hoje não está no formato certo para ordenar e paginar: presença é por legislatura, cota é jsonb por deputado-ano, comissões são vínculos com repetição legítima. Também exigem um recorte temporal que a listagem não tem. Entram depois, sobre este painel.

## Relação com ADRs

Nenhum ADR muda. O ADR 020 continua definindo escopo e atividade como estado de URL com `replace`, e o ADR 021 continua mantendo o filtro de concordância fora do endereço. Este documento descreve como agrupar visualmente controles cujo modelo de estado já está decidido.
