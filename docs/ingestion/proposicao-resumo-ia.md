# Resumos por IA de Proposições — Contrato Operacional

Contrato operacional do módulo `proposicao-resumo-ia`. Descreve como gerar, revisar, importar e reconciliar resumos por IA de proposições computáveis pelo matcher sem reabrir a decisão de arquitetura registrada na [ADR-0018](../adr/018-resumos-ia-proposicoes-json-projetados-banco.md).

## O que o módulo é

O módulo `proposicao-resumo-ia` gera resumos curtos e detalhados para proposições computáveis pelo matcher, usando apenas campos oficiais já ingeridos no banco: identificação legislativa, tipo, ementa, ementa detalhada e keywords. A geração usa OpenRouter, grava o resultado em JSONs anuais fora do banco e deixa a exposição pública dependente de revisão humana.

O fluxo tem três comandos independentes:

1. **Geração**: lê proposições computáveis do banco, chama OpenRouter e grava JSONs em `apps/api/data/generated/proposicao-resumos/{ano}.json`.
2. **Importação**: lê JSONs anuais revisados e projeta os itens na tabela `proposicao_resumo_ia`.
3. **Reconciliação**: compara os JSONs existentes com a fonte atual do banco e marca itens como `stale` quando a fonte mudou.

Essa separação mantém a ingestão oficial estruturada livre de dependência de IA, custo por chamada, chave externa e revisão humana. O banco consome uma projeção resolvida por `proposicao.id`; o JSON permanece como artefato gerado e revisável.

### O que o módulo não faz

- Não roda dentro do pipeline-runner de ingestão.
- Não grava nem altera arquivos em `apps/api/data/raw/`.
- Não usa PDF do inteiro teor, tramitação, temas oficiais ou votação de referência como fonte do prompt inicial.
- Não expõe resumo sem `generationStatus = generated`, `reviewStatus = approved`, hash atual e textos preenchidos.
- Não resolve revisão humana automaticamente: todo item gerado nasce `pending`.
- Não lê os JSONs diretamente em runtime da API pública; a aplicação lê a tabela `proposicao_resumo_ia`.

---

## Como executar

Pré-requisitos: dependências instaladas (`pnpm install`), Postgres acessível via `DATABASE_URL`, schema aplicado (`pnpm db:migrate`) e proposições computáveis já ingeridas pelo pipeline-runner. Para geração, também são necessárias as variáveis `OPENROUTER_API_KEY` e `OPENROUTER_MODEL`.

Todos os comandos abaixo são disparados da raiz do repositório com `pnpm --filter api`, mas os caminhos recebidos pelos scripts são resolvidos a partir de `apps/api`. Por isso, ao importar um JSON gerado, use `data/generated/proposicao-resumos/2025.json`, não `apps/api/data/generated/...`.

```bash
# 1. Gere resumos para uma janela pequena de validação
OPENROUTER_API_KEY=... OPENROUTER_MODEL=... \
  pnpm --filter api generate:resumos-ia -- --year=2025 --limit=20

# 2. Revise o JSON gerado em apps/api/data/generated/proposicao-resumos/2025.json

# 3. Importe o JSON revisado para o banco
pnpm --filter api import:resumos-ia -- data/generated/proposicao-resumos/2025.json

# 4. Depois de uma reingestão, reconcilie os JSONs com a fonte atual
pnpm --filter api reconcile:resumos-ia
```

Para usar o banco principal de desenvolvimento, suba o Postgres e aplique o schema antes:

```bash
pnpm db:up
pnpm db:migrate
pnpm ingest -- --from=2020 --to=2025
```

Para validar sem tocar o banco principal, use o mesmo padrão de banco descartável documentado em [pipeline-runner-ingestao.md](./pipeline-runner-ingestao.md) e rode os comandos `generate:resumos-ia`, `import:resumos-ia` e `reconcile:resumos-ia` apontando `DATABASE_URL` para esse banco.

---

## Artefato JSON

Os JSONs ficam em `apps/api/data/generated/proposicao-resumos/`, um arquivo por ano da proposição. A pasta está dentro de `apps/api/data/`, que é ignorada pelo Git.

Formato:

```json
{
  "ano": 2025,
  "items": {
    "2515300": {
      "sourceHash": "sha256...",
      "generationStatus": "generated",
      "reviewStatus": "pending",
      "resumoCard": "Texto curto para listagem.",
      "resumoDetalhe": "Texto completo para a página da proposição.",
      "model": "openrouter/modelo",
      "promptVersion": "v1",
      "generatedAt": "2026-06-20T12:00:00.000Z",
      "reviewedAt": null
    }
  }
}
```

`items` é indexado por `externalIdProposicao`. O importador resolve esse identificador público para o `proposicao.id` interno atual e faz upsert em `proposicao_resumo_ia`.

### Campos de status

`generationStatus` indica o resultado da chamada ao modelo:

| Valor | Semântica |
|-------|-----------|
| `generated` | O modelo devolveu `resumoCard` e `resumoDetalhe` válidos. |
| `insufficient_source` | A fonte oficial disponível não sustentou um resumo útil. |
| `error` | Houve erro HTTP, resposta ausente, JSON inválido ou violação de schema. |

`reviewStatus` indica o estado editorial:

| Valor | Semântica |
|-------|-----------|
| `pending` | Item ainda não revisado por pessoa. É o estado inicial. |
| `approved` | Item revisado e aprovado para exposição pública. |
| `rejected` | Item revisado e rejeitado. Fica fora da exposição pública. |
| `stale` | Item já não corresponde à fonte atual, segundo `sourceHash`. |

### Revisão humana

A revisão acontece editando o JSON anual. Para aprovar um item, revise o conteúdo, ajuste `resumoCard` e `resumoDetalhe` quando necessário, mude `reviewStatus` para `approved` e preencha `reviewedAt` com um timestamp ISO. Para rejeitar, use `reviewStatus = rejected`.

Não edite `sourceHash`, `model`, `promptVersion` ou `generatedAt` durante a revisão. Esses campos registram a geração e são usados para rastreabilidade e reconciliação.

Limites validados:

- `resumoCard`: até 180 caracteres.
- `resumoDetalhe`: até 900 caracteres.
- `resumoCard` e `resumoDetalhe` devem ser `null` quando `generationStatus = insufficient_source`.

---

## Geração

Comando:

```bash
pnpm --filter api generate:resumos-ia -- --year=2025 --limit=20
```

Fonte: todas as proposições em `proposicao_computavel`, ordenadas por volume de votações em plenário, ano, número, tipo e `externalIdProposicao`.

Variáveis obrigatórias:

| Variável | Uso |
|----------|-----|
| `OPENROUTER_API_KEY` | Token usado no header `Authorization` da chamada ao OpenRouter. |
| `OPENROUTER_MODEL` | Modelo enviado no corpo da chamada. Também é gravado no JSON. |

O cliente chama `https://openrouter.ai/api/v1/chat/completions` com `response_format: { "type": "json_object" }`. A resposta esperada do modelo é um JSON com `status`, `resumoCard` e `resumoDetalhe`.

### Flags

| Flag | Efeito |
|------|--------|
| `--year=YYYY` | Restringe a geração a proposições daquele ano. |
| `--limit=n` | Processa apenas os primeiros `n` alvos após ordenação e filtros. |
| `--external-id-proposicao=n` | Processa apenas uma proposição específica. |
| `--regenerate` | Regera todos os alvos filtrados com ano, inclusive itens já existentes. |

Sem `--regenerate`, a geração cria itens ausentes e tenta novamente apenas itens com `generationStatus = error`. Itens existentes com `generationStatus` diferente de `error` são preservados, independentemente de `reviewStatus`.

`--regenerate` sobrescreve o item no JSON e volta `reviewStatus` para `pending`, inclusive para resumos já aprovados. Use apenas quando a intenção for descartar a revisão anterior daquele recorte.

### Saídas

Resumo emitido ao final:

```text
Gerados: 18
Fonte insuficiente: 1
Erros: 1
Ignorados (já gerados): 42
Arquivos escritos: 1
```

Erros de chamada ao modelo viram itens com `generationStatus = error` e não abortam a execução inteira. Configuração inválida, ausência de `OPENROUTER_API_KEY`, ausência de `OPENROUTER_MODEL` ou JSON anual inválido abortam com exit code `1`.

---

## Importação

Comando:

```bash
pnpm --filter api import:resumos-ia -- data/generated/proposicao-resumos/2025.json
```

Também aceita múltiplos arquivos:

```bash
pnpm --filter api import:resumos-ia -- \
  data/generated/proposicao-resumos/2024.json \
  data/generated/proposicao-resumos/2025.json
```

O importador valida o schema do JSON, resolve cada `externalIdProposicao` para a linha atual de `proposicao` e faz upsert em `proposicao_resumo_ia` por `proposicao_id`. O upsert atualiza `imported_at` para `now()`.

Importar itens `pending`, `rejected`, `stale`, `insufficient_source` ou `error` é permitido. A API pública continua escondendo qualquer item que não satisfaça todos os critérios de exposição.

### Saídas

```text
Arquivos lidos: 1
Itens válidos: 20
Resumos importados: 20
Inseridos: 18
Atualizados: 2
Ignorados: 0
```

Se algum `externalIdProposicao` não existir mais no banco, o item é ignorado, a lista é exibida em `Proposições não encontradas` e o comando termina com exit code `1`. JSON inválido também aborta com exit code `1`.

---

## Reconciliação

Comando:

```bash
pnpm --filter api reconcile:resumos-ia
```

A reconciliação lê todas as proposições computáveis atuais do banco e todos os JSONs em `data/generated/proposicao-resumos/`. Para cada proposição, recalcula o `sourceHash` sobre os campos fonte normalizados:

- `externalIdProposicao`
- `siglaTipo`
- `numero`
- `ano`
- `descricaoTipo`
- `ementa`
- `ementaDetalhada`
- `keywords`

Quando o hash atual é igual ao hash do item, o item é preservado. Quando difere e o item ainda não está `stale`, o comando altera apenas `reviewStatus` para `stale`, mantendo textos, hash antigo e metadados de geração. Quando não há arquivo anual, não há item ou a proposição não tem ano, o `externalIdProposicao` entra na lista de pendentes.

### Saídas

```text
Proposições computáveis: 375
Preservados: 360
Marcados stale: 5
Pendentes: 10
Arquivos escritos: 2
Proposições sem item no JSON: 123, 456
```

O comando termina com exit code `1` quando há pendentes. Isso sinaliza que existem proposições computáveis sem item correspondente no JSON. Itens marcados `stale` por si só não tornam a execução inválida.

Depois da reconciliação, importe novamente os JSONs alterados para projetar `stale` no banco:

```bash
pnpm --filter api import:resumos-ia -- data/generated/proposicao-resumos/2025.json
```

---

## Exposição pública

A API pública só expõe resumo quando todos os critérios abaixo são verdadeiros:

- Existe linha em `proposicao_resumo_ia` vinculada à proposição.
- `generationStatus = generated`.
- `reviewStatus = approved`.
- `sourceHash` é igual ao hash calculado a partir da fonte atual.
- `resumoCard` e `resumoDetalhe` estão preenchidos.

Quando qualquer critério falha, o contrato público retorna `resumoIaDisponivel = false`, `resumoIaCard = null` e `resumoIaDetalhe = null`.

---

## Fluxos recomendados

### Primeira geração de um ano

```bash
OPENROUTER_API_KEY=... OPENROUTER_MODEL=... \
  pnpm --filter api generate:resumos-ia -- --year=2025

# revisar JSON manualmente

pnpm --filter api import:resumos-ia -- data/generated/proposicao-resumos/2025.json
```

### Retentar erros de geração

```bash
OPENROUTER_API_KEY=... OPENROUTER_MODEL=... \
  pnpm --filter api generate:resumos-ia -- --year=2025
```

Sem `--regenerate`, apenas itens ausentes e itens `error` são alvos. Isso evita sobrescrever revisão já feita.

### Regerar uma proposição específica

```bash
OPENROUTER_API_KEY=... OPENROUTER_MODEL=... \
  pnpm --filter api generate:resumos-ia -- \
  --external-id-proposicao=2515300 --regenerate
```

Depois revise o item e importe o arquivo anual correspondente.

### Após reingestão completa

```bash
pnpm --filter api reconcile:resumos-ia

# revisar pendentes e stale quando necessário

pnpm --filter api import:resumos-ia -- data/generated/proposicao-resumos/2025.json
```

Se a reconciliação marcar itens como `stale`, eles deixam de aparecer publicamente após a importação. Para publicá-los novamente, regenere os itens afetados, revise o novo texto, aprove e importe de novo.

---

## Referências

- [ADR-0018 — Resumos por IA de proposições são curados em JSON e projetados no banco](../adr/018-resumos-ia-proposicoes-json-projetados-banco.md)
- [pipeline-runner-ingestao.md](./pipeline-runner-ingestao.md) — contrato operacional do pipeline-runner de ingestão
- [camara-csv-downloader.md](./camara-csv-downloader.md) — contrato operacional do downloader de CSVs da Câmara
