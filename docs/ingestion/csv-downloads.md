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

### Configuração da janela temporal

O script aceita dois mecanismos de configuração para os arquivos separados por ano:

- `--from={ano}` e `--to={ano}` para definir um intervalo. Caminho default e mais legível.
- `--years={ano1,ano2,...}` para baixar anos específicos. Útil quando a Câmara corrige um arquivo isolado e é necessário rebaixar apenas ele.

Quando `--years` é fornecido, ele sobrescreve `--from`/`--to`.

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

### Tratamento de falhas

**Estratégia: continuar e relatar no final.** Falha em um arquivo não interrompe o download dos demais. Ao final da execução, o script imprime um resumo com a contagem de sucessos, pulados e falhas, listando os arquivos que falharam e o motivo.

Retry com backoff: em erros de rede transitórios (timeout, 5xx), tentar 3 vezes com espera crescente antes de marcar como falha. Erros definitivos (404) falham imediatamente sem retry.

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
