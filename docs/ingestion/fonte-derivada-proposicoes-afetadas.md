# Fonte derivada de proposições afetadas

> Status: refactor arquitetural implementado.
> Este documento registra a forma desejada do módulo para orientar a
> implementação sem reabrir as decisões já tomadas na conversa de
> arquitetura. Decisões de domínio relacionadas: [ADR-0012](../adr/012-ingestao-proposicoes-sem-api-sem-principal.md),
> [ADR-0009](../adr/009-vinculo-votacao-proposicao.md) e [ADR-0013](../adr/013-ranking-volume-votacoes-plenario.md).

## Objetivo

Criar um módulo específico para a **Fonte derivada de proposições afetadas**.
Esse módulo concentra a mecânica hoje espalhada entre os passos `proposicoes` e
`tema`: descobrir quais proposições afetadas precisam de fonte local, completar
arquivos anuais ausentes por download quando permitido, aplicar a política de
lacunas e emitir logs operacionais.

O objetivo não é criar uma abstração genérica para qualquer passo derivado. A
regra é específica das proposições afetadas porque depende do vínculo canônico
`votacoesProposicoes-{ano}.csv`, das votações nominais em escopo e da política
especial de ADR-0012 para `proposicoes-{ano}.csv` e
`proposicoesTemas-{ano}.csv`.

## Problema atual

Hoje o passo `proposicoes`:

- chama `collectNeededProposicoes`;
- calcula anos necessários;
- verifica arquivos `proposicoes-{ano}.csv`;
- baixa arquivos ausentes;
- cria mensagem de falha de download;
- decide quando uma proposição necessária ausente vira lacuna ou aborta em
  `--strict`;
- percorre os CSVs e transforma linhas em `ProposicaoRow`.

O passo `tema` repete parte significativa da mesma mecânica:

- chama `collectNeededProposicoes`;
- calcula anos necessários;
- verifica arquivos `proposicoesTemas-{ano}.csv`;
- baixa arquivos ausentes;
- cria mensagem de falha de download;
- percorre os CSVs e transforma linhas em temas e vínculos.

O módulo `collectNeededProposicoes` já é uma tentativa de concentrar a regra de
"conjunto necessário", mas sua interface ainda deixa os passos responsáveis por
download, logs, lacunas e abortos. Pelo teste de deleção, se esse módulo e as
funções `ensure*Files` fossem removidos, a complexidade reapareceria nos dois
passos. Há uma interface mais profunda tentando existir.

## Decisões fechadas

### Escopo estreito

O módulo deve ser estreito: **Fonte derivada de proposições afetadas**, cobrindo
os passos `proposicoes` e `tema`. Não deve virar uma máquina genérica de fontes
derivadas.

Motivo: as políticas de `proposicoes` e `tema` vêm de uma decisão de domínio
específica. Generalizar agora aumentaria a interface sem ganho real.

### O módulo possui download e falha de download

O módulo deve acionar os `DatasetDownloader` de `proposicoes` e
`proposicoesTemas`, detectar anos ausentes e construir as mensagens de retomada
em caso de falha.

Os passos não devem receber "anos ausentes" para decidir o que fazer. Eles devem
receber uma fonte preparada ou uma falha/lacuna já classificada.

### O módulo possui aborto em modo estrito

O módulo deve receber `strict` e lançar `StrictModeError` nos casos fatais. O
runner já tem uma seam de aborto para `StrictModeError`; reutilizar essa seam
mantém a mudança pequena e preserva o comportamento operacional.

Políticas:

- Falha de download de arquivo necessário aborta quando download está habilitado.
- Proposição necessária ausente em `proposicoes-{ano}.csv` vira lacuna no modo
  normal e aborta em `--strict`, exceto em dry-run.
- Tema ausente para uma proposição ingerida não vira lacuna por proposição; a
  cobertura temática é editorial e incompleta por natureza.

### O módulo possui logs operacionais

O módulo deve aceitar um reporter estreito, com apenas `log`, para emitir os
logs que hoje pertencem à preparação da fonte:

- `[proposicoes] N proposições necessárias em M ano(s)`
- `[proposicoes] baixando proposicoes-{ano}.csv ausentes: ...`
- `[tema] temas necessários para proposições de M ano(s)`
- `[tema] baixando proposicoesTemas-{ano}.csv ausentes: ...`

Ele não deve depender de `debug`, `status`, `sourceFile`, `readRecords` nem do
restante do contexto do runner.

### O módulo não possui parsing nem escrita

O módulo não deve transformar linhas em `ProposicaoRow`, `TemaRow` ou
`ProposicaoTemaRow`, nem resolver lookups, nem gravar no banco.

Parsing e persistência continuam nos passos:

- `proposicoes` transforma registros de `proposicoes-{ano}.csv` em
  `ProposicaoRow` e chama `ProposicaoRepository`.
- `tema` transforma registros de `proposicoesTemas-{ano}.csv` em `TemaRow` e
  `ProposicaoTemaRow`, resolve lookups e chama `TemaRepository`.

Isso mantém a localidade da fonte sem criar um módulo grande demais.

### Dois workflows públicos

O módulo deve expor dois workflows públicos, não um método genérico
parametrizado por dataset:

- preparação de `proposicoes`;
- preparação de `tema`.

Motivo: os dois workflows compartilham a descoberta de proposições afetadas, mas
têm semânticas diferentes de lacuna. Uma interface genérica esconderia essa
diferença atrás de flags.

## Interface proposta

Nomes finais devem seguir ADR-007. O esboço abaixo registra a forma da
interface, não exige esses nomes exatos.

```ts
import type { CsvRowSource } from '../../ingestion-runner.types';
import type { DatasetDownloader } from '../../shared/dataset-downloader';
import type { ExternalGap, IngestionReporter } from '../../ingestion-runner.types';

export type FonteDerivadaProposicoesAfetadasOptions = {
  years: readonly number[];
  limit?: number;
  canDownload: boolean;
  strict: boolean;
  reporter?: Pick<IngestionReporter, 'log'>;
  readDataset(dataset: string, year: number): CsvRowSource | undefined;
};

export type NeededProposicoes = {
  neededByYear: ReadonlyMap<number, ReadonlySet<number>>;
};

export type PreparedProposicoes = NeededProposicoes & {
  externalGaps: readonly ExternalGap[];
};

export type FonteDerivadaProposicoesAfetadas = {
  prepareProposicoes(
    options: FonteDerivadaProposicoesAfetadasOptions,
  ): Promise<PreparedProposicoes>;

  prepareTemas(
    options: FonteDerivadaProposicoesAfetadasOptions,
  ): Promise<PreparedProposicoes>;
};

export type FonteDerivadaProposicoesAfetadasDeps = {
  proposicoesDownloader: DatasetDownloader;
  temasDownloader: DatasetDownloader;
};
```

O `canDownload` deve ser `false` em `--dry-run`. Isso preserva o comportamento
atual: dry-run valida e parseia o que está disponível, mas não aciona rede.

## Comportamento esperado

### `prepareProposicoes`

1. Deriva `neededByYear` a partir de:
   - `votacoesVotos-{ano}.csv`, para descobrir votações nominais em escopo;
   - `votacoesProposicoes-{ano}.csv`, para descobrir proposições afetadas e o
     ano de apresentação de cada uma.
2. Respeita `years` e `limit`.
3. Emite log com a quantidade total de proposições necessárias e a quantidade de
   anos.
4. Verifica quais `proposicoes-{ano}.csv` estão ausentes.
5. Se `canDownload` for `true`, baixa os anos ausentes pelo downloader de
   `proposicoes`.
6. Se o download falhar, lança `StrictModeError.fromGap` com mensagem de
   retomada:
   `npm run ingest -- --only=proposicoes,votacao_proposicao`.
7. Depois da preparação, o passo `proposicoes` lê os arquivos com
   `readDataset('proposicoes', year)`.
8. Quando uma proposição necessária não aparece no CSV do ano correspondente:
   - modo normal: retorna `ExternalGap` do tipo `proposicao_ausente`;
   - `--strict` com download habilitado: aborta com `StrictModeError`;
   - dry-run: não deve acionar rede; lacunas encontradas em arquivos presentes
     podem ser reportadas sem escrita.

### `prepareTemas`

1. Reusa a mesma derivação de `neededByYear`.
2. Emite log com a quantidade de anos de tema necessários.
3. Verifica quais `proposicoesTemas-{ano}.csv` estão ausentes.
4. Se `canDownload` for `true`, baixa os anos ausentes pelo downloader de
   `proposicoesTemas`.
5. Se o download falhar, lança `StrictModeError.fromGap` com mensagem de
   retomada:
   `npm run ingest -- --only=tema`.
6. Depois da preparação, o passo `tema` lê os arquivos com
   `readDataset('proposicoesTemas', year)`.
7. Tema ausente para uma proposição não gera lacuna por proposição.

## Alterações previstas nos passos

### `proposicoes`

O passo deve deixar de chamar `collectNeededProposicoes` diretamente e deixar de
ter uma função própria `ensureProposicaoFiles`.

Fluxo desejado:

```ts
const prepared = await fonte.prepareProposicoes({
  years: context.years ?? [],
  limit: context.limit,
  canDownload: !context.dryRun,
  strict: context.strict,
  reporter: context.reporter,
  readDataset,
});

for (const [year, neededIds] of prepared.neededByYear) {
  const yearSource = readDataset('proposicoes', year);
  // parsing e ProposicaoRow continuam aqui
}
```

O passo ainda deve:

- transformar CSV em `ProposicaoRow`;
- contar `read`;
- chamar `repository.upsert`;
- retornar os `externalGaps` não fatais produzidos pela fonte;
- aplicar `dryRun` à escrita.

### `tema`

O passo deve deixar de chamar `collectNeededProposicoes` diretamente e deixar de
ter uma função própria `ensureTemaFiles`.

Fluxo desejado:

```ts
const prepared = await fonte.prepareTemas({
  years: context.years ?? [],
  limit: context.limit,
  canDownload: !context.dryRun,
  strict: context.strict,
  reporter: context.reporter,
  readDataset,
});

for (const year of prepared.neededByYear.keys()) {
  const yearSource = readDataset('proposicoesTemas', year);
  // parsing, deduplicação, lookups e vínculos continuam aqui
}
```

O passo ainda deve:

- carregar `proposicaoLookup`;
- transformar CSV em `TemaRow` e `ProposicaoTemaRow`;
- deduplicar temas e vínculos;
- resolver `temaLookup` depois do upsert de temas;
- aplicar `dryRun` à escrita.

## Local sugerido

Local provável:

```text
apps/api/src/ingestion/runner/steps/proposicoes/fonte-derivada-proposicoes-afetadas.ts
```

Alternativa aceitável, se a implementação preferir manter fontes compartilhadas
fora de um passo específico:

```text
apps/api/src/ingestion/runner/shared/fonte-derivada-proposicoes-afetadas.ts
```

A primeira opção concentra a origem conceitual perto de `proposicoes`, mas pode
parecer estranha porque `tema` também consome o módulo. A segunda opção deixa
claro que há dois consumidores. A escolha final deve priorizar importações
simples e legibilidade nos testes.

## Testes necessários

Os testes devem descrever comportamento, não estrutura interna.

### Fonte derivada

- Deriva anos de proposição a partir de votações nominais em escopo e
  `votacoesProposicoes`.
- Respeita `limit` ao coletar votações nominais.
- Ignora vínculos sem `idVotacao`, sem `proposicao_id` ou sem
  `proposicao_ano`.
- Baixa anos ausentes de `proposicoes`.
- Falha de download de `proposicoes` aborta com mensagem de retomada correta.
- Proposição necessária ausente em CSV presente retorna lacuna no modo normal.
- Proposição necessária ausente aborta em `--strict`.
- Dry-run não aciona downloader.
- Baixa anos ausentes de `proposicoesTemas`.
- Falha de download de `proposicoesTemas` aborta com mensagem de retomada
  correta.
- Tema ausente para proposição não gera lacuna por proposição.
- Logs operacionais são emitidos para preparação e download.

### Passos

Depois que a fonte derivada tiver testes próprios, os testes de `proposicoes` e
`tema` podem ficar mais estreitos:

- `proposicoes` transforma e grava apenas as proposições necessárias retornadas
  pela fonte.
- `proposicoes` preserva lacunas não fatais vindas da fonte.
- `tema` transforma e grava temas/vínculos apenas para proposições já ingeridas.
- `tema` preserva lacunas não fatais vindas da fonte.
- Ambos continuam respeitando `dryRun` para não escrever no banco.

## Migração incremental

1. Criar o módulo novo e mover para ele a lógica de `collectNeededProposicoes`.
2. Implementar `prepareProposicoes` preservando mensagens e tipos de lacuna
   atuais.
3. Redirecionar `proposicoes.step` para a nova interface.
4. Implementar `prepareTemas` usando a mesma derivação interna.
5. Redirecionar `tema.step` para a nova interface.
6. Reduzir ou remover exports antigos que permitam bypassar a fonte derivada.
7. Rodar os testes dos passos derivados e o teste de pipeline completo.

## Arquivos de referência

- `apps/api/src/ingestion/runner/steps/proposicoes/needed-proposicoes.ts`
- `apps/api/src/ingestion/runner/steps/proposicoes/proposicoes.step.ts`
- `apps/api/src/ingestion/runner/steps/tema/tema.step.ts`
- `apps/api/src/ingestion/runner/shared/dataset-downloader.ts`
- `apps/api/src/ingestion/runner/ingestion-runner.ts`
- `docs/adr/012-ingestao-proposicoes-sem-api-sem-principal.md`
