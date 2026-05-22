# Script de Download dos CSVs

## Objetivo

Definir o design do script responsável por baixar os CSVs públicos da Câmara dos Deputados (`dadosabertos.camara.leg.br`) para o sistema de arquivos local, preparando o input da pipeline de ingestão.

Este script é o primeiro passo da pipeline. A ingestão consome os arquivos baixados localmente — não baixa diretamente. Separar as duas etapas permite iterar a ingestão sem refazer downloads, e isolar falhas de rede da lógica de transformação de dados.

### Informações atualizadas

As informações mais atualizadas referente aos csv podem ser encontrados na url: https://dadosabertos.camara.leg.br/swagger/api.html?tab=staticfile

### Encoding

Todos os Csv da câmara possuem o encoding UTF-8

---

## Decisões tomadas

### Localização e comando público

O script pertence ao contexto técnico da API, em `apps/api/src/ingestion/csv-downloads/`, porque sua saída é o input direto da pipeline de ingestão que popula o banco da aplicação.

O comando público deve existir na raiz do repositório para reduzir atrito operacional:

```
pnpm download:csvs -- --from=2020 --to=2025
```

Esse comando delega para o pacote `api`, mas quem executa não precisa lembrar a sintaxe de filtro do workspace.

### Configuração da janela temporal

O script aceita três mecanismos de configuração para os arquivos separados por ano:

- `--from={ano}` e `--to={ano}` para definir um intervalo. Caminho default e mais legível.
- `--years={ano1,ano2,...}` para baixar anos específicos. Útil quando a Câmara corrige um arquivo isolado e é necessário rebaixar apenas ele.
- `--last={quantidade}` para baixar uma janela curta até o ano corrente. Inicialmente aceita apenas `5` ou `10`.

Precedência das opções de janela temporal, da maior para a menor:

1. `--years`
2. `--from`/`--to`
3. `--last`
4. default completo

Quando `--years` é fornecido, ele sobrescreve `--from`/`--to` e `--last`.

`--last` não pode ser combinado com `--years`, `--from` ou `--to`. Essa combinação é tratada como configuração ambígua e aborta antes de qualquer download. `--force` pode ser combinado com qualquer mecanismo de janela temporal, porque não define quais arquivos entram na execução — apenas muda a política de sobrescrita.

Quando nenhuma janela temporal é informada, o script baixa todos os anos válidos: `from = 2001` e `to = ano atual`.

`--last=5` baixa os últimos 5 anos incluindo o ano corrente. `--last=10` baixa os últimos 10 anos incluindo o ano corrente.

Quando apenas um lado do intervalo é informado, o script completa o outro lado assim:

- `--from={ano}` baixa de `{ano}` até o ano corrente.
- `--to={ano}` baixa de `2001` até `{ano}`.

O script aceita apenas anos entre `2001` e o ano corrente, inclusive. Valores fora desse intervalo abortam a execução antes de qualquer download, com mensagem indicando o intervalo válido.

### Dois grupos de arquivos

A janela temporal só se aplica aos arquivos separados por ano. Arquivos únicos são baixados sempre, sem parâmetro de ano.

**Arquivos por ano** (afetados pela janela):
- `votacoes-{ano}.csv`
- `votacoesVotos-{ano}.csv`
- `votacoesObjetos-{ano}.csv`
- `votacoesProposicoes-{ano}.csv`
- `proposicoes-{ano}.csv`
- `proposicoesTemas-{ano}.csv`

**Arquivos únicos** (baixados sempre):
- `deputados.csv` (lista completa de todos os deputados que já passaram pela Câmara)
- `legislaturas.csv` (lista completa)

Não há filtro por dataset na implementação inicial. Uma execução com `--years=2025`, por exemplo, baixa todos os datasets anuais configurados para 2025 e também considera os arquivos únicos. Um filtro como `--only-dataset` fica adiado até existir necessidade real.

### Catálogo de URLs

O script usa um catálogo estático local com os datasets definidos nesta documentação, em vez de descobrir arquivos dinamicamente via Swagger. A lista de arquivos baixados é uma decisão de produto da ingestão, não uma consequência automática de tudo que a Câmara publica.

A URL dos arquivos segue o padrão:

```
{baseUrl}/{dataset}/csv/{filename}
```

Base URL padrão:

```
https://dadosabertos.camara.leg.br/arquivos
```

Exemplo:

```
https://dadosabertos.camara.leg.br/arquivos/votacoes/csv/votacoes-2025.csv
```

A base URL pode ser sobrescrita por configuração técnica em testes, mas o uso normal do script aponta para `dadosabertos.camara.leg.br`.

### Estrutura de pastas local

Subpasta por dataset:

```
data/raw/
  votacoes/
    votacoes-2024.csv
    votacoes-2025.csv
  votacoesVotos/
    votacoesVotos-2024.csv
    votacoesVotos-2025.csv
  proposicoes/
    proposicoes-2024.csv
  deputados/
    deputados.csv
  legislaturas/
    legislaturas.csv
```

Justificativa: quando a janela expandir para 25 anos, são 25 arquivos por dataset. Subpasta por dataset evita pasta plana com centenas de arquivos misturados.

A pasta `data/raw/` fica no `.gitignore` — arquivos volumosos não vão para o Git.

### Detecção de "já baixado"

Estratégia inicial: **existência simples do arquivo no caminho esperado**. Se o arquivo existe localmente, o script pula o download. Se não existe, baixa.

Override via flag `--force`: ignora a checagem de existência e rebaixa tudo da janela configurada, sobrescrevendo o que estiver lá.

O download é escrito primeiro em arquivo temporário no mesmo diretório, com sufixo `.tmp`, e só é renomeado para o caminho final quando termina com sucesso. Assim, uma conexão interrompida não deixa um CSV parcial que seria tratado como já baixado na próxima execução.

Se existir apenas um `.tmp` de execução anterior, o script ignora esse arquivo como fonte de verdade e recomeça o download do zero, substituindo o temporário. Essa limpeza não depende de `--force`, porque arquivo temporário nunca é considerado input válido para a ingestão.

### Tratamento de falhas

**Estratégia: continuar e relatar no final.** Falha em um arquivo não interrompe o download dos demais. Ao final da execução, o script imprime um resumo com a contagem de sucessos, pulados e falhas, listando os arquivos que falharam e o motivo.

O downloader valida apenas o transporte: status HTTP de sucesso e conclusão do stream de escrita. Ele não valida `Content-Type`, separador, header, schema ou conteúdo do CSV. Validação de conteúdo pertence à etapa de ingestão.

Quando houver uma ou mais falhas ao final, o processo termina com exit code `1`. Quando todos os arquivos da execução forem baixados ou pulados sem erro, termina com exit code `0`.

Retry com backoff: em erros de rede transitórios (timeout, `429`, `5xx`), tentar 3 vezes com espera crescente antes de marcar como falha. Quando uma resposta `429` trouxer header `Retry-After`, respeitar esse valor; caso contrário, usar o backoff padrão. Erros definitivos (`404`, `4xx` exceto `429`) falham imediatamente sem retry.

Timeout é medido por inatividade, não por duração total do download: se uma tentativa ficar 60 segundos sem receber bytes, ela é abortada e entra na política de retry. Downloads longos continuam válidos enquanto houver progresso.

Os downloads rodam com paralelismo limitado a 3 arquivos simultâneos. Esse limite é fixo na implementação inicial: acelera o backfill completo sem pressionar excessivamente o servidor público da Câmara. Uma flag para configurar paralelismo fica adiada até existir necessidade real.

### Output do script

Formato sugerido (a refinar na implementação):

```
> npm run download -- --from=2020 --to=2025

[deputados.csv] já existe, pulando
[legislaturas.csv] já existe, pulando
[votacoes-2020.csv] baixando... ok (2.1 MB)
[votacoesVotos-2020.csv] baixando... ok (15.3 MB)
[proposicoes-2020.csv] já existe, pulando
...

Resumo: 12 baixados, 8 pulados, 0 erros.
```

Em caso de falhas:

```
Resumo: 18 baixados, 0 pulados, 2 erros.
Falhas:
  - votacoes-2003.csv: 404 Not Found
  - votacoesVotos-2004.csv: timeout após 3 tentativas
```

---

## Ideias para evolução futura (não implementadas)

### Versionamento de snapshots

Quando a ingestão entrar em produção real e for executada de forma recorrente, vale manter snapshots datados dos CSVs usados em cada execução. Permite reprocessar uma ingestão antiga com os mesmos dados de entrada que ela usou na época, útil para isolar bugs de transformação que apareçam meses depois.

Caminhos possíveis:
- Cada execução cria `data/snapshots/{data}/` com cópia dos arquivos baixados.
- Snapshot é gerado **antes** da substituição de um arquivo modificado, preservando só o histórico do que efetivamente mudou.

Decisão adiada porque o projeto está em prototipagem e o custo de manutenção e espaço em disco não se paga ainda.

### Detecção de "já baixado" mais sofisticada

A estratégia atual (existência do arquivo) tem uma fraqueza conhecida: se a Câmara atualiza um CSV existente (corrige erro, adiciona linhas), o script local não detecta — vê que o arquivo já existe e pula.

Duas evoluções possíveis:

1. **Hash do conteúdo.** Baixar em arquivo temporário, comparar hash com o arquivo existente. Se igual, descartar; se diferente, substituir. Mais correto, mas baixa duas vezes (consome banda).

2. **HTTP HEAD com `Last-Modified` ou `ETag`.** Consultar o servidor sem baixar, comparar com timestamp do arquivo local. Eficiente — depende do servidor `dadosabertos.camara.leg.br` expor esses headers, o que vale testar antes de implementar.

Quando essa evolução for endereçada, sugiro investigar primeiro se o servidor suporta `ETag`/`Last-Modified` confiáveis. Se sim, esse é o caminho mais eficiente. Caso contrário, hash de conteúdo.
