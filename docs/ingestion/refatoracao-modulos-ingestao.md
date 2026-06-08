# Refatoração dos Módulos de Ingestão — Contexto

Esta nota registra o contexto para uma refatoração futura dos módulos `camara-csv-downloader` e `pipeline-runner` em `apps/api/src/ingestion/`. Ela não muda contrato operacional nem substitui os documentos [camara-csv-downloader.md](./camara-csv-downloader.md) e [pipeline-runner-ingestao.md](./pipeline-runner-ingestao.md). O objetivo é orientar uma reorganização de arquivos quando a mudança for executada.

## Intenção

O backend deve favorecer módulos em que o root exponha poucos entrypoints claros, enquanto detalhes de implementação ficam em pastas por responsabilidade. Para módulos Nest HTTP comuns, a preferência é deixar no root apenas `module`, `controller`, `service` e `repository`, criando pastas como `dto/`, `entities/`, `use-cases/`, `mappers/`, `validators/`, `guards/`, `constants/`, `types/`, `errors/` e `tests/` somente quando necessárias.

Os módulos de ingestão não são módulos HTTP/CRUD. Portanto, eles devem aproveitar a mesma filosofia, mas com vocabulário próprio do pipeline: `plan`, `download`, `adapters`, `resilience`, `composition`, `sources`, `logs`, `reporting`, `steps`, `shared`, `types`, `errors` e `tests`.

## Restrições

- A refatoração deve ser estrutural. Não deve alterar comportamento, flags, mensagens públicas, caminhos de `data/raw/`, política de retry, política de logs ou ordem dos passos.
- Os CSVs em `apps/api/data/raw/` são fonte local de ingestão e não devem ser escritos, sobrescritos ou usados como fixtures.
- Os nomes seguem a ADR 007: estrutura sintática em inglês, termos de domínio em português sem acento e nomes preservados da fonte Câmara quando vierem dos CSVs/API.
- Tipos, enums ou literal sets que cruzam fronteiras devem continuar indo para `@vota-comigo/shared-types` quando forem contrato compartilhado. `types/` local é apenas para contratos internos do módulo.
- `entities/` não deve duplicar schema Drizzle. O schema de banco continua em `apps/api/src/shared/database/schema/`.
- Pastas vazias não devem ser criadas.

## `camara-csv-downloader`

`camara-csv-downloader` é uma ferramenta operacional que baixa os CSVs públicos da Câmara para `data/raw/`. A interface pública do módulo deve continuar pequena: planejamento da execução, execução do download e entrypoint CLI.

Estrutura alvo sugerida:

```txt
camara-csv-downloader/
  csv-downloader.cli.ts
  csv-downloader.ts

  config/
    csv-downloader.config.ts

  plan/
    csv-download-plan.ts

  download/
    download-csv-plan.ts
    download-csv-plan-item.ts
    csv-download-summary.ts

  adapters/
    fetch-csv-transport.ts
    node-file-system.ts

  resilience/
    inactivity-timeout.ts
    retry-policy.ts

  types/
    csv-downloader.types.ts

  tests/
    csv-downloader.spec.ts
    csv-downloader.dataset.spec.ts
    download-csv-plan-item.spec.ts
```

Papel esperado de cada área:

- `csv-downloader.ts`: fachada do módulo, mantendo `runCsvDownloader` e `executeCsvDownloader`.
- `config/`: parsing e validação das flags do downloader.
- `plan/`: montagem do catálogo de arquivos e resolução de URLs/caminhos locais.
- `download/`: execução concorrente do plano, download de um item e sumarização.
- `adapters/`: implementações concretas de transporte HTTP e filesystem Node.
- `resilience/`: retry, backoff, `Retry-After` e timeout por inatividade.
- `types/`: contratos internos do downloader.
- `tests/`: specs do módulo.

O atual `csv-downloader.ts` concentra execução, concorrência, download de item e relatório. A refatoração deve extrair essas responsabilidades sem transformar cada helper em um pass-through. O caller idealmente continua importando o mínimo possível do root.

## `pipeline-runner`

`pipeline-runner` é o orquestrador da pipeline de ingestão. Ele lê fontes locais, monta contexto de execução, compõe passos, registra rejeições/lacunas e produz resumo. A pasta `steps/` já expressa bem a unidade principal do domínio e deve continuar como centro do módulo.

Estrutura alvo sugerida:

```txt
pipeline-runner/
  ingestion-pipeline-runner.cli.ts
  ingestion-pipeline-runner.ts

  config/
    ingestion-pipeline-runner.config.ts

  plan/
    ingestion-plan.ts
    ingestion-step-descriptors.ts

  composition/
    ingestion-steps.ts
    dry-run-deps.ts

  sources/
    csv-reader.ts
    source-path.ts

  logs/
    error-log.ts
    gap-log.ts
    gap-log-reader.ts
    node-error-log-file-system.ts
    node-gap-log-reader-file-system.ts

  reporting/
    console-reporter.ts
    step-logging.ts
    run-reporting.ts

  errors/
    strict-mode-error.ts

  types/
    ingestion-pipeline-runner.types.ts

  shared/
    bounded-concurrency.ts
    camara-api-transport.ts
    camara-historico-client.ts
    camara-uri.ts
    dataset-downloader.ts
    *.normalizer.ts

  steps/
    deputados/
    deputado-historico/
    legislaturas/
    partidos/
    proposicoes/
    sanity/
    tema/
    votacao-proposicao/
    votacao-votos/
    votacoes/

  tests/
    ...
```

Papel esperado de cada área:

- `ingestion-pipeline-runner.ts`: fachada do pipeline-runner, mantendo `runIngestionPipelineRunner` e `executeIngestionPipelineRunner`.
- `ingestion-pipeline-runner.cli.ts`: adapter CLI.
- `config/`: parsing e validação de flags do pipeline-runner.
- `plan/`: montagem do plano e lista estática de descritores dos passos.
- `composition/`: criação dos passos, wiring de repositórios/lookups/clientes e dependências de dry-run.
- `sources/`: leitura de CSVs e resolução de caminhos de fontes em `data/raw/`.
- `logs/`: escrita e leitura de logs persistidos de erros e lacunas.
- `reporting/`: output ao vivo, logs de passo, banner inicial e resumo.
- `errors/`: erros internos com semântica de controle, como strict mode.
- `types/`: contratos internos do pipeline-runner.
- `shared/`: utilidades compartilhadas por mais de um passo ou subárea do pipeline-runner.
- `steps/`: implementação dos passos de ingestão.

O `ingestionStepDescriptors` deve sair de `ingestion-pipeline-runner.ts` para `plan/ingestion-step-descriptors.ts`, porque descreve o pipeline e não a execução. O `defaultSourcePath` deve sair de `ingestion-pipeline-runner.ts` para `sources/source-path.ts`, porque é parte do contrato com `data/raw/`. Os helpers de resumo (`reportRunStart`, `reportSummary`, `describeMode`) podem ir para `reporting/run-reporting.ts`.

O atual `ingestion-steps.ts` mistura criação de steps reais, dependências de dry-run, guards e criação do cliente de banco. A separação inicial recomendada é:

```txt
composition/
  ingestion-steps.ts
  dry-run-deps.ts
```

`ingestion-steps.ts` deve continuar sendo o ponto de composição público. `dry-run-deps.ts` deve conter somente os adapters/guards usados quando `dryRun` está ativo.

## Steps

Os steps já têm uma estrutura razoável e não precisam ser reorganizados na primeira rodada. Se forem refinados depois, o padrão por step pode ser:

```txt
steps/proposicoes/
  proposicoes.step.ts
  proposicoes.repository.ts
  proposicoes.repository.types.ts
  proposicoes.transformer.ts
  tests/
```

Essa mudança deve ser tratada como segunda etapa, porque mover todos os specs de steps aumenta o volume de imports alterados sem limpar o root do `pipeline-runner`, que é o problema principal.

## Ordem recomendada

1. Refatorar `camara-csv-downloader`, porque é menor e valida o padrão de pastas com baixo risco.
2. Rodar os testes do downloader e ajustar imports.
3. Refatorar o root de `pipeline-runner`, sem mexer inicialmente em `steps/`.
4. Rodar os testes do pipeline-runner.
5. Só então avaliar se vale mover specs internas de `steps/` para subpastas `tests/`.

## Critérios de sucesso

- `camara-csv-downloader/` e `pipeline-runner/` ficam com roots pequenos e fáceis de escanear.
- Imports externos aos módulos continuam apontando para fachadas ou entrypoints claros.
- Testes continuam descrevendo comportamento, não localização de arquivos.
- Nenhuma mudança funcional aparece nos contratos operacionais documentados.
- A estrutura futura ajuda a encontrar onde mudar configuração, plano, fonte, log, reporting, adapter e resiliência sem procurar no root inteiro.
