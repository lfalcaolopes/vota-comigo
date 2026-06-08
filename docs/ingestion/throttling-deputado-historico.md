# Throttling da API da Câmara no passo `deputado_historico`

## Objetivo

Registrar a investigação do problema de lentidão/timeout que ocorre ao popular
`deputado_historico` via `GET /deputados/{id}/historico`, consolidando os
sintomas, as hipóteses levantadas, o que foi testado, o que foi descartado e os
mecanismos já implementados. Serve como referência para retomar o trabalho sem
repetir experimentos já feitos.

Data da investigação: 2026-05-31 a 2026-06-01.

## Contexto

O passo `deputado_historico` percorre os ~2320 deputados ingeridos e, para cada
um, busca o histórico na API da Câmara (`dadosabertos.camara.leg.br`). As
chamadas rodam com concorrência limitada (`mapWithConcurrency`). Não há fonte
CSV para esse dado — a API é a única origem.

## Sintoma observado

A execução roda normalmente até **cerca de 1000 deputados** e então degrada de
forma abrupta:

- Antes do limite: respostas rápidas, **40ms a 800ms**.
- Depois do limite: as requisições **travam**. As que eventualmente retornam com
  sucesso levam **68s a 151s**. As demais estouram o timeout do cliente.
- O ponto de virada é consistente em torno de 1000–1150 deputados,
  independentemente de outros parâmetros (ver experimentos abaixo).

Detalhe crítico de diagnóstico: **o servidor nunca devolve `429` nem
`Retry-After` nem cabeçalhos `X-RateLimit-*`**. Toda falha registrada é um
**timeout do lado do cliente** (o `AbortSignal.timeout` dispara), mapeado
internamente para um `503` sintético com a mensagem `tempo limite de Xms
excedido`. Ou seja: o servidor **aceita a conexão e não responde** (ou responde
em ~75s), em vez de rejeitar com um código de limite de taxa.

## Hipóteses testadas

### 1. Erro de stack overflow no upsert (problema distinto, corrigido)

Sintoma inicial diferente: `RangeError: Maximum call stack size exceeded` em
`drizzle-orm` ao gravar. Causa: o passo acumulava todas as linhas de todos os
deputados e fazia **um único** `insert().values([...])` com dezenas de milhares
de linhas; o builder recursivo do drizzle estourava a pilha.

Correção: o upsert passou a fragmentar em lotes (`UPSERT_CHUNK_SIZE = 1000`) em
`deputado-historico.repository.ts`. Resolvido e não relacionado ao throttling.

### 2. Limite por taxa (requisições por segundo) — DESCARTADO

Hipótese: estaríamos disparando rápido demais (com concorrência 10 e respostas
de ~100ms, ~100 req/s).

Teste: reduzir a concorrência de **10 para 3** (`API_CONCURRENCY` em
`deputado-historico.step.ts`).

Resultado: o limite continuou aparecendo **na mesma contagem** (~1065
deputados), apenas em um tempo de relógio maior. Se fosse limite por segundo, ir
mais devagar adiaria ou eliminaria o problema. Não adiou. **Descartado** como
limite puro de req/s; o gatilho acompanha a **contagem acumulada** de
requisições, não a taxa.

### 3. Limite por conexão keep-alive — DESCARTADO

Hipótese: o servidor (ou um proxy à frente) limitaria o número de requisições
por conexão TCP/keep-alive (~1000) e depois passaria a engolir as requisições
naquele socket. O `fetch` do Node (undici) reaproveita poucas conexões longas.

Teste: adicionar a dependência `undici` e usar um `Agent` com
`maxRequestsPerClient = 300` (reciclando o socket bem antes do suposto teto), em
`camara-api-transport.ts`. Confirmado por smoke test que uma requisição real
funciona por esse caminho.

Resultado: o limite continuou aparecendo (~1150 deputados). Se fosse por
conexão, reciclar a cada 300 requisições manteria todo socket "novo" e o limite
nunca apareceria. Apareceu mesmo assim. **Descartado** como limite por conexão.

O `Agent` com reciclagem e a dependência `undici` foram **revertidos** em
2026-06-01, por não trazerem benefício. O transporte voltou a usar o `fetch`
global (mantendo o seam injetável de `fetch` para testes).

### 4. Reset por processo vs. reset por tempo — REINTERPRETADO

Observação: ao **cancelar e reexecutar**, a nova execução roda rápido de novo
desde o início e só throttla depois de mais ~1000 deputados.

Interpretação inicial (errada): o contador seria por processo/conexão.

Reinterpretação: como a reciclagem de conexão (hipótese 3) não ajudou, o "reset"
provavelmente não é do processo, e sim do **tempo** — a pausa entre cancelar e
reexecutar deixa o orçamento do servidor se **recarregar**. Consistente com um
balde de tokens (token bucket) por IP.

### 5. Timeout curto causando lacunas — CONFIRMADO (efeito colateral)

Com timeout de 15s, requisições que o servidor responderia em ~75s eram
**abortadas cedo** e reentravam na fila de retry. Em execuções com cooldown, um
deputado podia consumir todas as 3 tentativas atravessando cooldowns e
**falhar de vez** (virar lacuna/`ExternalGap`). Observado o contador `falhas`
subindo de 0 para 11+ — ou seja, **perda de dados** fabricada pelo timeout
curto, não por falha real da fonte. Pior: cada retry abortado provavelmente
ainda consome um token, drenando o balde mais rápido durante o throttle.

Mitigação aplicada: `DEFAULT_TIMEOUT_MS` elevado para **50s** (era 15s) em
`camara-api-transport.ts`, para que respostas lentas-porém-válidas concluam na
primeira tentativa.

## Conclusão atual

A explicação que melhor casa com todas as evidências é um **limite por IP do
lado do servidor, em formato de balde de tokens**:

- Capacidade de rajada de ~1000 requisições (na prática ~1000–1150 deputados; o
  número de requisições HTTP é maior por causa da paginação).
- Quando o balde esvazia, o servidor **enfileira/atrasa** as requisições
  (~75s) em vez de rejeitá-las com `429`.
- O balde **recarrega ao longo do tempo** — daí a recuperação após uma pausa.

Grau de certeza: alto para "é throttling por IP do servidor que atrasa em vez de
rejeitar"; **não totalmente excluído** um vazamento de recurso no cliente
(timers/memória) diferente do pool de conexões, mas a reciclagem de conexão sem
efeito e a natureza por-contagem tornam isso improvável.

Itens ainda **desconhecidos**:

- A **taxa de recarga** do balde (quanto tempo de pausa restaura a rajada).
- Se existe uma **taxa sustentada** baixa o suficiente para nunca disparar o
  limite.
- O **tamanho da janela** (por minuto? por hora?).

## Mecanismos atuais (após reverter o que não ajudou)

Mantidos:

| Mecanismo | Arquivo | Efeito |
|-----------|---------|--------|
| Upsert em lotes (`UPSERT_CHUNK_SIZE = 1000`) | `deputado-historico.repository.ts` | Corrige o stack overflow; não relacionado ao throttling |
| Diagnóstico de falha (`kind` + cabeçalhos de rate-limit) | `shared/camara-api-transport.ts`, `shared/camara-historico-client.ts` | Distingue timeout do cliente (`kind: 'timeout'`) de `503` real do servidor; loga `Retry-After`/`X-RateLimit-Remaining` quando existirem |
| Timeout configurável, default 50s | `shared/camara-api-transport.ts` | Evita lacunas por abortar respostas lentas-porém-válidas |
| Linha de debug do write em lote | `deputado-historico.step.ts` | Loga `gravando N eventos no banco em lotes` antes do upsert |

Revertidos em 2026-06-01 (não ajudaram, e a estratégia de checkpoint os torna
desnecessários — ver doc relacionado):

- **Circuit breaker / throttle gate** (`shared/throttle-gate.ts` e fiação no
  client/step/`ingestion-steps.ts`). O cooldown de 60s não era suficiente para o
  balde recarregar — ao retomar, as requisições voltavam a falhar quase
  imediatamente. O modelo de checkpoint prevê **parar e retomar em outra janela**
  em vez de pausar dentro do processo.
- **Reciclagem de conexão (undici `Agent`)** e a dependência `undici`. Sem
  efeito (ver hipótese 3).

Parâmetros relevantes e onde ficam:

- `API_CONCURRENCY` (atual: 3) — `deputado-historico.step.ts`.
- `DEFAULT_TIMEOUT_MS` (50s) — `camara-api-transport.ts`.

## Infraestrutura de retomada já existente

Já existe um caminho de "reprocessar falhas":

- Ao concluir uma execução, cada deputado que esgota os retries vira
  `ExternalGap` e é gravado em `data/logs/gaps/gaps-<timestamp>.log`
  (`gap-log.ts`), um JSON por linha com `reference: '<externalIdDeputado>'`.
- `pnpm ingest --retry-gaps <arquivo>` lê o log (`gap-log-reader.ts`), extrai os
  IDs e reexecuta **somente** o passo `deputado_historico` para **apenas** esses
  deputados (`createDeputadoSource(db, retryExternalIds)`).
- O upsert é idempotente, então reprocessar é seguro.

Limitações para um checkpoint de verdade:

1. **O passo persiste só no fim.** O passo busca todos os deputados para a
   memória, resolve as linhas e faz **um único** `upsert` ao final
   (`deputado-historico.step.ts`). Um `Ctrl-C` no meio **não grava nada** — nem
   os que já foram buscados com sucesso. O gap log também só é escrito quando a
   execução conclui.
2. **Reexecução normal reprocessa do início.** Sem `--retry-gaps`,
   `loadIngested()` devolve os 2320 e o passo rebusca os já feitos, gastando
   orçamento de API à toa.

## Estratégias de mitigação consideradas

| Estratégia | Estado |
|-----------|--------|
| Checkpoint robusto: persistência incremental (gravar por deputado/lote durante a busca) + modo `--resume` que pula deputados que já têm linhas em `deputado_historico` | **Proposto, não implementado** — torna o cancelamento seguro e evita rebuscar trabalho feito |
| Burst-and-sleep: cooldown longo (ex.: 5 min) para o balde recarregar, depois nova rajada | **Não testado** — é o experimento decisivo pendente |
| Taxa sustentada baixa: concorrência 1 + pacing explícito (ex.: ~1 req/s) para nunca disparar o limite | **Não testado de forma conclusiva** (concorrência 3 ainda bateu no limite) |
| Tornar timeout/cooldown/concorrência configuráveis por CLI | **Proposto, não implementado** — permite experimentar sem recompilar |

## Próximo passo decisivo

Caracterizar a recarga do balde com um experimento único: quando o limite
disparar, **pausar 5 minutos** (em vez de 60s) e observar se vem uma nova rajada
de requisições rápidas (~400ms).

- Vem rajada → balde que recarrega em minutos → estratégia ótima é cooldown
  longo (burst-and-sleep), conclui em poucos ciclos.
- Continua lento após 5 min → janela longa (horária) → necessário checkpoint com
  persistência incremental e execução espaçada em sessões.

Em qualquer cenário, o checkpoint robusto (persistência incremental + `--resume`)
desacopla a conclusão da sobrevivência a uma única execução longa: pega-se o
orçamento de ~1000 requisições por janela, persiste, para, e retoma na próxima.

## Referências de código

- `apps/api/src/ingestion/pipeline-runner/steps/deputado-historico/deputado-historico.step.ts`
- `apps/api/src/ingestion/pipeline-runner/steps/deputado-historico/deputado-historico.repository.ts`
- `apps/api/src/ingestion/pipeline-runner/shared/camara-api-transport.ts`
- `apps/api/src/ingestion/pipeline-runner/shared/camara-historico-client.ts`
- `apps/api/src/ingestion/pipeline-runner/shared/throttle-gate.ts`
- `apps/api/src/ingestion/pipeline-runner/logs/gap-log.ts`
- `apps/api/src/ingestion/pipeline-runner/logs/gap-log-reader.ts`
- `apps/api/src/ingestion/pipeline-runner/composition/ingestion-steps.ts`
