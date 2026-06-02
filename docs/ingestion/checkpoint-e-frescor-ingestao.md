# Checkpoint e frescor na ingestão via API

> Status: **checkpoint implementado sem o timestamp; frescor segue proposta.**
> O checkpoint subiu como pending derivado do banco (anti-join por existência de
> linhas) + persistência incremental por chunk, sem o timestamp
> `sincronizado_em` e sem frescor — ver
> [ADR-011](../adr/011-checkpoint-ingestao-pending-derivado.md). Este documento
> permanece como a proposta do timestamp de sincronização, que continua sendo a
> evolução natural quando o frescor virar requisito.
> Relacionado: [throttling-deputado-historico.md](./throttling-deputado-historico.md).

## Objetivo

Definir um mecanismo genérico para passos de ingestão que consomem a API da
Câmara um item por vez (hoje `deputado_historico` via
`GET /deputados/{id}/historico`, atualmente o único consumidor API-driven —
o passo de `proposicoes` deixou de usar a API, ver ADR 0012), de modo
que a ingestão consiga:

1. **Retomar (checkpoint)** — sobreviver a cancelamento e ao throttling sem
   regastar orçamento de API em trabalho já feito.
2. **Manter frescor** — reprocessar periodicamente itens cuja informação na fonte
   pode ter mudado.

## Problema

A ideia ingênua de "pular o que já tem dado gravado" resolve só o checkpoint e
**quebra o frescor**: a existência de linhas vira uma trava de mão única — uma
vez gravado, o item nunca mais é reconsultado. São duas preocupações distintas:

- Checkpoint é sobre **trabalho já feito nesta janela/execução**.
- Frescor é sobre **dado que envelhece** (um deputado troca de partido, muda de
  situação, sai de exercício — o histórico ganha eventos novos com o tempo).

## Primitiva central: timestamp de sincronização por item

Registrar, por item, **quando ele foi sincronizado pela última vez com sucesso**
— isto é, buscado na API **e persistido**, mesmo que nenhum evento novo tenha
voltado (porque "consultado em T, nada mudou" é diferente de "nunca
consultado"). As linhas de evento, por si, não expressam isso.

Com esse único timestamp + ordenação, uma só consulta dirige tudo:

```sql
-- itens que precisam de trabalho, mais desatualizados primeiro
WHERE sincronizado_em IS NULL
   OR sincronizado_em < now() - :ttl
ORDER BY sincronizado_em ASC NULLS FIRST
```

O que isso entrega de uma vez:

- **Retomar** — itens já sincronizados nesta execução têm timestamp recente e são
  naturalmente pulados ao reexecutar.
- **Checkpoint sob throttling** — cada sessão limitada pelo orçamento avança os
  ~N mais desatualizados; em poucas sessões tudo converge.
- **Justiça (fairness)** — `NULLS FIRST` processa os nunca-vistos primeiro,
  depois os mais antigos; ninguém passa fome.
- **Frescor** — o TTL recoloca itens velhos na fila no ritmo desejado.

O laço de checkpoint e o de atualização viram **o mesmo laço**. Uma marca global
de "última sincronização completa" não serve: não representa progresso parcial
nem desatualização por item.

## Pré-requisito: persistência incremental

Hoje o passo `deputado_historico` busca **todos** os deputados para a memória e
faz **um único** `upsert` no fim (`deputado-historico.step.ts`). Para que o
timestamp tenha significado — e para que um `Ctrl-C` no meio não perca tudo — a
gravação precisa virar **incremental**: persistir e carimbar o timestamp por
deputado (ou por lote pequeno, ex.: 25) durante a busca, reaproveitando o upsert
em lotes já existente (`UPSERT_CHUNK_SIZE` em `deputado-historico.repository.ts`).

Esse refactor é o mesmo que o checkpoint exigia; não é trabalho extra.

Cuidado de atomicidade: gravar os eventos do deputado **e** atualizar o
`sincronizado_em` devem ocorrer na mesma transação, para nunca marcar como
sincronizado um deputado cujos eventos não foram gravados.

## Onde armazenar o timestamp

### Opção A — coluna na tabela `deputado` (recomendada para começar)

Adicionar `historico_atualizado_em timestamptz` (nome final conforme ADR-007) em
`deputado`. Uma linha por deputado, indexável, consulta trivial. Requer migração.

- Prós: simples, direto, sem nova entidade.
- Contras: específico de um passo; cada novo passo API-driven precisaria de sua
  própria coluna.

### Opção B — tabela genérica de estado de sincronização

Uma tabela tipo `ingestao_sincronizacao` com `(entidade, external_id,
sincronizado_em, status, erro?)`, servindo qualquer passo que consome a API.

- Prós: escala para múltiplas fontes API, caso surja um segundo passo
  API-driven, centralizando o estado de ingestão.
- Contras: mais maquinário do que o necessário hoje, com um só consumidor.

Recomendação: **A agora**, migrar para **B** quando aparecer o segundo consumidor
API-driven. A primitiva (timestamp por item + ordenação) é a mesma nos dois.

## Política de frescor

O histórico é em boa parte **imutável** para legislaturas passadas — um
ex-deputado de 2015 não ganha eventos novos. Só **mandatos ativos** mudam de
forma relevante. Logo:

- **Início simples**: TTL único para todos (ex.: 7 dias). Fácil, gasta um pouco
  de orçamento reconsultando dado congelado.
- **Refinamento**: TTL curto para deputados da legislatura atual / "em
  exercício"; TTL efetivamente infinito para os congelados. O timestamp suporta
  isso sem mudança de modelo.

Decidir o TTL e o escopo (plano vs ativo/congelado) é ajuste de política, não de
arquitetura.

## Alternativas consideradas

- **Requisições condicionais (ETag / `If-Modified-Since` → 304).** Ideal em
  tese: checar frescor sem baixar. Mas o endpoint da Câmara provavelmente não
  suporta, e mesmo um `304` consome uma requisição contra o orçamento de
  throttling. Vale checar os cabeçalhos da resposta, mas não contar com isso.
- **Marca global de última sincronização.** Descartada: não representa progresso
  parcial nem desatualização por item.

## Esboço de implementação

1. **Migração**: adicionar `historico_atualizado_em` a `deputado` (Opção A).
2. **Fonte com filtro de frescor**: variante de `createDeputadoSource` que
   seleciona `sincronizado_em IS NULL OR < now() - ttl`, ordenado
   `ASC NULLS FIRST`, respeitando `--limit`.
3. **Persistência incremental**: mover o `upsert` para dentro do laço de busca
   (por deputado ou lote pequeno), gravando eventos + timestamp na mesma
   transação.
4. **Flags de CLI**: `--resume`/`--ttl` (e, alinhado com o doc de throttling,
   `--api-timeout`/`--api-cooldown`/`--api-concurrency` para experimentar).
5. **Testes** (TDD, por comportamento): item nunca sincronizado é selecionado;
   item fresco é pulado; item além do TTL é reselecionado; cancelamento no meio
   preserva o que já foi gravado e carimbado; timestamp só é gravado junto com os
   eventos (atomicidade).

## Relação com o throttling

Checkpoint + frescor **não derrotam** o limite por IP (ver doc relacionado), mas
o tornam irrelevante para a conclusão: pega-se o orçamento de ~1000 requisições
por janela, persiste, para, e retoma na próxima — processando sempre os mais
desatualizados primeiro. A mesma máquina serve para a carga inicial (tudo
`NULL`) e para a atualização recorrente (itens além do TTL).

## Decisões em aberto

1. **Armazenamento**: coluna em `deputado` (A) ou tabela genérica (B).
2. **TTL**: qual valor é "fresco o suficiente" (ex.: 7 dias; 24h para ativos).
3. **Escopo de atualização**: TTL plano para todos, ou divisão ativo/congelado
   desde o início.

## Referências de código

- `apps/api/src/shared/database/schema/deputado.ts`
- `apps/api/src/shared/database/schema/deputado-historico.ts`
- `apps/api/src/ingestion/runner/steps/deputado-historico/deputado-historico.step.ts`
- `apps/api/src/ingestion/runner/steps/deputado-historico/deputado-historico.repository.ts`
- `apps/api/src/ingestion/runner/ingestion-steps.ts`
