# Cota parlamentar — lacuna de passagem aérea nos dumps anuais

## Contexto

Os dumps anuais da cota (`https://www.camara.leg.br/cotas/Ano-{ano}.csv.zip`, ingeridos em `data/raw/ceap/`) deixaram de publicar o tipo de despesa `PASSAGEM AÉREA - SIGEPA` a partir de **agosto de 2025**. O dado não deixou de existir: ele continua disponível na API v2, em `GET /deputados/{id}/despesas`. A lacuna é do export em lote, não da fonte.

Este documento registra como a lacuna foi identificada, o que foi validado por tabela no caminho, e a decisão de como preencher.

## Como foi validado

O portal do deputado (`https://www.camara.leg.br/deputados/{id}`) publica, por mês, o valor gasto e o percentual com 14 casas decimais. O denominador desse percentual é o **acumulado disponível** — teto do mês somado ao saldo não utilizado dos meses anteriores, conforme o próprio texto explicativo da página. Invertendo mês a mês:

```
teto_m = (gasto_m / pct_m) - (denominador_{m-1} - gasto_{m-1})
```

Isso permite recuperar o teto mensal exato de cada deputado a partir de dado publicado, sem depender de nenhuma tabela. Foi aplicado a 32 deputados em 9 UFs (AC, RR, DF, RJ, MG, BA, PA, SC, SP), sobre os meses de 2026.

## Achado 1 — a tabela de limites por UF está correta

Todo deputado sem adicional de cargo fecha com diferença de R$ 0,00 contra `apps/api/src/shared/cota/limite-mensal-cota.ts`, em todos os meses. Isso confirma de uma vez os valores por UF, os valores do Ato da Mesa 244/2026 (derivados do anexo de 2023 pelo IPCA acumulado, fator 1,1375) e o corte de vigência em `2026-02-20`.

Ponto operacional para quem consumir `limiteMensalCota`: o portal aplica o valor antigo em **fevereiro inteiro** e o novo a partir de março, sem rateio pro-rata no mês da virada. Ao derivar o teto de um mês, passar uma data do início do mês (`2026-02-01`). Com uma data posterior ao dia 19 a função devolve o valor novo e fevereiro de 2026 sai com R$ 5.890,13 a mais em SP.

## Achado 2 — adicional mensal por cargo

O teto real de parte dos deputados excede a tabela por UF em um valor fixo, nacional, não proporcional à UF — o mesmo valor absoluto aparece em AC, RR, DF, RJ, MG, BA, SC e SP.

| Adicional mensal | Proporção  |
| ---------------- | ---------- |
| R$ 1.353,04      | 3 unidades |
| R$ 902,02        | 2 unidades |
| R$ 451,02        | 1 unidade  |

O valor é rateado por dias quando o cargo começa ou termina no meio do mês (observados 90,20 / 96,65 / 144,97 / 916,58 / 966,46 / 1.037,33 / 1.142,56 / 1.222,10). Na amostra, 13 dos 32 deputados tinham algum adicional em algum mês.

O impacto é pequeno: no máximo 2,4% a 3,3% do teto mensal, conforme a UF — maior peso no DF, que tem a base menor. Como não há série histórica por deputado-mês em dado público, o adicional continua fora da tabela, e o comentário no topo de `limite-mensal-cota.ts` registra a omissão. A consequência prática é que o percentual calculado pelo produto pode ficar alguns pontos acima do exibido pelo portal para deputados com cargo, e a UI não deve prometer paridade ao centavo com o portal.

Foram observados também créditos avulsos grandes e isolados no denominador (um deputado com +R$ 16.897,90 em um mês, outro com +R$ 57.684,24). São restituições e estornos entrando no saldo, não regra de teto.

## Achado 3 — `PASSAGEM AÉREA - SIGEPA` ausente desde agosto de 2025

Totais do tipo por mês, apurados sobre os dumps anuais:

| Ano  | Jan–Jul                       | Ago–Dez                       |
| ---- | ----------------------------- | ----------------------------- |
| 2024 | R$ 2,1 mi a R$ 3,9 mi por mês | R$ 2,2 mi a R$ 5,0 mi por mês |
| 2025 | R$ 2,4 mi a R$ 4,7 mi por mês | apenas estornos negativos     |
| 2026 | zero em todo o arquivo        | —                             |

O encaixe com o portal é exato. Os totais mensais de um deputado batem ao centavo com o portal de janeiro a julho de 2025 e divergem de agosto em diante exatamente pela média histórica de SIGEPA daquele deputado.

Impacto em 2026 (janeiro a julho):

| Deputado     | Dump anual    | Portal        | Ausente |
| ------------ | ------------- | ------------- | ------- |
| Erika Hilton | R$ 101.517,32 | R$ 267.245,93 | 62%     |
| Alfredinho   | R$ 292.925,91 | R$ 326.217,37 | 10%     |

No agregado, SIGEPA era 16% a 18% do total da cota. A distribuição é muito desigual: quem voa muito perde quase todo o gasto no dump, quem voa pouco quase não perde. Por isso a lacuna enviesa comparação entre deputados e mediana por UF no período afetado, não apenas o valor absoluto de um perfil.

Verificações feitas para descartar hipóteses mais simples:

- Novo download do `Ano-2026.csv.zip` produz arquivo idêntico ao local — não é download desatualizado nem truncado.
- O `Ano-2026.json.zip` tem a mesma lacuna (mesmo total truncado, SIGEPA zerado). CSV e JSON compartilham o pipeline de export; trocar de formato não resolve.

**Reconfirmado em 18/08/2026, e uma armadilha no caminho.** A tabela acima foi reapurada sobre os dumps rebaixados naquele dia e não mudou: a `998` existe de junho de 2019 a julho de 2025, some a partir de agosto de 2025 deixando só estornos negativos, e não aparece em 2026. O corte de agosto de 2025 segue exato.

A reapuração foi necessária porque a geração de **17/08/2026** dos dumps veio truncada em todos os anos — a `998` sumia da série inteira, e 2023 fechava em R$ 201,5 mi em vez de R$ 247,0 mi. Ingerido, esse dump fazia o perfil de 2023 exibir gasto 30% menor sem marcar o ano como incompleto, porque a janela da reposição corretamente não alcança 2023. **Um dump truncado imita esta lacuna e leva a concluir que ela é retroativa.** Antes de mexer na janela em `reposicao-sigepa.ts`, confirme que o dump em disco está íntegro; ver [camara-csv-downloader.md](./camara-csv-downloader.md#geração-diária-e-arquivos-truncados).

## Fonte de reposição

`GET /deputados/{id}/despesas` traz SIGEPA normalmente e fecha com o portal:

| Deputado, período          | API           | Portal        |
| -------------------------- | ------------- | ------------- |
| Erika Hilton, 2026 jan–jul | R$ 267.245,93 | R$ 267.245,93 |
| Erika Hilton, 2025         | R$ 468.655,03 | R$ 468.659,33 |

Duas armadilhas do endpoint:

- **`idLegislatura` é obrigatório na prática.** Sem ele a resposta é `{"dados":[]}` com HTTP 200, não um erro. É fácil concluir que o dado não existe. A janela afetada cai inteira na legislatura 57, então o parâmetro é constante — não é preciso resolver legislatura por deputado-ano histórico.
- **`valorLiquido` da API diverge alguns centavos do `vlrLiquido` do dump.** No ano de 2025 de um deputado a diferença foi de R$ 4,30. Irrelevante para percentual, mas as duas fontes não devem ser comparadas por igualdade exata.

## Decisão: reposição em lote, não sob demanda

Dump anual como base até julho de 2025; API por deputado-ano de agosto de 2025 em diante, como passo de ingestão.

A alternativa considerada foi buscar na API sob demanda, apenas para os deputados efetivamente consultados, persistindo o resultado. Foi descartada por três motivos.

**Quebra a mediana por UF.** `cota-mediana-uf.repository.ts` carrega todos os deputados do ano (`loadGastosAnuais`) para calcular a mediana. Com carga sob demanda, a mediana passaria a ser calculada sobre quem foi consultado — amostra enviesada por popularidade, que muda sozinha conforme o tráfego chega. O mesmo perfil exibiria comparativos diferentes em dias diferentes sem nenhum dado novo ter entrado. As varreduras da cota têm o mesmo problema. Isso também contraria o princípio de que passo derivado não publica dado parcial.

**A economia é irrelevante para a decisão, mas o custo não é o medido aqui.** A medição inicial — 0,20s por página, cerca de 3 páginas por deputado-ano, ~5,4 minutos sequenciais para 513 deputados em um ano — foi feita **abaixo do limiar do balde de tokens** da API e subestima o custo real. Um ano custa cerca de 1540 requisições, e `throttling-deputado-historico.md` mede o balde esvaziando por volta de ~1000: nem um ano cabe em uma execução única. Isso não reabre a busca sob demanda, que continua descartada pelos outros dois motivos, mas obriga a reposição a ser retomável entre sessões em vez de um passo de uma tacada só. Ver ADR 022.

**A retroatividade do CEAP complica o cache.** Deputado tem três meses para apresentar recibo, e lançamentos entram depois. Observado na prática: março de 2026 aparecia com R$ 36.950,39 no dump enquanto o portal já mostrava R$ 50.198,46 para o mesmo deputado. No desenho em lote isso é resolvido pelo full replace que o passo já faz. No desenho sob demanda exigiria TTL por deputado-mês e conviveria com meses antigos congelados errados no banco.

Busca sob demanda seria defensável se o perfil passar a exibir **detalhe por documento** (nota fiscal, fornecedor, trecho da passagem), porque esse dado não entra em nenhum agregado. Para totais, não.

## Pontos em aberto

- A ausência de SIGEPA nos exports `Ano-{ano}.csv` e `Ano-{ano}.json` é defeito do lado da Câmara e vale reportar.
- A janela afetada começa em agosto de 2025 conforme observado hoje. Se a correção do lado da fonte for retroativa apenas em parte, a data de corte precisa ser reavaliada em vez de assumida.
- ~~A doc mediu apenas a categoria `998`. Falta confirmar na ingestão que a `999` (passagem aérea — RPA) continua presente no dump dentro da janela.~~ Confirmado em 18/08/2026: a `999` está presente na janela, com 554 linhas e R$ 724.567,04 em 2025 e 122 linhas e R$ 154.276,70 em 2026. O volume é pequeno porque a `999` vinha caindo desde 2020, quando a SIGEPA assumiu a aviação — não é sintoma da lacuna. A reposição cobre só a `998`, e está certo assim.

## Desenho da reposição

A forma da reposição está decidida na **ADR 022**: módulo à parte com tabela própria, mesclagem na leitura, passo manual e retomável nos moldes da ADR 011, completude tudo-ou-nada por ano. O sinal para aposentar o mecanismo passa a ser o relatório de total de SIGEPA por mês emitido pelo próprio passo do CSV, o que dispensa a verificação de sanidade por amostragem contra a API cogitada acima.
