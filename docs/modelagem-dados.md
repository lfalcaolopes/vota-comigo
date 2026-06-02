# Quem Vota Comigo — Modelagem de Dados (proposta)

## Objetivo

Documento de proposta da modelagem relacional inicial para a base do MVP. Cobre o conjunto mínimo de tabelas necessárias para sustentar as features do `docs/mvp.md` mais a única feature de `docs/melhorias.md` que entra desde já: **Categorização por comissão temática** (Tier 1).

O escopo desta modelagem é o de **dados ingeridos da Câmara e derivados deles**. Tabelas exclusivas do sistema (coleta de matcher, autenticação, telemetria, curadoria manual de apelidos populares, etc.) ficam fora — modeladas em documentos próprios quando entrarem.

O escopo de fontes é o definido em `docs/ingestion/fontes-ingestao.md`. A janela inicial é 2020–2025 (arquivos disponíveis em `apps/api/data/raw/`), com schema preparado para receber qualquer ano adicional sem alteração estrutural.

## Stack assumida

- PostgreSQL (versão atual do projeto).
- Drizzle ORM (ver `apps/api/src/shared/database/drizzle.config.ts`).
- Schemas modulares dentro de `apps/api/src/shared/database/schema/`, reexportados pelo barrel `index.ts`.
- Extensão `pgcrypto` habilitada para `gen_random_uuid()`.

## Convenções

### Identificadores: interno vs externo

- **Toda tabela tem `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`**. Esse é o identificador interno e a única chave usada em foreign keys entre tabelas.
- **Toda coluna que armazena um identificador usável em endpoints/arquivos da fonte (API ou CSV) recebe o prefixo `external_`** (ADR 0007 atualizado). Duas variações:
  - **Identificador da própria linha**: ganha `UNIQUE` (chave de rematch). Há no máximo uma por tabela. Exemplos: `external_id_deputado`, `external_id_proposicao`, `external_id_votacao`, `external_id_legislatura`, `external_id_partido`, `external_cod_tema`.
  - **Referência a entidade externa que não modelamos como tabela**: sem `UNIQUE` (pode repetir). Exemplos: `external_id_evento`, `external_id_orgao`, `external_id_proposicao_ultima_apresentacao`, `external_cod_tipo`.
- **Quando a entidade referenciada é modelada como tabela própria, a coluna vira foreign key interna `uuid` com sufixo `_id`** (`legislatura_inicial_id`, `legislatura_final_id`, `partido_id`, `deputado_id`, `proposicao_id`, `votacao_id`). O identificador externo não é persistido em duplicidade — a resolução acontece no lookup durante a ingestão.
- **Tabelas derivadas (`deputado_historico`, `votacao_votos`) e junções (`votacao_proposicao`, `proposicao_tema`) não têm `external_*` próprio** porque suas linhas não são endereçáveis individualmente na fonte.
- **Atributos auxiliares preservam o nome da fonte sem prefixo `external_`**: `uri` (alternativa do mesmo ID), `cpf` (namespace Receita Federal), e siglas categóricas (`sigla_uf`, `sigla_partido`, `sigla_orgao`).
- TS via Drizzle: snake_case no banco, camelCase no código (`externalIdDeputado`, `legislaturaInicialId`).

### Demais convenções

- **Nomes de tabela**: substantivos do domínio em português sem acento, no singular (`deputado`, `votacao`, `proposicao`). Tabelas de junção pura recebem nome composto `entidadeA_entidadeB`. Histórico recebe sufixo `_historico`.
- **Tipos**: `bigint` para IDs numéricos da API. `text` para `votacao.external_id_votacao` (formato `"2458405-38"`). `date` para datas civis, `timestamptz` para timestamps. `jsonb` para o agregado de votos (ADR 0010).
- **Score de relevância e métricas derivadas**: NÃO ficam no schema. Inputs persistidos, score calculado em runtime ou job derivado (ADR 0004).
- **Orientações de bancada**: NÃO entram no banco no MVP. Buscadas via `GET /votacoes/{id}/orientacoes` com cache (ADR 0005 e `fontes-ingestao.md`).
- **Apelido popular**: é curadoria manual do produto, fora do runner de ingestão da Câmara e fora desta modelagem inicial. A forma de persistência será decidida quando a curadoria entrar.
- **Sufixo de ano nas CSVs**: irrelevante para o schema. Ingestão anual faz `upsert` na mesma tabela, deduplicado pela coluna `external_*` com `UNIQUE`.

## Visão geral

```
legislatura ─┐
             ├── deputado ── deputado_historico
             │
partido      │
             │
proposicao ── proposicao_tema ── tema
     │
     │  votacao_proposicao  votacao_votos (1:1, jsonb)
     │ ────────────────── votacao
                            (orientações via API, fora do banco)
```

---

## Entidades canônicas

### `legislatura`

Fonte: `legislaturas.csv` (cabeçalho: `idLegislatura;uri;dataInicio;dataFim;anoEleicao`). Volume 57 — sem filtro de ingestão.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` (PK) | `uuid` | Interno. |
| `external_id_legislatura` (UNIQUE) | `smallint` | Chave de rematch com a fonte. Valores 51–57 no escopo do produto. |
| `uri` | `text` | |
| `data_inicio` | `date` | |
| `data_fim` | `date` | |
| `ano_eleicao` | `smallint` | |

---

### `partido`

Fonte derivada: extraído de `votacoesVotos-{ano}.csv` (`deputado_siglaPartido` + `deputado_uriPartido`) e de `deputado_historico` durante a ingestão. Não há CSV próprio na lista de fontes.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` (PK) | `uuid` | Interno. |
| `external_id_partido` (UNIQUE) | `bigint` | Chave de rematch com a fonte. Extraído do final de `uriPartido` (`.../partidos/{id}`). |
| `sigla` | `text` | Sigla na última observação. |
| `uri` | `text` | |

Decisão deliberada: não modelar federação nem bloco como entidades persistentes. Federação fica hardcoded em código (3 federações estáveis da legislatura 57, ADR 0005); bloco aparece bruto na orientação consultada via API, sem composição modelada.

---

### `deputado`

Fonte: `deputados.csv` (cabeçalho: `uri;nome;idLegislaturaInicial;idLegislaturaFinal;nomeCivil;cpf;siglaSexo;urlRedeSocial;urlWebsite;dataNascimento;dataFalecimento;ufNascimento;municipioNascimento`).

**Filtro de ingestão**: apenas registros com `idLegislaturaFinal >= 51` (ADR 0003).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` (PK) | `uuid` | Interno. |
| `external_id_deputado` (UNIQUE) | `bigint` | Chave de rematch com a fonte. Derivado do final de `uri`. |
| `uri` | `text` | |
| `nome` | `text` | Nome parlamentar. |
| `nome_civil` | `text` | |
| `sigla_sexo` | `char(1)` | |
| `data_nascimento` | `date` | |
| `data_falecimento` | `date` | Nula para vivos. |
| `uf_nascimento` | `char(2)` | |
| `municipio_nascimento` | `text` | |
| `url_rede_social` | `text` | String CSV separada por vírgula, mantida como veio. |
| `url_website` | `text` | |
| `legislatura_inicial_id` (FK → `legislatura.id`) | `uuid` | Resolvido de `idLegislaturaInicial` durante a ingestão. |
| `legislatura_final_id` (FK → `legislatura.id`) | `uuid` | Resolvido de `idLegislaturaFinal` durante a ingestão. |

**Não está no CSV**: foto e partido atual. Estratégia da foto: inferir pela URL canônica `https://www.camara.leg.br/internet/deputado/bandep/{external_id_deputado}.jpg`, sem persistir, sem fetch. Só migrar para `GET /deputados/{id}` no job de carga se observarmos falhas reais (404, URLs novas) — mesmo padrão de fallback adotado em `deputado_historico`. Partido atual sai da última transição em `deputado_historico`.

**Índices**: `(nome)` — se `pg_trgm` for habilitado, `gin (nome gin_trgm_ops)`; caso contrário, b-tree em `lower(nome)`.

---

### `deputado_historico`

**Sem CSV correspondente.** Populado durante o job de carga via API `GET /deputados/{id}/historico`, executado para cada deputado ingerido. Suporta a regra "em exercício na data da votação" (ADR 0008), o histórico de partidos no perfil (MVP-3) e a resolução de partido atual.

**Sobre o formato da fonte (confirmado por chamadas exploratórias à API em 2026-05)**: a resposta é um array `dados[]` onde cada item é um **evento pontual** identificado por `dataHora` (formato `"YYYY-MM-DDTHH:MM"`, sem segundos), trazendo um snapshot completo do estado do deputado naquele instante. **Não há `dataInicio` nem `dataFim`** — a derivação de intervalos é responsabilidade do consumidor (lag/lead em window function quando necessário). Eventos com `situacao = null` e `condicaoEleitoral = null` existem como marcos administrativos ("Nome no início da legislatura"), emitidos no primeiro segundo de cada legislatura — não representam transição real.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` (PK) | `uuid` | Interno. |
| `deputado_id` (FK → `deputado.id`) | `uuid` | |
| `legislatura_id` (FK → `legislatura.id`) | `uuid` | Resolvido de `idLegislatura` do evento. |
| `partido_id` (FK → `partido.id`) | `uuid` | Resolvido de `siglaPartido` + `uriPartido` do evento. |
| `data_hora` | `timestamptz` | Instante do evento (campo `dataHora` da API). |
| `situacao` | `text` | Pode ser nulo. Valores observados: `Exercício`, `Fim de Mandato`. Documentação oficial inclui também `Licença`, `Suplência`, `Convocado`, `Vacância`. Acentos preservados. |
| `condicao_eleitoral` | `text` | Pode ser nulo. Valores observados: `Titular`. Documentação inclui também `Suplente`. |
| `descricao_status` | `text` | Texto livre da API. Exemplos reais: `"Entrada - Posse de Eleito Titular - Posse na Sessão Preparatória"`, `"Alteração de partido"`, `"Saída - Afastamento definitivo - Término da Legislatura"`, `"Nome no início da legislatura / Partido no início da legislatura"`. |
| `nome` | `text` | Snapshot do nome parlamentar no momento. |
| `nome_eleitoral` | `text` | Snapshot do nome eleitoral (forma usada na cédula, geralmente em caixa alta). |
| `sigla_uf` | `char(2)` | Snapshot da UF representada. |
| `email` | `text` | Snapshot do e-mail no momento. Pode ser nulo. |
| `url_foto` | `text` | Snapshot da URL de foto no momento. Útil para detectar a mudança que motivaria adotar persistência da foto em `deputado` (ver "Pontos a confirmar"). |

**Campos descartados da resposta**: `id`, `uri`, `uriPartido` (redundantes — já resolvidos via FK ou via `deputado_id`).

**Unicidade**: `(deputado_id, data_hora, descricao_status)`. Idempotente em reingestão. Não usamos só `(deputado_id, data_hora)` porque a API não garante distinção entre dois eventos no mesmo instante.

**Índices**: `(deputado_id, data_hora DESC)` para "último estado conhecido", base da derivação de intervalos de exercício.

A regra de consumo não deve ser apenas `situacao = 'Exercício'` no último evento. A análise em `docs/prototipo.md` encontrou eventos como `situacao = 'Convocado'` com `descricaoStatus` de entrada/reassunção. Para o matcher, o consumidor deriva intervalos: abre em `situacao = 'Exercício'` ou `descricao_status` com prefixo `Entrada`; fecha em `situacao IN ('Suplência', 'Licença', 'Fim de Mandato', 'Vacância')` ou `descricao_status` com prefixo `Saída`; eventos administrativos com `situacao = null` não abrem nem fecham intervalo.

---

### `proposicao`

Fonte: `proposicoes-{ano}.csv` (cabeçalho verificado: `id;uri;siglaTipo;numero;ano;codTipo;descricaoTipo;ementa;ementaDetalhada;keywords;dataApresentacao;uriOrgaoNumerador;uriPropAnterior;uriPropPrincipal;uriPropPosterior;urlInteiroTeor;urnFinal;ultimoStatus_*`).

**Filtro de ingestão** (`fontes-ingestao.md`): proposições afetadas por uma votação nominal ingerida (chave: aparece em `votacoesProposicoes` para um `idVotacao` que também aparece em `votacoesVotos`). O ingestor cobre múltiplos anos porque uma votação nominal de 2025 pode referenciar proposição apresentada em 2015. Sem filtro por `codTipo`.

**Fonte única (CSV) e cobertura multi-ano**: a linha completa vem de `proposicoes-{ano}.csv`. Não há fallback de API (ADR 0012). Antes do passo, o runner deriva das votações nominais em escopo os anos de proposição necessários e baixa automaticamente os `proposicoes-{ano}.csv` ausentes. Se uma proposição necessária não estiver em nenhum CSV (ausente do arquivo do ano ou inexistente na fonte), não criar registro parcial sintético; registrar lacuna de ingestão (segue no default, aborta em `--strict`).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` (PK) | `uuid` | Interno. |
| `external_id_proposicao` (UNIQUE) | `bigint` | Chave de rematch com a fonte. |
| `uri` | `text` | |
| `sigla_tipo` | `text` | Ex.: `PL`, `PEC`, `MPV`, `REP`, `PRC`. |
| `numero` | `integer` | |
| `ano` | `smallint` | |
| `external_cod_tipo` | `integer` | Referência ao tipo de proposição (`/referencias/proposicoes/codTipo`). Input do fator "tipo de proposição" na fórmula de relevância. |
| `descricao_tipo` | `text` | Ex.: `Projeto de Lei`. |
| `ementa` | `text` | |
| `ementa_detalhada` | `text` | Frequentemente vazia. |
| `keywords` | `text` | Mantido como veio (separado por `_`). |
| `data_apresentacao` | `timestamptz` | |
| `url_inteiro_teor` | `text` | |
| `ultimo_status_data_hora` | `timestamptz` | |
| `ultimo_status_regime` | `text` | Ex.: `Urgência (Art. 155, RICD)`, `Ordinário (Art. 151, III, RICD)`. Contexto local para detalhe da proposição e possível sinal endógeno da fórmula de relevância. |
| `ultimo_status_descricao_situacao` | `text` | Útil para "tornou-se norma jurídica" etc. |
| `ultimo_status_descricao_tramitacao` | `text` | |
| `ultimo_status_url` | `text` | |

Campos descartados na carga inicial por não ter consumidor mapeado no MVP: `uriOrgaoNumerador`, `uriPropAnterior`, `uriPropPosterior`, `urnFinal`, `ultimoStatus_sequencia`, `ultimoStatus_uriRelator`, `ultimoStatus_idOrgao`, `ultimoStatus_siglaOrgao`, `ultimoStatus_uriOrgao`, `ultimoStatus_idTipoTramitacao`, `ultimoStatus_idSituacao`, `ultimoStatus_despacho`, `ultimoStatus_apreciacao`. Trivial trazer depois se aparecer demanda.

**Proposição principal fora do MVP**: a coluna `proposicao_principal_id` e a resolução da cadeia de principais (`uriPropPrincipal`) foram retiradas da modelagem do MVP (ADR 0012). Os dados mostram que ~92% das proposições afetadas não têm principal e que ~89% dos vínculos existentes apontam para proposições já ingeridas como afetadas; o ganho não justificava a complexidade de download e resolução. A ingestão de `proposicao` é de passo único.

**Índices**: `(ano)`, `(external_cod_tipo)`. Considerar `gin (to_tsvector('portuguese', coalesce(ementa,'') || ' ' || coalesce(keywords,'')))` para busca textual no matcher.

---

### `tema`

Fonte derivada: extraído da projeção de `proposicoesTemas-{ano}.csv` (`codTema;tema`).

| Coluna | Tipo | Notas |
|---|---|---|
| `id` (PK) | `uuid` | Interno. |
| `external_cod_tema` (UNIQUE) | `integer` | Chave de rematch com a fonte. |
| `nome` | `text` | Ex.: `Administração Pública`. |

Volume baixíssimo (dezenas).

---

### `proposicao_tema`

Fonte: `proposicoesTemas-{ano}.csv` (cabeçalho: `uriProposicao;siglaTipo;numero;ano;codTema;tema;relevancia`).

**Filtro de ingestão**: apenas registros cuja proposição esteja em `proposicao`.

**Campo `relevancia` descartado**: verificação em todos os arquivos disponíveis (2020 a 2025) confirma valor `0` em 100% dos registros. Coluna não modelada; se algum ano futuro trouxer outros valores, reabrir.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` (PK) | `uuid` | Interno. |
| `proposicao_id` (FK → `proposicao.id`) | `uuid` | |
| `tema_id` (FK → `tema.id`) | `uuid` | |

**Unicidade**: `(proposicao_id, tema_id)` — uma proposição não tem o mesmo tema duas vezes.

**Índices**: `(tema_id)` para filtros "todas as proposições do tema X" no feed e no matcher (MVP-2, melhoria Tier 1 de categorização).

---

### `votacao`

Fonte: `votacoes-{ano}.csv` (cabeçalho verificado igual em todos os anos 2020–2025).

**Filtro de ingestão** (ADR 0002): apenas votações cuja `id` aparece em `votacoesVotos-{ano}.csv`.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` (PK) | `uuid` | Interno. |
| `external_id_votacao` (UNIQUE) | `text` | Chave de rematch com a fonte. Formato `"{N}-{seq}"`. |
| `uri` | `text` | |
| `data` | `date` | |
| `data_hora_registro` | `timestamptz` | |
| `external_id_orgao` | `bigint` | Referência ao órgão (`/orgaos/{id}`). Não modelamos órgão como tabela. |
| `sigla_orgao` | `text` | Ex.: `PLEN`, `CN`, `CCJC`. |
| `escopo_votacao` | `text` GENERATED ALWAYS | `'plenario'` quando `sigla_orgao IN ('PLEN','CN')`, senão `'comissao'` (ADR 0002). |
| `external_id_evento` | `bigint` | Referência ao evento (`/eventos/{id}`). Pode ser nulo. Não modelamos evento como tabela. |
| `aprovacao` | `smallint` | `0`/`1`. |
| `votos_sim` | `integer` | Placar agregado da CSV. |
| `votos_nao` | `integer` | |
| `votos_outros` | `integer` | |
| `descricao` | `text` | |
| `desc_ultima_abertura_votacao` | `text` | Do CSV. |
| `desc_ultima_apresentacao_proposicao` | `text` | Do CSV. |
| `data_ultima_abertura_votacao` | `timestamptz` | |
| `data_ultima_apresentacao_proposicao` | `timestamptz` | |
| `external_id_proposicao_ultima_apresentacao` | `bigint` | Referência à proposição da última apresentação (`/proposicoes/{id}`). Pode coincidir ou não com proposição já ingerida. **Não é o vínculo canônico votação↔proposição** (ADR 0009). |

**Índices**: `(data)`, `(escopo_votacao, data)`, `(external_id_evento)`.

---

### `votacao_proposicao`

Fonte: `votacoesProposicoes-{ano}.csv`. **Única fonte canônica** do vínculo (ADR 0009); `votacoesObjetos-{ano}.csv` não é ingerido.

**Filtro de ingestão**: apenas pares em que ambos os lados estão ingeridos.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` (PK) | `uuid` | Interno. |
| `votacao_id` (FK → `votacao.id`) | `uuid` | |
| `proposicao_id` (FK → `proposicao.id`) | `uuid` | |
| `descricao` | `text` | Descrição do vínculo no momento (ex.: "Aprovado o Parecer..."). |

**Unicidade**: `(votacao_id, proposicao_id)`. Relação N:N: uma votação pode afetar várias proposições; uma proposição pode aparecer em várias votações.

**Índices**: `(proposicao_id)` para "todas as votações que afetaram a proposição X".

---

### `votacao_votos`

Fonte: `votacoesVotos-{ano}.csv` (cabeçalho: `idVotacao;uriVotacao;dataHoraVoto;voto;deputado_id;deputado_uri;deputado_nome;deputado_siglaPartido;deputado_uriPartido;deputado_siglaUf;deputado_idLegislatura;deputado_urlFoto`).

**Modelagem** (ADR 0010): uma linha por votação nominal, votos agregados em JSONB.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` (PK) | `uuid` | Interno. |
| `votacao_id` (UNIQUE, FK → `votacao.id`) | `uuid` | 1:1 com votação. |
| `votos_json` | `jsonb` | Estrutura abaixo. |
| `qtd_sim` | `integer` | Contagens derivadas — sanity check vs `votacao.votos_sim/nao/outros` e ranqueamento sem parse de JSON. |
| `qtd_nao` | `integer` | |
| `qtd_abstencao` | `integer` | |
| `qtd_obstrucao` | `integer` | |
| `qtd_artigo_17` | `integer` | |
| `qtd_nao_informado` | `integer` | |

**Estrutura de `votos_json`** — objeto com seis arrays. Cada item identifica o deputado pelo **`deputado_id` interno (uuid)**; o `external_id_deputado` da Câmara fica fora do JSON para evitar redundância e para forçar quem ler a passar pela tabela canônica:

```jsonc
{
  "sim":           [{ "deputadoId": "f3a0...", "siglaPartido": "MDB", "siglaUf": "AP", "dataHoraVoto": "2025-11-05T12:41:17" }, ...],
  "nao":           [...],
  "abstencao":     [...],
  "obstrucao":     [...],
  "artigo_17":     [...],
  "nao_informado": [...]
}
```

**Mapeamento dos valores brutos do CSV** (distintos em 2025 verificados: `Abstenção`, `Artigo 17`, `Não`, `Obstrução`, `Sim`, mais string vazia):

| Valor CSV | Categoria no JSON |
|---|---|
| `Sim` | `sim` |
| `Não` | `nao` |
| `Abstenção` | `abstencao` |
| `Obstrução` | `obstrucao` |
| `Artigo 17` | `artigo_17` |
| (vazio) | `nao_informado` |

No matcher, `artigo_17` recebe o mesmo tratamento de fora de exercício: não entra no denominador.

**`siglaPartido` no JSON**: snapshot do partido **no momento do voto**. Para "partido atual", consultar `deputado_historico` (último evento).

**Resolução de `deputadoId` (uuid interno) durante a ingestão**: o CSV traz apenas a coluna `deputado_id` (que corresponde ao `external_id_deputado` no schema). A ingestão resolve via lookup em `deputado.external_id_deputado` antes de montar o JSON. Deputado externo desconhecido na tabela (filtrado por `idLegislaturaFinal >= 51` ou ausente) é ignorado e contabilizado no resumo de qualidade da ingestão.

---

## Resumo de filtros de ingestão

| Tabela | Filtro determinante |
|---|---|
| `deputado` | `idLegislaturaFinal >= 51` (ADR 0003) |
| `deputado_historico` | Apenas para `deputado` já ingerido; via API `GET /deputados/{id}/historico` |
| `votacao` | `id` do CSV aparece em `votacoesVotos-{ano}.csv` (ADR 0002) |
| `proposicao` | Aparece em `votacoesProposicoes` ligada a uma `votacao` ingerida |
| `proposicao_tema` | `external_id_proposicao` resolvível em `proposicao` |
| `votacao_proposicao` | Ambos os lados resolvíveis (`external_id_votacao` + `external_id_proposicao`) |
| `votacao_votos` | `external_id_votacao` resolvível em `votacao` |
| `tema` | Descoberto via `proposicoesTemas` |
| `partido` | Descoberto via `votacoesVotos` e `deputado_historico` |
| `legislatura` | Sem filtro |

---

## Ordem de carga sugerida

1. `legislatura` (sem dependências).
2. `deputado` (FK em `legislatura` para `legislatura_inicial_id`/`legislatura_final_id`).
3. `partido` em duas fontes:
   a. Pré-popular a partir de `votacoesVotos-{ano}.csv` (`deputado_uriPartido`).
   b. Complementar durante a carga de `deputado_historico` quando aparecer `uriPartido` desconhecido.
4. `deputado_historico` (FK em `deputado`, `legislatura` e `partido`; fetch via API `GET /deputados/{id}/historico` por deputado ingerido — paralelizado com a semântica do `csv-downloader`).
5. `tema` (extração lateral via `proposicoesTemas`).
6. `votacao` (filtrada pelos ids que aparecem em `votacoesVotos`).
7. `proposicao`: passo único de insert das proposições afetadas a partir de `proposicoes-{ano}.csv`. O pré-voo garante em disco os arquivos dos anos necessários, derivados das votações em escopo, baixando os ausentes (ADR 0012). Sem `proposicao_principal_id` e sem fallback de API.
8. `votacao_proposicao` (FK em ambos).
9. `proposicao_tema` (FK em `proposicao` e `tema`).
10. `votacao_votos` (FK em `votacao`; lookup de `deputado` por `external_id_deputado`).

---

## Pontos a confirmar antes de mergear esta modelagem

1. **Foto do deputado**. Modelagem atual não persiste foto em `deputado` — inferência pelo padrão `https://www.camara.leg.br/internet/deputado/bandep/{external_id_deputado}.jpg`. Em `deputado_historico` persistimos o `url_foto` retornado pela API por evento (snapshot), o que dá auditabilidade de mudança sem custar fetch extra. Se observarmos divergência sistemática entre a URL inferida e a URL retornada pela API, migrar para persistir `url_foto` em `deputado` também.
2. **Tratamento de eventos-marco em `deputado_historico`**. Eventos com `situacao = null` aparecem no primeiro segundo de cada legislatura como marcos administrativos. Ficam persistidos (auditabilidade do histórico bruto), mas precisam ser ignorados na derivação de intervalos de exercício. Verificar se algum consumidor além do matcher precisa expor esses marcos ou apenas usá-los como dado bruto auditável.
