# Downloader de CSVs da Câmara — Contrato Operacional

Contrato operacional do downloader dos CSVs públicos da Câmara dos Deputados (`dadosabertos.camara.leg.br`). Descreve como executar, depurar e interpretar o download sem reabrir as decisões de produto sobre quais arquivos entram na base.

## O que o downloader é

O downloader é o **primeiro passo** da pipeline: baixa os CSVs da Câmara para o sistema de arquivos local (`data/raw/`), preparando o input da ingestão. A ingestão consome os arquivos locais — não baixa diretamente. Separar as duas etapas permite iterar a ingestão sem refazer downloads e isola falhas de rede da lógica de transformação.

O catálogo de arquivos é uma **decisão de produto** (um catálogo estático local), não uma consequência automática de tudo que a Câmara publica via Swagger. Todos os CSVs da Câmara têm encoding UTF-8.

> O pipeline-runner de ingestão também aciona o downloader sob demanda, para baixar os `proposicoes-{ano}.csv` e `proposicoesTemas-{ano}.csv` derivados que faltam ([ADR-0012](../adr/012-ingestao-proposicoes-sem-api-sem-principal.md)). Ver [pipeline-runner-ingestao.md](./pipeline-runner-ingestao.md).

### O que o downloader não faz

- Não valida conteúdo do CSV (separador, header, schema, `Content-Type`) — só o transporte: status HTTP de sucesso e conclusão do stream. Validação de conteúdo pertence à ingestão.
- Não descobre arquivos dinamicamente via Swagger; usa o catálogo estático.
- Não detecta que um arquivo **existente** mudou na fonte (ver [Detecção de "já baixado"](#detecção-de-já-baixado) e [Possibilidades futuras](#possibilidades-futuras)).
- Não filtra conteúdo por janela dentro de um arquivo; a janela seleciona quais **arquivos anuais** baixar, não linhas.

---

## Como executar

O comando público vive na raiz do repositório para reduzir atrito operacional. `pnpm download:csvs` é atalho para `pnpm --filter api download:csvs`. Os argumentos após `--` vão direto para o downloader.

```bash
# Backfill completo (2001 até o ano corrente, todos os datasets)
pnpm download:csvs

# Uma janela específica
pnpm download:csvs -- --from=2020 --to=2025

# Anos avulsos (ex.: a Câmara corrigiu arquivos isolados)
pnpm download:csvs -- --years=2019,2023

# Só os últimos 5 anos
pnpm download:csvs -- --last=5

# Apenas alguns datasets de uma janela
pnpm download:csvs -- --from=2020 --to=2025 --dataset=votacoes,votacoesVotos
```

Os arquivos são gravados em `apps/api/data/raw/` (a pasta fica no `.gitignore`; arquivos volumosos não vão para o Git). O downloader não toca o banco.

---

## Catálogo de datasets

Cada dataset carrega sua própria estratégia de URL. A família do portal de dados abertos segue o padrão `{baseUrl}/{dataset}/csv/{filename}`, com base `https://dadosabertos.camara.leg.br/arquivos`; a cota parlamentar tem host, caminho e convenção de nome próprios. O caminho local é sempre `data/raw/{dataset}/{filename}`. A janela temporal aplica-se só aos arquivos anuais; os arquivos únicos são baixados sempre (quando não filtrados por `--dataset`).

| Dataset               | Tipo  | Arquivo                         | Caminho local                   |
| --------------------- | ----- | ------------------------------- | ------------------------------- |
| `votacoes`            | anual | `votacoes-{ano}.csv`            | `data/raw/votacoes/`            |
| `votacoesVotos`       | anual | `votacoesVotos-{ano}.csv`       | `data/raw/votacoesVotos/`       |
| `votacoesProposicoes` | anual | `votacoesProposicoes-{ano}.csv` | `data/raw/votacoesProposicoes/` |
| `proposicoes`         | anual | `proposicoes-{ano}.csv`         | `data/raw/proposicoes/`         |
| `proposicoesTemas`    | anual | `proposicoesTemas-{ano}.csv`    | `data/raw/proposicoesTemas/`    |
| `deputados`           | único | `deputados.csv`                 | `data/raw/deputados/`           |
| `legislaturas`        | único | `legislaturas.csv`              | `data/raw/legislaturas/`        |
| `ceap`                | anual | `Ano-{ano}.csv`                 | `data/raw/ceap/`                |

### `ceap` — cota parlamentar

O dataset da **Cota parlamentar** é a única fonte fora do portal de dados abertos e o único arquivo compactado:

- URL: `https://www.camara.leg.br/cotas/Ano-{ano}.csv.zip`;
- arquivos existem a partir de **2008**; pedir ano anterior aborta com mensagem própria, sem tentar o download;
- é **opt-in**: fica fora do plano padrão e só entra com `--dataset=ceap`, porque são dezenove arquivos grandes que ninguém quer arrastar junto de um backfill comum;
- sem janela explícita, a janela default começa em 2008 em vez de 2001.

```bash
pnpm download:csvs -- --dataset=ceap --years=2025
```

O ZIP é baixado para `{arquivo}.zip.tmp`, tem a assinatura conferida, o CSV esperado é extraído para `{arquivo}.tmp` e só então promovido ao caminho final. Qualquer falha nessa cadeia descarta os dois temporários e não toca o destino. O leitor de CSV da ingestão não muda: o formato interno (UTF-8 com BOM, separador `;`) é o mesmo dos demais datasets.

Subpasta por dataset evita uma pasta plana com centenas de arquivos quando a janela cobre 25 anos. As informações mais atualizadas sobre os arquivos estão em <https://dadosabertos.camara.leg.br/swagger/api.html?tab=staticfile>.

---

## Flags

### Janela temporal: `--from` / `--to`, `--years`, `--last`

Três formas mutuamente exclusivas de definir os anos dos arquivos anuais:

- **`--from={ano}` / `--to={ano}`** — intervalo. Caminho default e mais legível. Quando só um lado é informado: `--from` baixa de `{ano}` ao ano corrente; `--to` baixa de `2001` a `{ano}`.
- **`--years={ano1,ano2,...}`** — anos avulsos, separados por vírgula. Útil quando a Câmara corrige um arquivo isolado.
- **`--last={5|10}`** — janela curta até o ano corrente, incluindo-o. Aceita apenas `5` ou `10`.

**Precedência**, da maior para a menor: `--years` → `--from`/`--to` → `--last` → default completo (`from=2001`, `to=ano atual`).

`--last` **não pode** ser combinado com `--years`, `--from` ou `--to`: a combinação é tratada como configuração ambígua e aborta antes de qualquer download.

```bash
pnpm download:csvs -- --from=2024 --to=2024   # ano único via intervalo
pnpm download:csvs -- --years=2025
pnpm download:csvs -- --last=10
```

### `--dataset={dataset1,dataset2,...}`

Restringe o plano a datasets específicos (anuais e/ou únicos), separados por vírgula. Sem a flag, baixa todos. Útil para rebaixar só um dataset corrigido sem varrer os demais.

```bash
pnpm download:csvs -- --years=2024 --dataset=votacoes
pnpm download:csvs -- --dataset=deputados,legislaturas
```

### `--force`

Ignora a checagem de existência e **rebaixa** tudo da janela configurada, sobrescrevendo o que estiver em disco. Combina com qualquer mecanismo de janela ou `--dataset`, porque não define quais arquivos entram — só muda a política de sobrescrita.

```bash
pnpm download:csvs -- --years=2024 --force
```

### Validação de anos

Anos no formato `YYYY`, dentro de `[2001, ano atual]`, com `--from <= --to`. Valores fora do intervalo abortam antes de qualquer download, com mensagem indicando o intervalo válido.

O piso vem do dataset, não de uma constante única:

- **Exceção (ADR-0012):** o piso de 2001 é dispensado quando `--dataset` contém **apenas** `proposicoes` e/ou `proposicoesTemas`, porque proposições e seus temas legítimos existem antes de 2001 (ex.: 1991, 1997-2000). Nesse caso o piso passa a ser `0`.
- **`ceap`:** piso 2008, com mensagem própria informando desde quando os arquivos da cota existem.

```bash
# Permitido: proposições pré-2001 isoladas
pnpm download:csvs -- --years=1999 --dataset=proposicoes

# Rejeitado antes de qualquer download
pnpm download:csvs -- --years=2007 --dataset=ceap
```

---

## Comportamento durante a execução

### Detecção de "já baixado"

Estratégia: **existência simples do arquivo** no caminho esperado. Se o arquivo existe, o download é pulado; se não, baixa. `--force` ignora essa checagem.

Limitação conhecida: se a Câmara atualiza um CSV existente (corrige, adiciona linhas), o downloader vê que o arquivo existe e pula — não detecta a mudança. Use `--force` (ou `--years`/`--dataset` mirando o arquivo) para rebaixar. Evoluções possíveis em [Possibilidades futuras](#possibilidades-futuras).

### Escrita atômica

O download é escrito primeiro em arquivo temporário `{arquivo}.tmp` no mesmo diretório e só é renomeado para o caminho final ao concluir com sucesso. Uma conexão interrompida não deixa um CSV parcial que seria tratado como já baixado. Um `.tmp` de execução anterior é descartado e o download recomeça do zero — arquivo temporário nunca é input válido, então essa limpeza não depende de `--force`.

Datasets compactados usam dois temporários: `{arquivo}.zip.tmp` recebe o download e `{arquivo}.tmp` recebe a extração. A promoção acontece só depois da extração e da validação, e a falha em qualquer etapa descarta os dois.

### Concorrência

Os downloads rodam com paralelismo fixo de **3 arquivos simultâneos** — acelera o backfill sem pressionar o servidor público da Câmara. Configurar o paralelismo fica adiado até existir necessidade real.

---

## Tratamento de falhas

**Estratégia: continuar e relatar no final.** Falha em um arquivo não interrompe os demais. Ao final, o resumo lista os arquivos que falharam e o motivo.

- **Retry com backoff:** erros transitórios são tentados até **3 vezes** com espera crescente (`1000ms`, depois `2000ms`) antes de marcar falha. Transitório = `429` ou `5xx`. Quando um `429` traz header `Retry-After`, esse valor é respeitado (segundos ou data HTTP); caso contrário, usa o backoff padrão.
- **Erros definitivos** (`404` e demais `4xx` exceto `429`) falham **imediatamente**, sem retry.
- **Timeout por inatividade:** medido por ausência de bytes, não por duração total. Se uma tentativa fica **60s** sem receber bytes, ela é abortada e entra na política de retry. Downloads longos seguem válidos enquanto houver progresso.

**Exit code:** `1` quando houve uma ou mais falhas (ou configuração inválida); `0` quando todos os arquivos foram baixados ou pulados sem erro.

---

## Saídas

### Output ao vivo

Uma linha por arquivo, conforme o resultado:

```
[deputados.csv] pulado
[legislaturas.csv] pulado
[votacoes-2020.csv] baixado
[votacoesVotos-2020.csv] baixado
[votacoes-2003.csv] falhou: 404 Not Found
```

### Resumo final

```
Resumo: 12 baixados, 8 pulados, 0 erros.
```

Quando há falhas, o resumo é seguido da lista:

```
Resumo: 18 baixados, 0 pulados, 2 erros.
Falhas:
  - votacoes-2003.csv: 404 Not Found
  - votacoesVotos-2004.csv: timeout por inatividade após 3 tentativas
```

Cada item do plano resolve para um de três status: `downloaded`, `skipped` ou `failed` (com `reason`). O resumo agrega as contagens e as falhas.

---

## Possibilidades futuras

Ideias consideradas e adiadas; ficam registradas para quando o uso revelar a demanda.

### Versionamento de snapshots

Quando a ingestão entrar em produção recorrente, vale manter snapshots datados dos CSVs usados em cada execução, para reprocessar uma ingestão antiga com os mesmos inputs (isolar bugs de transformação que apareçam meses depois). Caminhos: `data/snapshots/{data}/` com cópia, ou snapshot só do que efetivamente mudou. Adiado: em prototipagem, o custo de disco e manutenção não se paga ainda.

### Detecção de "já baixado" mais sofisticada

A estratégia atual (existência do arquivo) não percebe atualizações na fonte. Evoluções:

1. **Hash do conteúdo** — baixar em `.tmp`, comparar hash; substituir só se diferente. Mais correto, mas baixa duas vezes (consome banda).
2. **HTTP HEAD com `Last-Modified`/`ETag`** — consultar sem baixar e comparar com o arquivo local. Eficiente, mas depende de o servidor expor headers confiáveis. Investigar isso primeiro; se houver suporte, é o caminho ótimo, senão hash de conteúdo.

---

## Referências

- [ADR-0012 — Ingestão de proposições sem API e sem proposição principal](../adr/012-ingestao-proposicoes-sem-api-sem-principal.md)
- [pipeline-runner-ingestao.md](./pipeline-runner-ingestao.md) — contrato operacional do pipeline-runner de ingestão
- [fontes-ingestao.md](./fontes-ingestao.md) — origem de cada dado por passo
- Catálogo oficial: <https://dadosabertos.camara.leg.br/swagger/api.html?tab=staticfile>
