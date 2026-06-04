# Quem Vota Comigo - Modelagem de Dados da Câmara

## Objetivo

Este documento registra a modelagem relacional implementada para os dados importados da Câmara dos Deputados e derivados diretamente dessa importação.

O escopo desta documentação é apenas o schema dos dados da Câmara em `apps/api/src/shared/database/schema/`. Registros exclusivos do sistema, como autenticação, telemetria, coleta do matcher, curadoria manual, preferências de usuário ou qualquer outra tabela futura que não represente dados importados da Câmara, não entram neste documento.

O escopo das fontes de ingestão é o definido em `docs/ingestion/fontes-ingestao.md`.

## Convenções

### Identificadores internos e externos

- Toda tabela tem `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`.
- O `id` interno é a chave preferencial para foreign keys entre tabelas.
- Identificadores vindos da fonte recebem prefixo `external_`.
- Quando o identificador externo representa a própria linha importada, ele é `UNIQUE`. Exemplos: `external_id_deputado`, `external_id_proposicao`, `external_id_votacao`, `external_id_legislatura`, `external_id_partido`, `external_cod_tema`.
- Quando o identificador externo referencia entidade da Câmara não modelada como tabela, ele não é `UNIQUE`. Exemplos: `external_id_evento`, `external_id_orgao`, `external_id_proposicao_ultima_apresentacao`, `external_cod_tipo`.
- Algumas tabelas derivadas ou de junção preservam também os identificadores externos usados na ingestão, além das FKs internas. Hoje isso ocorre em `votacao_votos`, `votacao_proposicao` e `proposicao_tema`.
- Atributos auxiliares preservam o nome da fonte sem prefixo `external_`: `uri`, siglas categóricas e snapshots textuais.
- No banco os nomes são `snake_case`; no TypeScript via Drizzle, `camelCase`.

### Tipos e nomes

- Tabelas usam substantivos do domínio em português sem acento, no singular.
- `votacao.external_id_votacao` usa `text`, porque o formato é composto, como `"2458405-38"`.
- Datas civis usam `date`; timestamps usam `timestamp with time zone`.
- O agregado de votos nominais usa `jsonb` em `votacao_votos.votos_json`.

## Entidades

### `legislatura`

Fonte: `legislaturas.csv`.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK, interno, default `gen_random_uuid()`. |
| `external_id_legislatura` | `smallint` | `NOT NULL`, `UNIQUE`. |
| `uri` | `text` | |
| `data_inicio` | `date` | |
| `data_fim` | `date` | |
| `ano_eleicao` | `smallint` | |

### `partido`

Fonte derivada: extraído de `votacoesVotos-{ano}.csv` e de eventos de `deputado_historico`.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK, interno, default `gen_random_uuid()`. |
| `external_id_partido` | `bigint` | `NOT NULL`, `UNIQUE`. Extraído do final de `uriPartido`. |
| `sigla` | `text` | Sigla na observação importada. |
| `uri` | `text` | |

Não há tabelas persistidas para federação ou bloco parlamentar nesta modelagem.

### `deputado`

Fonte: `deputados.csv`.

Filtro de ingestão: apenas registros com `idLegislaturaFinal >= 51`.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK, interno, default `gen_random_uuid()`. |
| `external_id_deputado` | `bigint` | `NOT NULL`, `UNIQUE`. Derivado do final de `uri`. |
| `uri` | `text` | |
| `nome` | `text` | Nome parlamentar. |
| `nome_civil` | `text` | |
| `sigla_sexo` | `char(1)` | |
| `data_nascimento` | `date` | |
| `data_falecimento` | `date` | |
| `uf_nascimento` | `char(2)` | |
| `municipio_nascimento` | `text` | |
| `url_rede_social` | `text` | Valor mantido como veio do CSV. |
| `url_website` | `text` | |
| `legislatura_inicial_id` | `uuid` | FK para `legislatura.id`. |
| `legislatura_final_id` | `uuid` | FK para `legislatura.id`. |

Foto e partido atual não são persistidos em `deputado`. A foto é inferida pela URL canônica da Câmara quando necessário. O partido atual é derivado do último estado conhecido em `deputado_historico`.

### `deputado_historico`

Fonte: API `GET /deputados/{id}/historico`, executada para deputados ingeridos.

A fonte retorna eventos pontuais em `dados[]`, identificados por `dataHora`, com snapshot do estado do deputado naquele instante. Não há `dataInicio` nem `dataFim`; intervalos de exercício são derivados pelo consumidor.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK, interno, default `gen_random_uuid()`. |
| `deputado_id` | `uuid` | `NOT NULL`, FK para `deputado.id`. |
| `legislatura_id` | `uuid` | `NOT NULL`, FK para `legislatura.id`. |
| `partido_id` | `uuid` | FK para `partido.id`. Pode ser nulo. |
| `data_hora` | `timestamp with time zone` | `NOT NULL`. Campo `dataHora` da API. |
| `situacao` | `text` | Pode ser nulo. |
| `condicao_eleitoral` | `text` | Pode ser nulo. |
| `descricao_status` | `text` | `NOT NULL`. Texto livre da API. |
| `nome` | `text` | Snapshot do nome parlamentar. |
| `nome_eleitoral` | `text` | Snapshot do nome eleitoral. |
| `sigla_uf` | `char(2)` | Snapshot da UF representada. |
| `email` | `text` | Snapshot do e-mail. |
| `url_foto` | `text` | Snapshot da URL de foto retornada pela API. |

Constraints e índices:

| Nome | Definição |
|---|---|
| `deputado_historico_evento_unico` | `UNIQUE (deputado_id, data_hora, descricao_status)`. |
| `deputado_historico_deputado_data_idx` | `INDEX (deputado_id, data_hora DESC)`. |

Eventos administrativos com `situacao = null` ficam persistidos como dado bruto, mas não abrem nem fecham intervalo de exercício.

### `proposicao`

Fonte: `proposicoes-{ano}.csv`.

Filtro de ingestão: proposições afetadas por votações nominais ingeridas, via `votacoesProposicoes-{ano}.csv`.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK, interno, default `gen_random_uuid()`. |
| `external_id_proposicao` | `bigint` | `NOT NULL`, `UNIQUE`. |
| `uri` | `text` | |
| `sigla_tipo` | `text` | Ex.: `PL`, `PEC`, `MPV`. |
| `numero` | `integer` | |
| `ano` | `integer` | |
| `external_cod_tipo` | `bigint` | Código externo do tipo de proposição. |
| `descricao_tipo` | `text` | |
| `ementa` | `text` | |
| `ementa_detalhada` | `text` | |
| `keywords` | `text` | Mantido como veio da fonte. |
| `data_apresentacao` | `timestamp with time zone` | |
| `url_inteiro_teor` | `text` | |
| `ultimo_status_data_hora` | `timestamp with time zone` | |
| `ultimo_status_sigla_orgao` | `text` | |
| `ultimo_status_regime` | `text` | |
| `ultimo_status_descricao_situacao` | `text` | |

Não há `proposicao_principal_id` nesta modelagem. Vínculos entre votação e proposição são modelados em `votacao_proposicao`.

### `tema`

Fonte derivada: extraído de `proposicoesTemas-{ano}.csv`.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK, interno, default `gen_random_uuid()`. |
| `external_cod_tema` | `bigint` | `NOT NULL`, `UNIQUE`. |
| `tema` | `text` | Nome do tema conforme a fonte. |

### `proposicao_tema`

Fonte: `proposicoesTemas-{ano}.csv`.

Filtro de ingestão: apenas registros cuja proposição esteja em `proposicao`.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK, interno, default `gen_random_uuid()`. |
| `external_id_proposicao` | `bigint` | `NOT NULL`. Identificador externo usado na ingestão. |
| `external_cod_tema` | `bigint` | `NOT NULL`. Código externo do tema usado na ingestão. |
| `proposicao_id` | `uuid` | `NOT NULL`, FK para `proposicao.id`. |
| `tema_id` | `uuid` | `NOT NULL`, FK para `tema.id`. |

Constraints:

| Nome | Definição |
|---|---|
| `proposicao_tema_external_unique` | `UNIQUE (external_id_proposicao, external_cod_tema)`. |

O campo `relevancia` do CSV não é persistido.

### `votacao`

Fonte: `votacoes-{ano}.csv`.

Filtro de ingestão: apenas votações cujo `id` aparece em `votacoesVotos-{ano}.csv`.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK, interno, default `gen_random_uuid()`. |
| `external_id_votacao` | `text` | `NOT NULL`, `UNIQUE`. Formato composto, como `"2458405-38"`. |
| `uri` | `text` | |
| `data` | `date` | |
| `data_hora_registro` | `timestamp with time zone` | |
| `external_id_orgao` | `bigint` | Referência a órgão da Câmara não modelado como tabela. |
| `sigla_orgao` | `text` | |
| `escopo_votacao` | `escopo_votacao` | `NOT NULL`. Enum PostgreSQL: `plenario` ou `comissao`. |
| `external_id_evento` | `bigint` | Referência a evento da Câmara não modelado como tabela. |
| `aprovacao` | `integer` | Valor importado/normalizado pela ingestão. |
| `votos_sim` | `integer` | Placar agregado da fonte. |
| `votos_nao` | `integer` | |
| `votos_outros` | `integer` | |
| `descricao` | `text` | |
| `ultima_abertura_votacao_data_hora_registro` | `timestamp with time zone` | |
| `ultima_abertura_votacao_descricao` | `text` | |
| `ultima_apresentacao_proposicao_data_hora_registro` | `timestamp with time zone` | |
| `ultima_apresentacao_proposicao_descricao` | `text` | |
| `external_id_proposicao_ultima_apresentacao` | `bigint` | Referência à proposição da última apresentação; não é o vínculo canônico votação-proposição. |
| `uri_proposicao_ultima_apresentacao` | `text` | URI da proposição da última apresentação. |

O enum `escopo_votacao` é criado pela migração com os valores `plenario` e `comissao`. A coluna não é gerada pelo banco.

### `votacao_proposicao`

Fonte: `votacoesProposicoes-{ano}.csv`.

Filtro de ingestão: pares em que os identificadores externos de votação e proposição aparecem no escopo ingerido.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK, interno, default `gen_random_uuid()`. |
| `external_id_votacao` | `text` | `NOT NULL`. Identificador externo usado na ingestão. |
| `external_id_proposicao` | `bigint` | `NOT NULL`. Identificador externo usado na ingestão. |
| `votacao_id` | `uuid` | FK para `votacao.id`. Pode ser nulo. |
| `proposicao_id` | `uuid` | FK para `proposicao.id`. Pode ser nulo. |

Constraints:

| Nome | Definição |
|---|---|
| `votacao_proposicao_external_unique` | `UNIQUE (external_id_votacao, external_id_proposicao)`. |

Não há coluna `descricao` nesta tabela.

### `votacao_votos`

Fonte: `votacoesVotos-{ano}.csv`.

Modelagem: uma linha por votação nominal importada, com votos agregados em JSONB.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | PK, interno, default `gen_random_uuid()`. |
| `votacao_id` | `uuid` | `NOT NULL`, FK para `votacao.id`. Não possui constraint `UNIQUE`. |
| `external_id_votacao` | `text` | `NOT NULL`, `UNIQUE`. Identificador externo usado na ingestão. |
| `votos_json` | `jsonb` | `NOT NULL`. Votos agrupados por categoria. |
| `votos_sim` | `integer` | `NOT NULL`. |
| `votos_nao` | `integer` | `NOT NULL`. |
| `votos_abstencao` | `integer` | `NOT NULL`. |
| `votos_obstrucao` | `integer` | `NOT NULL`. |
| `votos_artigo_17` | `integer` | `NOT NULL`. |
| `votos_nao_informado` | `integer` | `NOT NULL`. |

Estrutura esperada de `votos_json`:

```jsonc
{
  "sim": [{ "deputadoId": "uuid", "siglaPartido": "MDB", "siglaUf": "AP", "dataHoraVoto": "2025-11-05T12:41:17" }],
  "nao": [],
  "abstencao": [],
  "obstrucao": [],
  "artigo_17": [],
  "nao_informado": []
}
```

Mapeamento dos valores brutos do CSV:

| Valor CSV | Categoria no JSON |
|---|---|
| `Sim` | `sim` |
| `Não` | `nao` |
| `Abstenção` | `abstencao` |
| `Obstrução` | `obstrucao` |
| `Artigo 17` | `artigo_17` |
| vazio | `nao_informado` |

O JSON identifica deputados por `deputadoId` interno. O `external_id_deputado` da Câmara é resolvido durante a ingestão via `deputado.external_id_deputado`.

## Constraints e Índices Implementados

Unicidades implementadas:

| Tabela | Constraint |
|---|---|
| `legislatura` | `UNIQUE (external_id_legislatura)` |
| `partido` | `UNIQUE (external_id_partido)` |
| `deputado` | `UNIQUE (external_id_deputado)` |
| `deputado_historico` | `UNIQUE (deputado_id, data_hora, descricao_status)` |
| `proposicao` | `UNIQUE (external_id_proposicao)` |
| `tema` | `UNIQUE (external_cod_tema)` |
| `proposicao_tema` | `UNIQUE (external_id_proposicao, external_cod_tema)` |
| `votacao` | `UNIQUE (external_id_votacao)` |
| `votacao_proposicao` | `UNIQUE (external_id_votacao, external_id_proposicao)` |
| `votacao_votos` | `UNIQUE (external_id_votacao)` |

Índice não único implementado:

| Tabela | Índice |
|---|---|
| `deputado_historico` | `deputado_historico_deputado_data_idx` em `(deputado_id, data_hora DESC)` |

Não há outros índices explícitos modelados no Drizzle até a migração `0006_panoramic_thor_girl.sql`.

## Resumo de Filtros de Ingestão

| Tabela | Filtro determinante |
|---|---|
| `legislatura` | Sem filtro. |
| `deputado` | `idLegislaturaFinal >= 51`. |
| `partido` | Descoberto via `votacoesVotos` e `deputado_historico`. |
| `deputado_historico` | Apenas para `deputado` já ingerido, via API. |
| `votacao` | `id` aparece em `votacoesVotos-{ano}.csv`. |
| `proposicao` | Aparece em `votacoesProposicoes` ligada a `votacao` ingerida. |
| `tema` | Descoberto via `proposicoesTemas-{ano}.csv`. |
| `proposicao_tema` | `external_id_proposicao` e `external_cod_tema` resolvíveis. |
| `votacao_proposicao` | `external_id_votacao` e `external_id_proposicao` no escopo ingerido. |
| `votacao_votos` | `external_id_votacao` resolvível em `votacao`. |

