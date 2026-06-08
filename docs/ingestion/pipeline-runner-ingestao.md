# Runner de Ingestão — Contrato Operacional

Contrato operacional do pipeline-runner de ingestão dos dados da Câmara dos Deputados. Descreve como executar, depurar e interpretar a pipeline sem reabrir as decisões de domínio. As decisões de domínio em si ficam nas ADRs referenciadas ao longo do texto.

## O que o pipeline-runner é

O pipeline-runner é o orquestrador da pipeline de ingestão: lê os CSVs já baixados localmente (saída do downloader, ver [camara-csv-downloader.md](./camara-csv-downloader.md)), transforma os dados conforme as regras documentadas, complementa lacunas específicas via API da Câmara quando permitido, e popula o banco.

A API dentro do pipeline-runner é exceção controlada, não uma segunda fonte geral de enriquecimento. No desenho atual ela entra **apenas** no passo `deputado_historico`, via `GET /deputados/{id}/historico` — o único dado necessário que não existe em CSV. As proposições vêm **exclusivamente** dos CSVs locais; quando faltam arquivos `proposicoes-{ano}.csv` ou `proposicoesTemas-{ano}.csv`, o pipeline-runner os baixa automaticamente pelo downloader, sem fallback de API ([ADR-0012](../adr/012-ingestao-proposicoes-sem-api-sem-principal.md)).

### O que o pipeline-runner não faz

Limites explícitos, para não inferir completude que a fonte não dá:

- Não ingere orientações de bancada (`votacoesOrientacoes`) nem resolve orientação efetiva por deputado.
- Não usa `votacoesObjetos` como fonte de derivação nem como fallback de vínculo.
- Não chama `GET /votacoes/{id}`; os textos de votação vêm dos campos locais de `votacoes-{ano}.csv`.
- Não ingere a proposição principal de uma votação, apenas as proposições afetadas em `votacoesProposicoes` ([ADR-0012](../adr/012-ingestao-proposicoes-sem-api-sem-principal.md)).
- Não cria registro sintético quando uma proposição necessária não está em nenhum CSV: registra a lacuna e segue (ver [Lacunas de fonte](#lacunas-de-fonte)).
- Não persiste o score final da fórmula de relevância; persiste apenas inputs ([ADR-0004](../adr/004-storage-inputs-nao-scores.md)).
- Não integra TSE, candidatura atual, número de urna nem apelido popular.

---

## Como executar

Pré-requisitos: dependências instaladas (`pnpm install`), Postgres acessível via `DATABASE_URL`, schema aplicado (`pnpm db:migrate`) e os CSVs já baixados em `apps/api/data/raw/` (ver [camara-csv-downloader.md](./camara-csv-downloader.md); os arquivos derivados `proposicoes-{ano}.csv` e `proposicoesTemas-{ano}.csv` ausentes são baixados automaticamente pelos passos derivados).

Todos os comandos assumem a raiz do repositório. `pnpm ingest` é atalho para `pnpm --filter api ingest`. Os argumentos após `--` vão direto para o pipeline-runner.

### No banco principal do app

O `docker-compose.yml` sobe um Postgres com o banco `vota_comigo`, que é o banco de desenvolvimento do app. A `DATABASE_URL` vem de `apps/api/.env` (ver `apps/api/.env.example`).

```bash
# 1. Suba o Postgres principal (banco vota_comigo)
pnpm db:up

# 2. Aplique o schema (drizzle-kit lê DATABASE_URL de apps/api/.env)
pnpm db:migrate

# 3. Ingestão completa da janela: todos os passos CSV + sanity, exceto o manual
pnpm ingest -- --from=2020 --to=2025

# 4. Histórico parlamentar (passo manual, via API da Câmara), quando convém
pnpm ingest -- --only=deputado_historico
```

### Em um banco temporário só para o teste de ingestão

Para validar uma janela, uma mudança de schema ou uma alteração de parsing sem tocar o banco principal do app, crie um banco descartável **dentro do mesmo container** Postgres, rode a ingestão apontando para ele e jogue-o fora ao terminar. Diferente de `--dry-run`, este caminho de fato grava — então você pode inspecionar as linhas persistidas — mas em um banco isolado.

```bash
# 1. Garanta o Postgres rodando
pnpm db:up

# 2. Crie um banco descartável no mesmo container
docker compose exec postgres createdb -U vota_comigo vota_comigo_ingest_test

# 3. Aplique o schema nesse banco.
#    O override inline vence o .env: dotenv não sobrescreve variável já definida.
DATABASE_URL=postgresql://vota_comigo:vota_comigo@localhost:5432/vota_comigo_ingest_test \
  pnpm db:migrate

# 4. Rode a ingestão apontando para o banco de teste (ex.: um único ano)
DATABASE_URL=postgresql://vota_comigo:vota_comigo@localhost:5432/vota_comigo_ingest_test \
  pnpm ingest -- --from=2024 --to=2024

# 5. Inspecione o resultado, depois descarte o banco
docker compose exec postgres dropdb -U vota_comigo vota_comigo_ingest_test
```

O prefixo `DATABASE_URL=... pnpm ...` aplica o override apenas àquele comando, sem exportar a variável para a sessão — a próxima execução de `pnpm ingest` sem prefixo volta a usar o banco principal de `apps/api/.env`.

---

## Pipeline e ordem dos passos

Os passos rodam em ordem de dependência (chaves estrangeiras entre tabelas). A ordem abaixo é a lista válida para `--only`.

| # | Passo | Escopo | Fonte | Origem em disco / API |
|---|-------|--------|-------|-----------------------|
| 1 | `legislaturas` | único | CSV | `data/raw/legislaturas/legislaturas.csv` |
| 2 | `deputados` | único | CSV | `data/raw/deputados/deputados.csv` |
| 3 | `partidos` | anual | CSV | `data/raw/votacoesVotos/votacoesVotos-{ano}.csv` |
| 4 | `votacoes` | anual | CSV | `data/raw/votacoes/votacoes-{ano}.csv` (+ companheiro `votacoesVotos-{ano}.csv`) |
| 5 | `votacao_votos` | anual | CSV | `data/raw/votacoesVotos/votacoesVotos-{ano}.csv` |
| 6 | `proposicoes` | único | derivado | `data/raw/proposicoes/proposicoes-{ano}.csv` (anos derivados, baixados sob demanda) |
| 7 | `votacao_proposicao` | único | derivado | `data/raw/votacoesProposicoes/votacoesProposicoes-{ano}.csv` |
| 8 | `tema` | único | derivado | `data/raw/proposicoesTemas/proposicoesTemas-{ano}.csv` (baixado sob demanda) |
| 9 | `deputado_historico` | único | API | `GET /deputados/{id}/historico` (passo **manual**) |
| 10 | `sanity` | único | banco | lê placares já gravados para conferência |

- **Escopo único** (`single`): processa um arquivo independentemente da janela `--from`/`--to` (ex.: legislaturas, deputados).
- **Escopo anual** (`annual`): processa um arquivo por ano da janela.
- **Fonte derivada**: o passo varre múltiplos anos por conta própria, deriva o conjunto de arquivos necessários e baixa os ausentes.
- **Passo manual**: fica **fora da execução padrão**; só roda quando nomeado em `--only` (ver [`--only`](#--onlypasso1passo2) e [Passos manuais](#passos-manuais)).

Sem `--only`, `pnpm ingest` executa os passos 1–8 e o 10 (`sanity`), pulando o passo 9 (`deputado_historico`).

---

## Flags

Cada flag adiciona superfície de teste e documentação; só entram as que têm caso de uso real. Opções consideradas e adiadas estão em [Possibilidades futuras](#possibilidades-futuras).

### `--only={passo1,passo2,...}`

Executa apenas os passos nomeados (separados por vírgula). Um passo desconhecido **aborta** a execução listando os passos válidos.

```bash
pnpm ingest -- --only=votacoes
pnpm ingest -- --only=votacoes,proposicoes
```

#### Passos manuais

`deputado_historico` é um passo manual: depende da API da Câmara, é lento e sujeito a indisponibilidade e throttling (ver [throttling-deputado-historico.md](./throttling-deputado-historico.md)), então fica fora da execução padrão. Rode-o à parte:

```bash
# Ingestão padrão: CSVs + sanity, sem histórico
pnpm ingest -- --from=2020 --to=2025

# Histórico parlamentar, isolado e quando convém
pnpm ingest -- --only=deputado_historico
```

Quando nomeado explicitamente, o passo manual roda normalmente, inclusive junto de outros (ex.: `--only=deputado_historico,votacoes`).

### `--from={ano}` e `--to={ano}`

Restringe a janela temporal por ano. Aplica-se só aos passos anuais; passos de escopo único e derivados não são filtrados pela janela (os derivados a usam para descobrir os anos necessários). Anos no formato `YYYY`, dentro de `[2001, ano atual]`, com `--from <= --to`. Sem as flags, a janela default é de 2001 ao ano corrente.

```bash
pnpm ingest -- --from=2020 --to=2025
pnpm ingest -- --from=2024 --to=2024     # ano único via intervalo
```

### `--limit={n}`

Limita o volume processado por passo a `n` (inteiro positivo). Útil para uma passada rápida de validação em dados grandes sem percorrer o arquivo inteiro. O limite aparece no banner inicial.

```bash
pnpm ingest -- --only=votacoes --limit=100
```

### `--dry-run`

Executa parsing, transformação, validação e planejamento de escrita, mas **não grava no banco**. As dependências de escrita viram no-op protegido por guard, e os passos com efeito colateral de rede (download em `proposicoes`/`tema`) e o `sanity` fazem short-circuit. Útil para validar uma janela nova antes de comprometer ao banco.

```bash
pnpm ingest -- --dry-run
pnpm ingest -- --only=votacoes --dry-run
```

### `--strict`

Aborta no primeiro erro de parsing, validação ou lacuna crítica de fonte, em vez de pular a linha e continuar. Útil para depurar: o erro aparece imediatamente, sem ruído do resto do processamento.

```bash
pnpm ingest -- --only=votacoes --strict
```

### `--debug`

Adiciona detalhe verboso ao output ao vivo: lotes de escrita, retries da API de histórico, breakdown de "Outros" nas divergências de placar do `sanity`, e — em terminais interativos (TTY) — uma linha de status que se reescreve. O resumo final e os logs de progresso permanecem; `--debug` só acrescenta detalhe.

```bash
pnpm ingest -- --only=deputado_historico --debug
```

### `--refetch-historico`

Por padrão, `deputado_historico` processa apenas deputados pendentes (sem linhas em `deputado_historico`), um checkpoint derivado do banco ([ADR-0011](../adr/011-checkpoint-ingestao-pending-derivado.md)). `--refetch-historico` força a recarga total de todos os deputados ingeridos — para um rebuild deliberado, ao custo de orçamento de API.

```bash
pnpm ingest -- --only=deputado_historico --refetch-historico
```

### `--retry-gaps={arquivo}`

Reprocessa **apenas** o passo `deputado_historico` para **apenas** os deputados que falharam em uma execução anterior, lendo os IDs do arquivo de lacunas (gap log) gerado por aquela execução. O upsert é idempotente, então reprocessar é seguro. Conflita com `--only` para qualquer passo diferente de `deputado_historico`. Se o arquivo não tiver registros reprocessáveis, encerra com sucesso sem trabalho.

```bash
pnpm ingest -- --retry-gaps=data/logs/gaps/gaps-2026-06-01T12-00-00-000Z.log
```

Detalhes em [throttling-deputado-historico.md](./throttling-deputado-historico.md).

### Combinação de flags

As flags podem ser combinadas. Exemplos:

```bash
# Validar votações de uma janela sem gravar
pnpm ingest -- --only=votacoes --from=2024 --to=2025 --dry-run

# Reprocessar proposições do ano corrente em modo estrito
pnpm ingest -- --only=proposicoes --from=2025 --to=2025 --strict

# Dry-run completo da pipeline para uma janela
pnpm ingest -- --from=2020 --to=2022 --dry-run
```

---

## Comportamento durante a execução

### Tratamento de erros (default vs. `--strict`)

**Default:** erro de linha (parsing/validação) é logado e a execução continua a linha seguinte. Ao final do passo, a contagem de rejeitadas aparece no resumo e os detalhes vão para o arquivo de erros. Apropriado para a maioria das execuções, porque 25 anos de dados têm qualidade irregular e abortar a cada problema tornaria a ingestão impraticável.

**`--strict`:** o primeiro erro mata o passo atual e a execução é abortada.

### Pré-voo de `proposicoes`/`tema` e download automático

Os passos derivados dependem de arquivos `proposicoes-{ano}.csv` e `proposicoesTemas-{ano}.csv` cujos anos não coincidem necessariamente com a janela das votações. Antes de ingerir, o pipeline-runner deriva das votações nominais em escopo (respeitando `--from`/`--to`/`--limit`) o conjunto de anos necessários e verifica cada arquivo em disco. Os ausentes são logados e baixados automaticamente pelo downloader. A mesma função de "conjunto necessário" alimenta validação e ingestão, para que não divirjam. Não há fallback de API para proposições ([ADR-0012](../adr/012-ingestao-proposicoes-sem-api-sem-principal.md)).

Se o download de algum arquivo necessário falhar, a execução para informando o motivo, o que falta e como retomar (resolver a causa e reexecutar, p.ex. `--only=proposicoes`). Os passos CSV concluídos antes permanecem gravados (upsert idempotente), então a retomada não os reprocessa de forma destrutiva.

### Fonte de escopo único ausente

Quando um arquivo de um passo de escopo único não está em disco, o pipeline-runner registra uma lacuna `fonte_ausente` e **aborta** (porque os passos seguintes dependem dele). Para um passo anual, a ausência de um ano específico é pulada no modo default e aborta em `--strict`.

### Sanity checks de placar

O último passo, `sanity`, compara o placar oficial de cada votação (`votosSim`/`votosNao` de `votacoes-{ano}.csv`) com as contagens derivadas dos votos individuais agregados em `votacao_votos`. Quando `sim` ou `não` divergem, a votação vira rejeição `sanity_placar_divergente`, com ambos os valores, no resumo e no arquivo de erros. Votações sem placar oficial contam como ignoradas (não comparáveis), não como divergência. As demais categorias derivadas (abstenção, obstrução, Artigo 17, não informado) entram só como detalhe de `--debug`, porque a semântica do agrupamento "Outros" da Câmara é ambígua. Em `--dry-run` o passo é pulado (não há escrita fresca para validar); em `--strict` aborta na primeira divergência.

Um caso é tratado como **lacuna de fonte**, não divergência: quando o placar oficial tem votos mas a fonte não traz nenhuma direção individual (todos vieram em branco, agregados em `nao_informado`). É um problema conhecido do `votacoesVotos` da Câmara — o placar agregado é publicado, mas o voto por deputado fica vazio. O `sanity` registra então uma lacuna `votos_individuais_ausentes`, deixando claro que a base local está fiel à fonte (sem registro sintético) e que aquela amostra é inutilizável para o matcher.

### Logs ao vivo

Além do resumo final, o pipeline-runner emite progresso ao vivo para que execuções longas não fiquem silenciosas. Formatos (nível default):

- **Banner inicial** — modo, janela, número de passos e limite: `Iniciando ingestão (normal): anos 2020-2025, 9 passos planejados.`
- **Início de passo** — `[votacoes 2024] iniciando (votacoes-2024.csv)`
- **Resultado de passo** — assim que o passo termina: `[votacoes 2024] lidos 1200, inseridos 1200, atualizados 0, ignorados 30, rejeitados 2 (842ms)`
- **Progresso periódico** nos passos de maior volume, a cada ~5000 registros: `[votacao_votos 2024] 5000 registros processados…` e, ao fim, `[votacao_votos 2024] leitura concluída: 7321 registros`
- **Lacuna de fonte** — no instante em que ocorre: `[proposicoes] fonte ausente: <ref> (passo ignorado)`

`--debug` acrescenta o feed verboso e a linha de status em TTY.

---

## Saídas: resumo, logs e arquivos

### Resumo final (terminal)

Ao final, uma linha de resumo global em texto puro:

```
Resumo (normal): 48210 lidos, 47980 inseridos, 12 atualizados, 198 ignorados, 20 rejeitados, 3 lacunas de fonte.
```

Seguida, quando aplicável, de:

- `Execução abortada.` — quando a execução foi interrompida (lacuna crítica, `--strict`, ou download falho).
- `Detalhes de erros em <caminho>` — quando houve rejeições.
- `Detalhes de lacunas de fonte em <caminho>` — quando houve lacunas.

O resumo por passo (lidos/inseridos/atualizados/ignorados/rejeitados + tempo) aparece ao vivo na linha de resultado de cada passo.

**Exit code:** `0` em execução bem-sucedida; `1` quando abortada ou quando a resolução de flags falha (a mensagem de erro vai para stderr).

### Arquivo de erros — `data/logs/errors/errors-{timestamp}.log`

Uma rejeição por linha em **JSONL** (um `JSON.stringify` por linha). Schema de cada rejeição:

```json
{"file":"votacoes-2024.csv","line":42,"type":"validacao_id_invalido","fields":{"id":"abc"},"message":"id de votação inválido: abc"}
```

- `file` — arquivo de origem.
- `line` — número da linha no CSV.
- `type` — tipo enumerado do erro (ver abaixo).
- `fields` — campos relevantes da linha original.
- `message` — descrição detalhada.

### Arquivo de lacunas — `data/logs/gaps/gaps-{timestamp}.log`

Arquivo **separado** do de erros, também em JSONL. Schema de cada lacuna externa:

```json
{"file":"proposicoes-2023.csv","type":"fonte_ausente","reference":"data/raw/proposicoes/proposicoes-2023.csv","message":"Fonte ausente: ..."}
```

- `file` — arquivo ou passo de origem.
- `type` — tipo da lacuna (ver abaixo).
- `reference` — referência ao recurso ausente (caminho, ou `external_id` do deputado em lacunas de histórico — é essa referência que `--retry-gaps` reaproveita).
- `message` — descrição.

Ambas as pastas (`data/logs/errors/` e `data/logs/gaps/`) ficam no `.gitignore`. Os arquivos são nomeados com timestamp para não sobrescrever entre execuções, permitindo análise comparativa. O tempo por passo é medido com `performance.now()`.

### Tipos em uso

**Rejeições (arquivo de erros):** `validacao_id_invalido`, `validacao_uri_invalida`, `validacao_uri_partido_invalida`, `validacao_situacao_desconhecida`, `parse_data_invalida`, `deputado_externo_desconhecido`, `sanity_placar_divergente`.

**Lacunas (arquivo de lacunas):** `fonte_ausente` (arquivo de escopo único não encontrado em disco), `votos_individuais_ausentes` (placar oficial sem voto individual na fonte), `fonte_externa_indisponivel` (deputado cujo histórico esgotou os retries da API — reprocessável via `--retry-gaps`).

A lista evolui com novas validações; ela não é fechada por contrato, mas os tipos acima são os atualmente emitidos.

---

## Lacunas de fonte

O pipeline-runner distingue **rejeição** (linha que falhou parsing/validação) de **lacuna de fonte** (dado que a fonte simplesmente não forneceu). A pipeline é uma base metodológica auditável: quando falta fonte, a ausência aparece no relatório, não é escondida por dado sintético.

Como interpretar, sem assumir completude falsa do banco:

- Lacunas são **esperadas** em parte dos dados e ficam registradas no arquivo de lacunas; não indicam falha da ingestão.
- O banco **não recebe registro sintético** para uma proposição necessária ausente de todo CSV — a linha simplesmente não existe, e a lacuna explica o porquê.
- Uma votação `votos_individuais_ausentes` tem placar oficial, mas sua amostra individual é inutilizável para o matcher — o consumidor deve tratá-la como tal, não como votação sem votos.
- Lacunas de histórico (`fonte_externa_indisponivel`) são transitórias (API indisponível/throttling) e reprocessáveis com `--retry-gaps`, diferente das lacunas de proposição, que dependem da fonte publicar o arquivo.

Ao consultar o banco, cruze sempre os totais persistidos com o arquivo de lacunas da execução correspondente antes de afirmar cobertura.

---

## Runbook: validação end-to-end 2020-2025

Procedimento para validar a ingestão completa sobre a janela inicial de dados reais. Requer `DATABASE_URL` configurada e os CSVs de 2020-2025 já baixados em `data/raw/` (os `proposicoes-{ano}.csv` e `proposicoesTemas-{ano}.csv` faltantes são baixados automaticamente pelos passos derivados).

1. **Dry-run completo** — valida parsing, transformação e regras sem gravar:
   ```bash
   pnpm ingest -- --from=2020 --to=2025 --dry-run
   ```
   Confirme que não há rejeições inesperadas no resumo.

2. **Execução real** — popula o banco:
   ```bash
   pnpm ingest -- --from=2020 --to=2025
   ```

3. **Reexecução** da mesma janela — verifica idempotência:
   ```bash
   pnpm ingest -- --from=2020 --to=2025
   ```
   A segunda execução deve mostrar praticamente zero inserções e atualizações consistentes; a contagem de linhas no banco não deve crescer.

4. **Sanity checks** — revise o passo `sanity` no resumo e, se houver divergências (`sanity_placar_divergente`), o arquivo de erros.

5. **Lacunas** — revise o arquivo de lacunas para proposições/histórico ausentes e votações `votos_individuais_ausentes`. Lacunas são esperadas e não indicam falha (ver [Lacunas de fonte](#lacunas-de-fonte)).

> `deputado_historico` é manual e não roda na execução padrão. Rode-o à parte com `pnpm ingest -- --only=deputado_historico` para popular o histórico parlamentar via API.

---

## Possibilidades futuras

Opções consideradas e adiadas; ficam registradas para o caso de o uso revelar a demanda.

- **`--verbose` / `--quiet`** — controlar nível de log. Adiada: o default já oferece boa visibilidade, e `--debug` cobre o detalhamento.
- **`--skip={passo}`** — descartada: sobrepõe `--only`; basta listar os demais.
- **`--parallel` / `--threads`** — descartada: a ordem entre passos importa (FKs), e os volumes não justificam paralelismo dentro de um passo.
- **`--rollback` / `--undo`** — descartada: idempotência via UPSERT resolve o caso normal; para emergência, `drop + redo` é mais simples e seguro.
- **`--config={arquivo}`** — adiada: flags bastam no estágio atual.
- **`--db-url={url}`** — descartada: `DATABASE_URL` já cumpre o papel; duplicar em flag confunde precedência.

---

## Referências

- [ADR-0012 — Ingestão de proposições sem API e sem proposição principal](../adr/012-ingestao-proposicoes-sem-api-sem-principal.md)
- [ADR-0011 — Checkpoint de ingestão como pending derivado](../adr/011-checkpoint-ingestao-pending-derivado.md)
- [ADR-0010 — Persistência de votos em JSONB](../adr/010-persistencia-votos-jsonb.md)
- [ADR-0009 — Vínculo votação-proposição](../adr/009-vinculo-votacao-proposicao.md)
- [ADR-0004 — Armazenar inputs, não scores](../adr/004-storage-inputs-nao-scores.md)
- [ADR-0002 — Escopo de votações ingeridas](../adr/002-escopo-votacoes-ingeridas.md)
- [ADR-0003 — Filtro de deputados por legislatura mínima](../adr/003-filtro-deputados-legislatura-minima.md)
- [camara-csv-downloader.md](./camara-csv-downloader.md) — downloader dos CSVs da Câmara
- [fontes-ingestao.md](./fontes-ingestao.md) — origem de cada dado por passo
- [throttling-deputado-historico.md](./throttling-deputado-historico.md) — API de histórico, retomada e `--retry-gaps`
- [checkpoint-e-frescor-ingestao.md](./checkpoint-e-frescor-ingestao.md) — checkpoint e frescor
