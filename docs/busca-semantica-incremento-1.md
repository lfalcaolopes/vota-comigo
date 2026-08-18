# Busca semântica por embeddings — incremento 1

## Objetivo

Substituir o filtro textual da busca de proposições, hoje `LIKE %token%` com `AND` entre tokens, por ranqueamento semântico sobre embeddings do corpus. O alvo é recall: a busca atual alcança 39 dos 74 esperados do fixture de diagnóstico (53%).

## Evidência que sustenta a escolha

Medições feitas em 2026-08-18 sobre `fixtures/diagnostico/busca-2026-08-18T02-36-11-361Z.json` (46 consultas, 74 pares esperados) contra o banco local com 516 proposições computáveis. Recall dos esperados no top-50:

| Estratégia | Recall |
| --- | --- |
| `LIKE %token%` com `AND` (produção hoje) | 39/74 (53%) |
| FTS `portuguese` com `AND` | 39/74 — resgata **zero** dos 35 ausentes |
| FTS com `OR` + `ts_rank` | 54/74 (73%) |
| Vetorial puro (`openai/text-embedding-3-small`) | 66/74 (89%) |
| Híbrido RRF (FTS-`OR` + vetorial, k=60) | 67/74 (91%) |

Duas conclusões que **não devem ser re-litigadas** sem nova medição:

- **Não trocar `AND` por `OR` no FTS.** Entrega 17 dos 35 contra 29 do vetorial, infla o conjunto de candidatos (de 6 para 148 em "aumento do salário mínimo"), e obrigaria a adicionar `relevancia` ao `feedOrdenacao` em `shared-types`, arrastando o frontend. O vetorial subsome esse ganho.
- **FTS não resolve o diagnóstico.** `votou` não é stopword do dicionário `portuguese`, e apenas 1 token entre os 35 casos tinha radical no corpus. A falha é de vocabulário, não de morfologia: os resumos de IA (98% de cobertura) já carregam o sentido em outras palavras.

O híbrido RRF ganha só 1 caso líquido sobre o vetorial puro. Ele vale como fallback de disponibilidade, não como ganho de qualidade — decidir na implementação, não antes.

## Fora de escopo

- Tabela de apelidos (`PEC Kamikaze`, `taxa das blusinhas`, `PL da Dosimetria`). São designadores arbitrários sem ponte semântica; o vetorial os deixa fora do top-50. É o próximo incremento, e é o maior bloco residual.
- Tolerância a typo por `pg_trgm` (`aborrto`). 1 caso.
- Qualquer mudança em `feedOrdenacao`, `feed-url.ts`, `feed-filtros.ts` ou componentes do frontend. Relevância vira a ordenação implícita quando há `q`; o contrato público não muda.

## Pré-requisito independente

`parseCitation` em `rules/proposicoes-search.ts` não reconhece `PEC3/2021`: `tokenizeQuery` corta em `[\s/]+`, então `pec3` não casa `^[a-z]+$` nem `^\d+$` e o plano cai para tokens. Separar corridas alfabéticas e numéricas resolve. É função pura, sem SQL e sem migration, e o caminho de citação continua tendo precedência sobre o vetorial em qualquer cenário — o vetorial coloca essa proposição em #369.

## Infra

`vector` 0.8.0 está disponível no Neon e o papel `neondb_owner` consegue `create extension` — validado em transação revertida, junto com índice HNSW em 1536 dimensões. A migration cria a extensão normalmente.

O Postgres local não tem a extensão. Trocar em `docker-compose.yml`:

```yaml
image: pgvector/pgvector:0.8.0-pg16   # era postgres:16-alpine
```

**Depois de subir na imagem nova, rodar `REINDEX DATABASE vota_comigo` uma vez.** O volume foi inicializado sob musl, que ordena por byte ignorando o rótulo `en_US.utf8`; glibc implementa colação de dicionário. Os 9 índices btree sobre colunas de texto ficariam gravados numa ordem e percorridos com outro comparador, e uma busca por igualdade passaria a não achar linha que existe — silenciosamente, porque `datcollversion` é nulo e o Postgres não emite o aviso de mismatch. O heap não é afetado: **não é preciso reingerir**. São 16 MB de índices no total.

A troca não toca produção (Cloud Run + Neon, `DATABASE_URL` vem do Secret Manager) nem o CI (`docker-compose.yml` não casa com nenhum filtro de `paths-filter`, e os testes não usam banco).

## Indexação

**Texto embedado**: `ementa` + `keywords` + `resumo_card` + `resumo_detalhe`, concatenados, em **texto natural — com acento e sem `translate`**. O `semAcento()` de `proposicoes-search.condition.ts` existe para o `LIKE` casar os dois lados e degrada o embedding; não reusar.

**Tabela** `proposicao_embedding`, espelhando `proposicao_resumo_ia`: `proposicao_id` uuid FK com `unique`, `source_hash`, `embedding vector(1536)`, `model`, `dim`, `generated_at`. Sem `review_status` — embedding é determinístico e não tem o que revisar.

**Invalidação** por `source_hash` próprio, em `proposicoes/rules/proposicao-embedding-source.ts`, sobre exatamente o texto embedado mais o id do modelo. **Não reusar `calculateProposicaoResumoIaSourceHash`**: aquele hash não inclui o resumo de IA, e o texto embedado inclui — um resumo revisado e reaprovado não dispararia reembedding e o índice descolaria do corpus em silêncio. Incluir o modelo no hash faz a troca de modelo invalidar tudo sozinha.

**Passo derivado** no `pipeline-runner`, declarado em `plan/ingestion-step-descriptors.ts` como `{ name: 'proposicao_embedding', scope: 'single', source: 'derived' }`, rodando depois de `proposicao_computavel` e depois do import dos resumos — a dependência é real, o texto inclui o resumo aprovado. O passo embeda só as linhas cujo hash mudou; em regime permanente são dezenas, não 516.

**Cliente**: OpenRouter tem endpoint `/embeddings` e a `OPENROUTER_API_KEY` que já existe funciona nele. Não há provider novo. Espelhar `generation/openrouter-resumo-ia-client.ts`, que já traz retry, backoff e classificação de erro. Modelo `openai/text-embedding-3-small`, 1536 dimensões; embedar o corpus inteiro custou US$ 0,005.

**Não commitar o artefato.** Diverge de propósito do padrão de `data/generated/proposicao-resumos/`: 516 vetores são 3,2 MB binários, ilegíveis em diff, e sem revisão humana envolvida. Vive só no banco; reconstruir custa meio centavo.

## Consulta

Roteamento por precedência, do mais exato ao mais difuso:

1. `parseCitation` → lookup exato. Continua primeiro.
2. (incremento seguinte) alias/apelido.
3. Vetorial → embeda a consulta, ordena por distância cosseno (`<=>`), aplica os filtros de tema e computável e pagina.

`toSearchPlan` continua puro e síncrono, ganhando um terceiro `kind`. Quem preenche o vetor é `proposicoes.service.ts`, que já é `async` — isso mantém `rules/` livre de rede, como o CLAUDE.md exige.

Similaridade calculada no Postgres, não em memória: o feed já filtra por `tema`, faz `count(*) over ()` e pagina com `limit`/`offset` em SQL, e rankear fora obrigaria a devolver a lista ordenada de ids para dentro da query. Em 516 documentos a varredura exata é sub-milissegundo e dispensa índice; HNSW fica disponível para quando o corpus crescer.

Dois itens que fazem parte do escopo, não são otimização posterior:

- **Cache de consulta → vetor**, chaveado pela string normalizada. Cada busca passa a fazer uma chamada HTTP de 50-200ms; consultas repetem muito.
- **Fallback para o `LIKE` atual** em erro ou timeout do provider. Sem isso a busca inteira cai junto com o OpenRouter; com isso ela degrada para o comportamento de hoje.

**Não existe limiar de similaridade utilizável.** Medido: `sim >= 0,35` deixa passar 16 documentos na mediana mas 390 no pior caso, e corta o esperado em 13 das 46 consultas. O corte é por top-N, que é o que a paginação do feed já faz.

## Ordem de execução

1. Corrigir `parseCitation` para siglas coladas ao número (independente do resto).
2. Trocar a imagem no `docker-compose.yml` e rodar `REINDEX DATABASE`.
3. Migration: `create extension vector` + tabela `proposicao_embedding`.
4. Módulo puro `proposicao-embedding-source.ts` (texto + hash) com testes.
5. Cliente de embeddings + passo derivado de ingestão.
6. Terceiro `kind` no plano de busca, condição SQL por distância, e o service resolvendo o vetor com cache e fallback.
7. Rodar de novo o diagnóstico (`apps/api/scripts/diagnostico-busca.ts`) e comparar com a tabela de evidência acima.

## Decisão registrada

O porquê da escolha, com as alternativas rejeitadas e a medição que as sustenta, está na [ADR-0024](adr/024-busca-proposicoes-semantica-por-embeddings.md). Este documento cobre só a execução.
