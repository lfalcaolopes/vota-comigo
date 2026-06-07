# Executor de passo de ingestão

> Status: proposta de refactor arquitetural, ainda não implementada.
> Este documento registra o desenho desejado para um módulo de execução de um
> passo planejado da ingestão. A proposta assume que a
> [Fonte derivada de proposições afetadas](./fonte-derivada-proposicoes-afetadas.md)
> será implementada antes, portanto este módulo não deve concentrar política de
> proposições, temas ou matcher.

## Objetivo

Criar um módulo que execute **um** passo planejado da ingestão por vez,
concentrando a mecânica de:

- construir o `IngestionStepContext` correto para o tipo de fonte;
- resolver caminhos de arquivos fonte;
- detectar fonte CSV primária ausente;
- expor `readRecords`, `readCompanion` e `readDataset` quando aplicável;
- medir duração;
- emitir logs de passo;
- converter `StrictModeError` em resultado de aborto;
- retornar resumo, rejeições, lacunas e sinal de aborto em uma forma simples
  para o runner agregar.

O objetivo não é mover o loop inteiro da pipeline. O runner continua dono da
execução completa: configuração, plano, criação de passos, retry de lacunas,
fechamento de recursos, escrita dos logs finais e resumo da execução.

## Problema atual

Hoje `executeIngestionRunner` contém, no mesmo loop:

- busca do passo correspondente ao `IngestionPlanEntry`;
- construção do contexto de `api`, `db`, `derived` e CSV normal;
- regra de arquivo primário ausente;
- chamada ao passo;
- medição de duração;
- logs de início, lacuna e resultado;
- captura de `StrictModeError`;
- agregação de `StepSummary`, `Rejection` e `ExternalGap`.

Essa mistura torna a interface do runner rasa: a cada novo tipo de fonte ou
ajuste de comportamento de passo, a pessoa precisa reabrir o loop central e
entender detalhes que pertencem a uma única execução de passo.

Depois que a Fonte derivada de proposições afetadas existir, o runner não
precisa mais saber nenhuma política específica de `proposicoes` ou `tema`.
Sobra uma seam clara: **executar uma entrada do plano contra um passo resolvido**.

## Decisões fechadas

### Um passo por vez

O executor deve executar uma única dupla `(IngestionPlanEntry, IngestionStep)`.
Ele não deve receber o plano inteiro nem controlar o loop.

Motivo: se o executor possuir o loop inteiro, ele tende a absorver retry gaps,
`createSteps`, ciclo de vida de `close`, escrita de logs finais e resumo total.
Isso deixaria o módulo amplo em vez de profundo.

### O runner resolve o passo

O executor deve receber o `IngestionStep` já resolvido. Ele não deve receber a
lista de passos nem procurar por `entry.stepName`.

O runner preserva o comportamento atual de pular silenciosamente entradas sem
passo correspondente:

```ts
const step = stepsByName.get(entry.stepName);

if (step === undefined) {
  continue;
}

const result = await executor.execute(entry, step);
```

### O executor possui toda construção de contexto

O executor deve possuir a construção do `IngestionStepContext` para todos os
modos de fonte:

- `source === 'api' || source === 'db'`;
- `source === 'derived'`;
- CSV normal.

Isso inclui o guard de leitura CSV para passos que não consomem CSV, a exposição
de `years` e `readDataset` para passos derivados, a abertura da fonte primária e
a abertura de companion datasets.

Depois da Fonte derivada de proposições afetadas, o contexto `derived` continua
genérico: ele apenas fornece `readDataset`; política de completar
`proposicoes` e `proposicoesTemas` fica fora do executor.

### Fonte CSV primária ausente é resultado explícito

Fonte primária ausente não deve virar `StrictModeError`. Esse caso nasce no
executor, antes de chamar o passo. O executor deve preservar o comportamento
atual:

- criar `ExternalGap` do tipo `fonte_ausente`;
- criar `StepSummary` zerado para a entrada;
- emitir log de lacuna;
- marcar `aborted = true` quando `entry.scope === 'single'` ou
  `config.strict`;
- caso contrário, permitir que o runner continue a próxima entrada anual.

`StrictModeError` permanece reservado para abortos decididos dentro do passo.

### O executor possui logs de passo

O executor deve chamar:

- `logStepStart`;
- `logStepGap`;
- `logStepResult`.

Esses logs dependem de label de passo, descrição de arquivo fonte, lacuna de
fonte e duração. Todos esses dados pertencem à execução de um passo.

O runner continua dono apenas dos logs de execução completa:

- início da ingestão;
- mensagens de retry de lacunas;
- resumo final.

### Resultado achatado

O executor deve retornar um resultado achatado, não uma união discriminada.

```ts
export type StepExecutionResult = {
  summary?: StepSummary;
  rejections: readonly Rejection[];
  externalGaps: readonly ExternalGap[];
  aborted: boolean;
};
```

Isso simplifica o loop do runner:

```ts
if (result.summary !== undefined) {
  summaries.push(result.summary);
}

rejections.push(...result.rejections);
externalGaps.push(...result.externalGaps);

if (result.aborted) {
  aborted = true;
  break;
}
```

### `defaultSourcePath` pertence ao executor

A regra de caminho fonte deve morar no mesmo módulo que constrói contextos de
fonte:

- escopo único: `data/raw/{dataset}/{dataset}.csv`;
- escopo anual: `data/raw/{dataset}/{dataset}-{year}.csv`.

Ela deve continuar substituível por dependência (`sourcePathFor`) para testes,
mas a implementação padrão pode ser exportada pelo módulo.

## Interface proposta

Nomes finais devem seguir ADR-007. O esboço registra a forma da interface.

```ts
import type { Readable } from 'node:stream';
import type { CsvReader } from './csv-reader';
import type {
  ExternalGap,
  IngestionPlanEntry,
  IngestionReporter,
  IngestionRunnerConfig,
  IngestionStep,
  Rejection,
  StepSummary,
} from './ingestion-runner.types';

export type StepExecutionResult = {
  summary?: StepSummary;
  rejections: readonly Rejection[];
  externalGaps: readonly ExternalGap[];
  aborted: boolean;
};

export type IngestionStepExecutor = {
  execute(
    entry: IngestionPlanEntry,
    step: IngestionStep,
  ): Promise<StepExecutionResult>;
};

export type IngestionStepExecutorDeps = {
  config: IngestionRunnerConfig;
  csvReader: CsvReader;
  openSource(path: string): Readable;
  sourceExists(path: string): boolean;
  sourcePathFor(entry: IngestionPlanEntry): string;
  reporter?: IngestionReporter;
};

export function createIngestionStepExecutor(
  deps: IngestionStepExecutorDeps,
): IngestionStepExecutor;

export function defaultSourcePath(entry: IngestionPlanEntry): string;
```

O executor não deve receber:

- `createSteps`;
- `close`;
- `errorLog` filesystem;
- `gapLogReader`;
- `retryGapsPath`;
- lista completa de passos;
- plano completo.

## Comportamento esperado

### Passos `api` e `db`

Para `step.source === 'api' || step.source === 'db'`, o executor monta contexto
com:

- `dryRun`, `strict`, `debug`, `limit`;
- `sourceFile` igual ao nome do passo;
- `reporter`;
- `readRecords` apontando para um guard que lança erro quando chamado.

Esses passos não têm arquivo fonte primário nem companion dataset.

### Passos `derived`

Para `step.source === 'derived'`, o executor monta contexto com:

- `dryRun`, `strict`, `debug`, `limit`;
- `sourceFile` igual ao nome do passo;
- `reporter`;
- `readRecords` apontando para o mesmo guard;
- `years` vindo de `config.years`;
- `readDataset(dataset, year)`.

`readDataset` deve:

1. resolver caminho usando `sourcePathFor`;
2. retornar `undefined` se `sourceExists(path)` for falso;
3. retornar uma função que chama `csvReader(openSource(path))` quando a fonte
   existir.

O executor não deve tentar completar arquivos derivados. Isso pertence aos
passos ou, para `proposicoes` e `tema`, à Fonte derivada de proposições
afetadas.

### Passos CSV normais

Para passos sem `source` especial:

1. resolver o caminho primário com `sourcePathFor(entry)`;
2. se o arquivo não existir, retornar resultado com:
   - `summary` zerado;
   - `externalGaps` com uma lacuna `fonte_ausente`;
   - `aborted` igual a `entry.scope === 'single' || config.strict`;
3. se existir, montar contexto com:
   - `dryRun`, `strict`, `debug`, `limit`;
   - `sourceFile` como `basename(sourcePath)`;
   - `year` da entrada;
   - `reporter`;
   - `readRecords`;
   - `readCompanion(dataset)`.

`readCompanion` deve resolver o caminho usando a mesma entrada com o dataset
substituído, retornar `undefined` quando ausente e retornar uma função de leitura
quando existir.

### Execução do passo

Para qualquer contexto válido:

1. criar label com `stepLabel(entry.stepName, entry.year)`;
2. logar início com `logStepStart`;
3. medir duração com `performance.now()`;
4. executar `step.run(context)`;
5. montar `StepSummary`;
6. logar resultado com `logStepResult`;
7. retornar rejeições e lacunas vindas do `StepRunResult`;
8. capturar `StrictModeError` e retornar `aborted: true` com a rejeição e/ou
   lacuna presentes no erro.

Erros que não sejam `StrictModeError` devem continuar escapando.

## Alteração prevista no runner

O runner deve ficar com um loop mais simples:

```ts
const stepsByName = new Map(steps.map((step) => [step.name, step]));
const executor = createIngestionStepExecutor({
  config,
  csvReader,
  openSource,
  sourceExists,
  sourcePathFor,
  reporter: options.reporter,
});

for (const entry of plan) {
  const step = stepsByName.get(entry.stepName);

  if (step === undefined) {
    continue;
  }

  const result = await executor.execute(entry, step);

  if (result.summary !== undefined) {
    summaries.push(result.summary);
  }

  rejections.push(...result.rejections);
  externalGaps.push(...result.externalGaps);

  if (result.aborted) {
    aborted = true;
    break;
  }
}
```

`executeIngestionRunner` continua responsável por:

- `runIngestionRunner`;
- leitura de `retryGapsPath`;
- chamada a `createSteps`;
- `try/finally` com `close`;
- escrita de error log e gap log;
- cálculo de `IngestionSummary`;
- `reportRunStart` e `reportSummary`.

## Testes necessários

### Executor

- Monta contexto de passo `api` com guard de `readRecords`.
- Monta contexto de passo `db` com guard de `readRecords`.
- Monta contexto de passo `derived` com `years` e `readDataset`.
- `readDataset` retorna `undefined` quando arquivo derivado não existe.
- `readDataset` lê CSV quando arquivo derivado existe.
- Monta contexto de CSV normal com `readRecords` e `readCompanion`.
- `readCompanion` retorna `undefined` quando companion não existe.
- Fonte primária ausente em passo anual retorna summary zerado e `aborted:
  false` no modo normal.
- Fonte primária ausente em passo anual retorna summary zerado e `aborted: true`
  em `--strict`.
- Fonte primária ausente em passo único retorna summary zerado e `aborted:
  true`.
- Step concluído retorna summary, rejeições e lacunas.
- `StrictModeError` com rejeição retorna `aborted: true` e rejeição achatada.
- `StrictModeError` com lacuna retorna `aborted: true` e lacuna achatada.
- Erro comum continua escapando.
- Logs de início, lacuna e resultado são emitidos nos cenários correspondentes.
- `defaultSourcePath` preserva caminhos de escopo único e anual.

### Runner

Depois que o executor tiver testes próprios, os testes de `executeIngestionRunner`
podem focar no ciclo completo:

- resolve config e plano;
- cria passos;
- fecha recursos no `finally`;
- agrega resultados do executor;
- escreve error log e gap log;
- calcula resumo final;
- para quando o executor retorna `aborted: true`;
- preserva retry de lacunas de `deputado_historico`.

## Migração incremental

1. Criar o módulo novo com `defaultSourcePath`, guard de leitura e executor.
2. Copiar para ele a construção de contexto sem alterar comportamento.
3. Cobrir o executor com testes unitários.
4. Trocar o loop de `executeIngestionRunner` para usar o executor.
5. Remover funções privadas do runner que migraram para o executor.
6. Rodar testes do runner e pipeline completa.

## Arquivos de referência

- `apps/api/src/ingestion/runner/ingestion-runner.ts`
- `apps/api/src/ingestion/runner/ingestion-runner.types.ts`
- `apps/api/src/ingestion/runner/step-logging.ts`
- `apps/api/src/ingestion/runner/strict-mode-error.ts`
- `apps/api/src/ingestion/runner/tests/ingestion-runner.spec.ts`
- `apps/api/src/ingestion/runner/tests/full-pipeline.spec.ts`
