# Célula da cota no comparativo: teto como segunda régua

Redesenho da célula "Gasto da cota parlamentar" no comparativo de deputados, com o teto da cota entrando ao lado da mediana da UF. O contrato já mudou; API e front faltam. Este documento é o estado da obra, não uma proposta.

## O problema da célula de hoje

A célula publica três números em texto corrido:

```
R$ 440,8 mil/ano
R$ 1,8 mi no total · 3% acima da mediana do SP
Ver mais detalhes no perfil →
```

Dois defeitos. A **hierarquia está invertida**: a manchete é o valor absoluto, que é o número menos comparável entre colunas, porque o gasto da cota é estruturalmente enviesado por UF — voar de RR custa mais que de DF por geografia, não por comportamento (é o mesmo argumento que `filtro-gasto-cota-mediana.md` usa para rejeitar faixa absoluta). O único número que compara de fato, o percentual sobre a mediana, fica por último, no menor corpo, no fim de uma linha que quebra. E o **detalhe mistura naturezas**: um valor absoluto e um percentual relativo separados por um ponto médio, como se fossem a mesma grandeza. Numa tabela cuja função é comparar, a célula não oferece nada visual — a conta é mental, coluna por coluna.

## Por que o teto entra

Não é só "mais um parâmetro". O teto **conserta uma assimetria conhecida** da comparação com a mediana.

O denominador da mediana exclui quem não exerceu o ano inteiro — o passo da mediana só considera exercício completo (`ingestion/pipeline-runner/steps/cota-mediana-uf/mediana-uf.ts`) —, mas o numerador é o gasto real de quem exerceu três meses. Todo suplente de passagem curta aparece bem abaixo da mediana e parece econômico. O teto não tem esse problema: `tetoAnualCota` soma os tetos dos meses em que o deputado teve direito à cota, então é ajustado ao exercício por construção.

As duas réguas são complementares: a mediana compara **com os pares**, o teto compara **com o próprio direito**. O teto é o único dos dois que é justo numa janela parcial.

## Forma decidida

```
R$ 440,8 mil/ano                         manchete, mantém o padrão "/ano" da grade
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│░░░░░░               trilho = teto, marca = mediana, preenchimento = gasto
78% do teto · 3% acima da mediana do SP   as duas réguas, lado a lado
R$ 1,8 mi de R$ 2,3 mi em 4 anos          absoluto confere e ancora o teto em reais
Ver mais detalhes no perfil →
```

Decisões já tomadas, para não serem relitigadas:

- **A manchete continua `R$/ano`.** As outras linhas do comparativo (proposições, órgãos) usam média anual como manchete via `toMediaAnualLabel`; quebrar o padrão só nesta linha faria a tabela ler menos uniforme. A barra é que carrega a comparação.
- **O absoluto vira "X de Y"** (`R$ 1,8 mi de R$ 2,3 mi`), que mantém o total conferível contra o portal da Câmara e ainda ancora o teto em reais, em vez de deixá-lo só como percentual abstrato.
- **`CopyDeputadosButton` fica como está.** Decisão explícita: a saída de texto não muda nesta rodada.

## Passo 1: contrato — FEITO

Já aplicado e verde na árvore de trabalho (`packages/shared-types/src/comparativo-deputados.ts`, ramo `comparavel` de `comparativoCotaSchema`):

- `medianaNaComparacaoCents` (int positivo) — a soma das medianas dos anos comparados, que hoje o mapper calcula e joga fora. É o que posiciona a marca da mediana na barra sem o front ter que derivar reais a partir de um percentual.
- `tetoNaComparacaoCents` (int positivo, **nullable**) — nulo quando algum ano em comparação não tem tabela publicada para a UF. Nullable por simetria com `tetoUf` no contrato do perfil, que o front já sabe tratar (`hasTeto`).
- Invariante nova no `superRefine`: `percentualSobreMedianaUf` tem que bater com `gastoNaComparacaoCents / medianaNaComparacaoCents`, com tolerância de 0,01 ponto. Pega um produtor que some conjuntos de anos diferentes no numerador e no denominador.

Em `apps/api/src/comparativo-deputados/tests/comparativo-deputados.schema.spec.ts`: a fixture `cotaComparavel()` foi extraída (os quatro blocos que montavam a cota inline passaram a usá-la) e entraram quatro cenários — teto nulo aceito, soma da mediana obrigatória, percentual inconsistente recusado, teto zerado recusado.

Verificação: `pnpm --filter @vota-comigo/shared-types build` passa e a suíte do schema fecha 25/25. Os três testes novos falharam antes da mudança.

**Estado intermediário:** com os campos obrigatórios no contrato e nenhum produtor preenchendo, a compilação da API só volta a fechar no fim do passo 2.

## Passo 2: API

### 2a. Distinguir os dois nulos do teto

`tetoAnualCota` (`apps/api/src/shared/cota/teto-anual-cota.ts`) devolve `null` em dois casos que o comparativo precisa separar:

| Caso | Hoje | O que o comparativo precisa |
| --- | --- | --- |
| Nenhum mês em exercício no ano | `null` | Contribui **zero** ao teto da janela |
| Sem tabela publicada para a UF | `null` | Torna o teto da janela **indeterminável** (nulo) |

Fundir os dois quebra um caso real e já coberto por teste: em `comparativo-cota.mapper.spec.ts`, o cenário "quando o deputado não esteve na Câmara em um dos anos" mantém 2023 na comparação com numerador zero porque o deputado só tomou posse em 2024. Com um `null` propagando, o teto da janela inteira sumiria por causa de um ano em que não havia direito nenhum a gastar.

O caminho é extrair de `tetoAnualCota` uma função que exponha a distinção (o `mesesEmExercicio` privado já tem a informação: `meses.length === 0` é um caso, `limiteMensalCota` retornando `null` é o outro), com `tetoAnualCota` virando um wrapper fino sobre ela para não mexer no perfil. Naming segue ADR 007 — verbo em inglês, substantivo de domínio em português; re-derivar da regra em vez de copiar `somarGastosAteMes` como precedente.

A soma na janela é `null` se **algum** ano em comparação cair no segundo caso, e a contribuição é zero no primeiro.

### 2b. Cortar o teto pela mesma régua do numerador

`tetoAnualCota` conta todos os meses de exercício do **ano civil**, mas o gasto só conta até `coveredThroughMonth`. Na legislatura em curso isso infla o denominador e o "% do teto" sai sistematicamente baixo.

Os intervalos precisam ser intersectados com a janela do ano antes de somar. `toAnoComSomas` (`comparativo-cota.mapper.ts`) já calcula `inicioEpoch` e `fimEpoch` exatamente para isso — é o mesmo par que alimenta `somarDiasEmExercicio`. Falta uma função que corte os intervalos e devolva `IntervaloExercicio[]`; `@/exercicio/rules/exercicio-ano` é o lugar natural, e o `toIntervalosEpoch` privado de lá já faz metade do trabalho.

Atenção à semântica: `fimEpoch` é exclusivo (é `min(fim da janela do ano, cobertura + 1 dia)`), e `mesesEmExercicio` conta mês tocado como mês inteiro. Com cobertura em fim de mês — o caso normal — isso casa com o numerador.

### 2c. Somar no mapper

Em `toComparativoCota`, `medianaNaComparacaoCents` é o `somaMedianaCents` que já existe na função. O teto é a soma por ano sobre os anos com `naComparacao`.

Cobertura da tabela: `vigenciasLimiteCota` começa em 2014-01-01 e o piso do comparativo é a 55ª legislatura (2015), então na prática não há janela descoberta — o teto nulo fica reservado a sigla de UF fora da tabela. As vigências viram em 2014-01-01, 2015-04-01, 2016-02-03, 2016-03-01, 2023-02-01 e 2026-02-20; a de 2026 estreia dia 20, então fevereiro de 2026 ainda usa a tabela anterior.

Valores para escrever expectativas nos testes (a fixture do mapper spec usa MG): MG vale `4188651` na vigência de 2023 e `4764591` na de 2026. SP, para referência cruzada com o spec do teto: `4283733` e `4872746`.

### 2d. O passo materializado — verificar antes de tudo

**Isto entrou depois do desenho original e provavelmente é o maior item do passo 2.** O HEAD atual (`deb9273`) trouxe `deputado_cota_comparacao`: a métrica deixou de ser só runtime.

- `apps/api/src/shared/database/schema/deputado-cota-comparacao.ts` — a tabela espelha o contrato (`percentual_sobre_mediana_uf`, `gasto_na_comparacao_cents`, `sigla_uf`, `anos_na_comparacao`, `dias_em_exercicio`, `dias_na_comparacao`, `anos_json`) e **não tem colunas de mediana nem de teto**.
- `apps/api/src/ingestion/pipeline-runner/steps/deputado-cota-comparacao/` — step e repository de escrita.
- `apps/api/src/deputados/deputados.repository.ts` — caminho de leitura.

Então os dois campos novos precisam de coluna, migração e ida-e-volta pelo step, ou o contrato não fecha na leitura materializada. Não li o step nem os repositories nesta sessão: **começar por eles**, porque decidem se o cálculo do teto vive no mapper, no step, ou nos dois. Como todo passo derivado, vale conferir o guard de fonte vazia antes de publicar `fullReplace`.

Fixtures que provavelmente quebram com o contrato novo (todas encontradas por `gastoNaComparacaoCents`):

- `apps/api/.../tests/comparativo-cota.mapper.spec.ts`
- `apps/api/.../tests/comparativo-deputados.contract.spec.ts`
- `apps/api/.../tests/comparativo-deputados.service.spec.ts`
- `apps/api/.../steps/deputado-cota-comparacao/deputado-cota-comparacao.step.spec.ts`
- `apps/web/src/shared/deputado/tests/comparativo-deputados-grid.spec.ts`
- `apps/web/src/shared/deputado/tests/comparativo-deputados-view.spec.ts`
- `apps/web/e2e/deputados-comparativo.spec.ts`

## Passo 3: front

`toCotaCell` (`apps/web/src/shared/deputado/comparativo-deputados-grid.ts:361`) hoje devolve `value` / `detail` / `link`, tudo texto. Para a barra, `ComparativoDeputadosCell` (mesmo arquivo, `:45`) precisa de um campo estruturado com gasto, teto e mediana — a formatação continua no grid, a pintura vai para a view.

A regra de escala já existe pronta e pura: `deriveGastoCotaComparacaoEscala` (`gasto-cota-comparacao.ts`) devolve `domain` e `tetoExcedido`, com o trilho virando o próprio teto quando o gasto cabe nele e se estendendo quando não cabe. Não precisa de recharts nesse tamanho — um `div` com largura percentual basta, e evita três gráficos por linha na grade.

Os dois lugares que renderizam a célula:

- `ComparativoValor` (`comparativo-deputados-view.tsx:238`), usada tanto pela grade `lg` quanto pela lista mobile.
- `ComparativoMobileValor` (`:305`), que embrulha a mesma `ComparativoValor`.

Como as duas compartilham `ComparativoValor`, a barra entra em um lugar só — mas a coluna da grade tem `minmax(13rem,1fr)` e se repete até três vezes, então conferir nas duas larguras é obrigatório antes de fechar.

Reaproveitar a barra do perfil (`gasto-cota-distribuicao-anual.tsx`) não é só economia: faz o comparativo falar a mesma língua visual do lugar para onde o link "Ver mais detalhes no perfil" manda o usuário.

## Passo 4: a nota do teto

Passar de 100% do teto **é legítimo**. A tabela por UF não inclui os adicionais mensais por cargo — liderança, presidência de comissão, suplência na Mesa —, como o próprio `limite-mensal-cota.ts` documenta e a legenda do perfil já diz ao usuário. Numa célula de comparativo, "104% do teto" sem essa ressalva lê como acusação.

O lugar é o `HelpPopover` da linha, que já existe: a linha `cota` do grid passa `help: COTA_PARLAMENTAR_HELP` (`gasto-cota-presentation.ts`). A nota entra ali.

## Validação final

Seguir `CLAUDE.md`: durante o TDD, só os testes focados de cada ciclo. Com o diff estável, agrupar em paralelo o build de `@vota-comigo/shared-types`, o build da API, o lint do front e os testes do front. `pnpm --filter web build` e a suíte completa da API rodam **fora do sandbox** (Turbopack abre porta local; os testes de contrato usam Supertest).

Mudança de contrato compartilhado exige verificar os consumidores dos dois lados — aqui, o passo de ingestão e o front.
