# Runner de Ingestão — Design das Opções

## Objetivo

Definir as opções (flags) do runner de ingestão dos CSVs da Câmara dos Deputados, separando o que será implementado desde o início do que fica como possibilidade futura.

O runner é o orquestrador da pipeline de ingestão: lê os CSVs já baixados localmente (saída do script de download), transforma os dados conforme as regras definidas, complementa lacunas específicas via API da Câmara quando documentado, e popula o banco de dados.

As chamadas à API dentro do runner são exceções controladas, não uma segunda fonte geral de enriquecimento. No desenho inicial entra apenas:
- `GET /deputados/{id}/historico`, obrigatório para popular `deputado_historico`.

O passo de `proposicoes` não usa API (ADR 0012): quando faltam arquivos `proposicoes-{ano}.csv` dos anos necessários, o runner os baixa automaticamente antes de ingerir.

---

## Princípio orientador

Cada flag adiciona superfície de teste, documentação e bug potencial. Uma opção só entra no design inicial se há um caso de uso real e recorrente que a justifica. As demais ficam registradas como possibilidades futuras, a serem implementadas se a necessidade for de fato identificada durante o uso.

---

## Opções implementadas inicialmente

### `--only={passo1,passo2,...}`

Executa apenas os passos especificados da pipeline. Aceita múltiplos valores separados por vírgula.

**Caso de uso:** durante desenvolvimento, iterar na lógica de um passo específico (ex: ingestão de proposições) sem reprocessar os demais. Sem essa flag, qualquer ajuste exigiria rerodar a pipeline inteira.

**Exemplos:**
```
npm run ingest -- --only=votacoes
npm run ingest -- --only=votacoes,proposicoes
```

### `--from={ano}` e `--to={ano}`

Restringe a janela temporal dos arquivos por ano processados. Aplica-se apenas aos passos cujos CSVs são separados por ano (votações, proposições, etc.); arquivos únicos (deputados, legislaturas) são processados independentemente da janela.

**Caso de uso 1:** reprocessar apenas o ano corrente (atualização rotineira).
**Caso de uso 2:** CSV de um ano específico foi atualizado pela Câmara e precisa ser reingerido isoladamente.

**Exemplos:**
```
npm run ingest -- --from=2020 --to=2025
npm run ingest -- --from=2024 --to=2024     # ano único via intervalo
```

### `--dry-run`

Executa toda a lógica de parsing, transformação e validação, mas não grava nada no banco de dados. Funções de gravação viram no-op.

**Caso de uso:** validar uma nova janela de anos (especialmente dados antigos com qualidade variável) antes de comprometer ao banco. Também útil para testar mudanças no parser ou nas regras de transformação sem efeitos colaterais.

**Exemplo:**
```
npm run ingest -- --dry-run
npm run ingest -- --only=votacoes --dry-run
```

### `--strict`

Aborta a execução no primeiro erro de parsing ou validação, em vez de pular a linha problemática e continuar.

**Comportamento default (sem `--strict`):** erros de linha são logados e a execução continua. Ao final, todas as linhas rejeitadas aparecem no resumo. Esse é o modo apropriado para a maioria das execuções, especialmente em dados antigos com qualidade irregular.

**Comportamento com `--strict`:** primeiro erro mata o passo atual. Útil para debugging — quando algo falha e você quer ver imediatamente onde, sem ruído do resto do processamento.

**Exemplo:**
```
npm run ingest -- --only=votacoes --strict
```

### Combinação de flags

Todas as flags acima podem ser combinadas livremente. Exemplos:

```
# Validar ingestão de votações em janela específica sem gravar
npm run ingest -- --only=votacoes --from=2024 --to=2025 --dry-run

# Reprocessar proposições do ano corrente em modo estrito
npm run ingest -- --only=proposicoes --from=2025 --to=2025 --strict

# Dry-run completo da pipeline para uma janela
npm run ingest -- --from=2020 --to=2022 --dry-run
```

---

## Comportamento default (sem flag)

### Tratamento de erros

**Default:** continuar a linha, continuar o passo. Linhas com erro de parsing ou validação são logadas individualmente e a execução prossegue. Ao final do passo, contagem de rejeitadas aparece no resumo.

Justificativa: dados de 25 anos têm qualidade variável, e abortar a cada problema tornaria a ingestão impraticável. O modo estrito existe via `--strict` para os casos de debugging.

Quando uma proposição afetada necessária não existe em nenhum CSV local (ausente do arquivo do ano ou inexistente na fonte), o runner não cria registro sintético. No modo default, registra a lacuna como rejeição do passo `proposicoes` e segue a execução; em `--strict`, aborta imediatamente. O banco não deve aparentar completude quando a fonte daquela proposição não foi obtida. Não há fallback de API para proposições (ADR 0012).

### Pré-voo de `proposicoes` e download automático

O passo `proposicoes` depende de arquivos `proposicoes-{ano}.csv` que cobrem anos anteriores ao da votação. Antes de ingerir, o runner deriva das votações nominais em escopo (respeitando `--from`/`--to`/`--limit`) o conjunto de anos de proposição necessários e verifica se cada arquivo está em disco. Os anos ausentes são logados e baixados automaticamente pelo downloader (ADR 0012). A mesma função de "conjunto necessário" alimenta a validação e a ingestão, para que não divirjam.

Se o download de algum arquivo falhar, a execução para imediatamente, informando o motivo, quais arquivos faltam e como retomar (resolver a causa e reexecutar, p.ex. `--only=proposicoes`). Os passos baseados em CSV já concluídos antes do `proposicoes` permanecem gravados (upsert idempotente), então a retomada não os reprocessa de forma destrutiva.

### Resumos e métricas

Toda execução produz, ao final, um resumo estruturado no output do terminal, e grava os detalhes de erros em um arquivo separado.

**No output (texto puro):**

Por passo:
- Quantos registros lidos do CSV
- Quantos inseridos no banco
- Quantos atualizados no banco (via UPSERT)
- Quantos ignorados (não atendem critério de ingestão — ex: votações não nominais)
- Quantos rejeitados (erro de parsing/validação), agrupados por tipo de erro com contagem
- Quantas lacunas de fonte externa ocorreram (ex.: proposição necessária ausente de todo CSV), agrupadas por tipo
- Tempo de execução do passo

Global:
- Tempo total da execução
- Modo (normal, dry-run, strict)
- Janela temporal aplicada
- Caminho do arquivo de erros gerado (quando houver rejeições)

**No arquivo de erros (`data/logs/errors/errors-{timestamp}.log`):**

Para cada linha rejeitada:
- Arquivo de origem (ex: `votacoes-2024.csv`)
- Número da linha no CSV
- Tipo do erro (ex: `validacao_situacao_desconhecida`, `parse_data_invalida`)
- Conteúdo da linha original ou campos relevantes
- Mensagem detalhada do erro

A pasta `data/logs/errors/` fica no `.gitignore`. Arquivos são nomeados com timestamp para não sobrescrever entre execuções, permitindo análise comparativa.

**Tempo por passo:** medição com `performance.now()` no início e fim de cada passo. Overhead desprezível. Útil para identificar futuros gargalos sem precisar instrumentar manualmente quando necessário.

Justificativa da separação log/arquivo: o output do terminal precisa ser legível e enxuto (resumo de "12 rejeitados" basta para entender se algo está errado). O arquivo de erros existe para quando o desenvolvedor for **agir** sobre as rejeições — abrir, inspecionar caso a caso, decidir correção. Misturar os dois polui o log e dificulta ambos os usos.

---

## Possibilidades futuras (não implementadas)

Opções que foram consideradas e adiadas. Não há necessidade identificada ainda; ficam registradas para o caso de o uso revelar a demanda.

### `--verbose` / `--quiet`

Controlar o nível de detalhe do log durante a execução. Em desenvolvimento, ver tudo; em automação, ver só o essencial.

**Por que adiada:** logging estruturado bem feito (com níveis info/warn/error) já oferece boa visibilidade no default. Adiciona valor apenas se o output default se mostrar inadequado em uso real.

### `--skip={passo}`

Pular um passo específico, mantendo os demais.

**Por que descartada:** sobrepõe com `--only`. Manter duas formas de selecionar passos adiciona complexidade sem ganho — se você quer pular um passo de cinco, executa `--only` com os outros quatro.

### `--parallel` / `--threads`

Paralelizar a ingestão entre passos ou dentro de um passo.

**Por que descartada:** a ordem entre passos importa (chaves estrangeiras entre tabelas). Dentro de um passo, os volumes envolvidos não justificam o ganho de paralelismo frente ao custo de complexidade.

### `--rollback` / `--undo`

Desfazer a última execução de ingestão.

**Por que descartada:** idempotência via UPSERT já resolve o caso normal (rodar de novo produz o mesmo estado). Para situações de emergência (ingestão corrompida que precisa ser revertida), `drop + redo` é mais simples e mais seguro do que manter histórico de transações.

### `--config={arquivo}`

Arquivo de configuração externo em vez de flags na linha de comando.

**Por que adiada:** flags na linha de comando são suficientes para o estágio atual. Configuração externa vira útil quando há múltiplos ambientes (dev/staging/prod) com parâmetros diferentes, o que ainda não é o caso.

### `--db-url={url}`

Sobrescrever a URL do banco diretamente na linha de comando.

**Por que descartada:** variável de ambiente (`DATABASE_URL`) já cumpre essa função. Duplicar a responsabilidade em flag adiciona confusão (qual tem prioridade?) sem ganho real.

---

## Decisões resolvidas

- **Output do resumo:** texto puro estruturado.
- **Erros detalhados:** gravados em arquivo separado (`data/logs/errors/errors-{timestamp}.log`).
- **Granularidade de tempo:** tempo total por passo. Granularidade interna (parsing vs. transformação vs. gravação) fica adiada para quando algum passo se mostrar lento e precisar ser dissecado.
- **`--only` com nomes inválidos:** aborta com erro listando os passos válidos disponíveis. Silenciosamente não fazer nada seria o pior comportamento possível.

---

## Pontos abertos a decidir na implementação

1. **Convenção de tipos de erro.** Definir um conjunto enumerado de tipos (`validacao_situacao_desconhecida`, `parse_data_invalida`, `fk_proposicao_inexistente`, etc.) para agrupar consistentemente no resumo. Decidir no momento de implementar cada validação.

2. **Formato do conteúdo da linha no arquivo de erros.** Linha bruta do CSV, ou campos parseados estruturados (JSON por linha)? JSON por linha (JSONL) facilita parsing posterior para automação, mas linha bruta é mais simples e direta para inspeção visual. Decidir na implementação.
