# Exercício dos deputados nas top 5 votações do ranking

Análise feita no banco local em 2026-06-08 para verificar se os deputados da amostra estavam em exercício no momento das votações de referência das top 5 proposições do ranking público.

Esta análise começou sem consultar `votacao_votos` para determinar exercício e depois consultou `votacao_votos` apenas para documentar votos individuais. As fontes usadas são:

- `votacao`
- `votacao_proposicao`
- `proposicao`
- `deputado_historico`
- `deputado`
- `partido`
- `votacao_votos`

## Interpretação do recorte

"Top 5 votações do ranking das mais votadas" foi interpretado como:

1. pegar as 5 proposições no topo do ranking público de **Proposições mais votadas em plenário**;
2. para cada proposição, selecionar a votação de referência pelo mesmo critério usado no matcher;
3. verificar, pela linha do tempo derivada de `deputado_historico`, se cada deputado estava em exercício naquele `data_hora_registro`.

## Top 5 usadas

| Posição | Proposição    | Volume de votações em plenário | Votação de referência | Data da votação     | Critério da referência |
| ------: | ------------- | -----------------------------: | --------------------- | ------------------- | ---------------------: |
|       1 | PEC 186/2019  |                             36 | `2272137-224`         | 2021-03-11 15:02:22 |                      6 |
|       2 | MPV 1031/2021 |                             30 | `2270789-73`          | 2021-05-19 22:13:40 |                      5 |
|       3 | PLP 112/2021  |                             29 | `2292163-72`          | 2021-09-09 16:06:51 |                      5 |
|       4 | PL 4199/2020  |                             29 | `2260433-96`          | 2020-12-07 21:02:39 |                      5 |
|       5 | PL 2159/2021  |                             27 | `257161-337`          | 2021-05-13 00:05:05 |                      5 |

## Lógica usada para exercício

Para cada par deputado/votação:

1. ordenar eventos de `deputado_historico` por `data_hora`;
2. considerar apenas eventos efetivos até `votacao.data_hora_registro`;
3. tratar como abertura de exercício:
   - `descricao_status` contendo `Entrada -`;
   - ou `situacao = 'Exercício'` quando não for `Alteração de partido`;
4. tratar como fechamento de exercício:
   - `descricao_status` contendo `Saída -`;
   - `situacao` em `Suplência`, `Licença`, `Fim de Mandato`, `Vacância`;
   - `descricao_status = 'Situação e condição ao fim da legislatura (dados legados)'`;
5. ignorar `Alteração de partido` como transição de exercício, usando esse evento apenas para atualizar partido vigente;
6. se o último evento efetivo antes da votação for abertura, o deputado estava em exercício; caso contrário, estava fora de exercício.

## Matriz de resultado

| Deputado            | PEC 186/2019 | MPV 1031/2021 | PLP 112/2021 | PL 4199/2020 | PL 2159/2021 |
| ------------------- | ------------ | ------------- | ------------ | ------------ | ------------ |
| Aécio Neves         | Sim          | Sim           | Sim          | Sim          | Sim          |
| Coronel Telhada     | Não          | Não           | Não          | Não          | Não          |
| André Fufuca        | Sim          | Sim           | Sim          | Sim          | Sim          |
| Schiavinato         | Sim          | Não           | Não          | Sim          | Não          |
| Flordelis           | Sim          | Sim           | Não          | Sim          | Sim          |
| Alexandre Serfiotis | Não          | Não           | Não          | Sim          | Não          |
| Sérgio Brito        | Sim          | Sim           | Sim          | Sim          | Sim          |
| Chico Alencar       | Não          | Não           | Não          | Não          | Não          |

## Votos encontrados em `votacao_votos`

Consulta feita depois da matriz de exercício, usando `votacao_votos.votos_json`. Nesta base, o JSON persistido guarda apenas os UUIDs internos dos deputados agrupados por categoria; não há `dataHoraVoto` individual persistido.

Categorias possíveis:

- `sim`
- `nao`
- `abstencao`
- `obstrucao`
- `artigo_17`
- `nao_informado`
- `sem_registro`, quando o deputado não aparece em nenhuma categoria da votação.

| Deputado            | PEC 186/2019   | MPV 1031/2021  | PLP 112/2021   | PL 4199/2020   | PL 2159/2021   |
| ------------------- | -------------- | -------------- | -------------- | -------------- | -------------- |
| Aécio Neves         | `sim`          | `sim`          | `sim`          | `sem_registro` | `sem_registro` |
| Coronel Telhada     | `sem_registro` | `sem_registro` | `sem_registro` | `sem_registro` | `sem_registro` |
| André Fufuca        | `sim`          | `sem_registro` | `sim`          | `sem_registro` | `sem_registro` |
| Schiavinato         | `sem_registro` | `sem_registro` | `sem_registro` | `sim`          | `sem_registro` |
| Flordelis           | `sim`          | `sim`          | `sem_registro` | `sim`          | `sim`          |
| Alexandre Serfiotis | `sem_registro` | `sem_registro` | `sem_registro` | `sim`          | `sem_registro` |
| Sérgio Brito        | `sim`          | `sim`          | `sim`          | `sim`          | `sim`          |
| Chico Alencar       | `sem_registro` | `sem_registro` | `sem_registro` | `sem_registro` | `sem_registro` |

Não apareceu nenhum caso de voto registrado para deputado fora de exercício. Todos os registros encontrados foram `sim`.

## Voto por proposição

Nesta seção, `fora_de_exercicio` significa que o deputado não estava em exercício no momento da votação conforme `deputado_historico`. `sem_registro` é a categoria técnica da consulta para indicar que o deputado estava em exercício, mas não aparece em nenhuma categoria de `votacao_votos.votos_json`; no domínio do matcher, esse caso vira **Ausência sem motivo conhecido**.

### PEC 186/2019

Votação de referência: `2272137-224`, em 2021-03-11 15:02:22.

| Deputado            | Exercício         | Voto                |
| ------------------- | ----------------- | ------------------- |
| Aécio Neves         | Em exercício      | `sim`               |
| Coronel Telhada     | Fora de exercício | `fora_de_exercicio` |
| André Fufuca        | Em exercício      | `sim`               |
| Schiavinato         | Em exercício      | `sem_registro`      |
| Flordelis           | Em exercício      | `sim`               |
| Alexandre Serfiotis | Fora de exercício | `fora_de_exercicio` |
| Sérgio Brito        | Em exercício      | `sim`               |
| Chico Alencar       | Fora de exercício | `fora_de_exercicio` |

### MPV 1031/2021

Votação de referência: `2270789-73`, em 2021-05-19 22:13:40.

| Deputado            | Exercício         | Voto                |
| ------------------- | ----------------- | ------------------- |
| Aécio Neves         | Em exercício      | `sim`               |
| Coronel Telhada     | Fora de exercício | `fora_de_exercicio` |
| André Fufuca        | Em exercício      | `sem_registro`      |
| Schiavinato         | Fora de exercício | `fora_de_exercicio` |
| Flordelis           | Em exercício      | `sim`               |
| Alexandre Serfiotis | Fora de exercício | `fora_de_exercicio` |
| Sérgio Brito        | Em exercício      | `sim`               |
| Chico Alencar       | Fora de exercício | `fora_de_exercicio` |

### PLP 112/2021

Votação de referência: `2292163-72`, em 2021-09-09 16:06:51.

| Deputado            | Exercício         | Voto                |
| ------------------- | ----------------- | ------------------- |
| Aécio Neves         | Em exercício      | `sim`               |
| Coronel Telhada     | Fora de exercício | `fora_de_exercicio` |
| André Fufuca        | Em exercício      | `sim`               |
| Schiavinato         | Fora de exercício | `fora_de_exercicio` |
| Flordelis           | Fora de exercício | `fora_de_exercicio` |
| Alexandre Serfiotis | Fora de exercício | `fora_de_exercicio` |
| Sérgio Brito        | Em exercício      | `sim`               |
| Chico Alencar       | Fora de exercício | `fora_de_exercicio` |

### PL 4199/2020

Votação de referência: `2260433-96`, em 2020-12-07 21:02:39.

| Deputado            | Exercício         | Voto                |
| ------------------- | ----------------- | ------------------- |
| Aécio Neves         | Em exercício      | `sem_registro`      |
| Coronel Telhada     | Fora de exercício | `fora_de_exercicio` |
| André Fufuca        | Em exercício      | `sem_registro`      |
| Schiavinato         | Em exercício      | `sim`               |
| Flordelis           | Em exercício      | `sim`               |
| Alexandre Serfiotis | Em exercício      | `sim`               |
| Sérgio Brito        | Em exercício      | `sim`               |
| Chico Alencar       | Fora de exercício | `fora_de_exercicio` |

### PL 2159/2021

Votação de referência: `257161-337`, em 2021-05-13 00:05:05.

| Deputado            | Exercício         | Voto                |
| ------------------- | ----------------- | ------------------- |
| Aécio Neves         | Em exercício      | `sem_registro`      |
| Coronel Telhada     | Fora de exercício | `fora_de_exercicio` |
| André Fufuca        | Em exercício      | `sem_registro`      |
| Schiavinato         | Fora de exercício | `fora_de_exercicio` |
| Flordelis           | Em exercício      | `sim`               |
| Alexandre Serfiotis | Fora de exercício | `fora_de_exercicio` |
| Sérgio Brito        | Em exercício      | `sim`               |
| Chico Alencar       | Fora de exercício | `fora_de_exercicio` |

## Cruzamento entre exercício e voto

| Caso                             | Deputado            | Votação                                                 | Interpretação                                                                                                            |
| -------------------------------- | ------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Em exercício com voto registrado | Aécio Neves         | PEC 186/2019, MPV 1031/2021, PLP 112/2021               | Voto `sim`.                                                                                                              |
| Em exercício sem registro        | Aécio Neves         | PL 4199/2020, PL 2159/2021                              | Estava em exercício pelo histórico, mas sem entrada em `votacao_votos`; no domínio, é **Ausência sem motivo conhecido**. |
| Em exercício com voto registrado | André Fufuca        | PEC 186/2019, PLP 112/2021                              | Voto `sim`.                                                                                                              |
| Em exercício sem registro        | André Fufuca        | MPV 1031/2021, PL 4199/2020, PL 2159/2021               | Estava em exercício pelo histórico, mas sem entrada em `votacao_votos`; no domínio, é **Ausência sem motivo conhecido**. |
| Em exercício com voto registrado | Schiavinato         | PL 4199/2020                                            | Voto `sim`.                                                                                                              |
| Em exercício sem registro        | Schiavinato         | PEC 186/2019                                            | Estava em exercício pelo histórico, mas sem entrada em `votacao_votos`; no domínio, é **Ausência sem motivo conhecido**. |
| Em exercício com voto registrado | Flordelis           | PEC 186/2019, MPV 1031/2021, PL 4199/2020, PL 2159/2021 | Voto `sim`.                                                                                                              |
| Em exercício com voto registrado | Alexandre Serfiotis | PL 4199/2020                                            | Voto `sim`.                                                                                                              |
| Em exercício com voto registrado | Sérgio Brito        | Todas as cinco votações                                 | Voto `sim`.                                                                                                              |
| Fora de exercício sem registro   | Coronel Telhada     | Todas as cinco votações                                 | Sem mandato/sem evento efetivo anterior no período.                                                                      |
| Fora de exercício sem registro   | Chico Alencar       | Todas as cinco votações                                 | Hiato entre mandatos; sem entrada entre 2019 e 2023.                                                                     |
| Fora de exercício sem registro   | Alexandre Serfiotis | PEC 186/2019, MPV 1031/2021, PLP 112/2021, PL 2159/2021 | Vacância por renúncia antes dessas votações.                                                                             |
| Fora de exercício sem registro   | Schiavinato         | MPV 1031/2021, PLP 112/2021, PL 2159/2021               | Vacância por falecimento antes dessas votações.                                                                          |
| Fora de exercício sem registro   | Flordelis           | PLP 112/2021                                            | Vacância por perda de mandato antes da votação.                                                                          |

## Outras votações das top 5: Aécio Neves e André Fufuca

Esta seção lista as demais votações em plenário vinculadas às top 5 proposições, excluindo a votação de referência já registrada acima. O voto vem de `votacao_votos.votos_json`; `sem_registro` significa que o deputado não apareceu em nenhuma categoria daquele JSON.

Os horários estão em UTC. Os valores de voto seguem as categorias normalizadas persistidas no JSON (`sim`, `nao`, `abstencao`, `obstrucao`, `artigo_17`, `nao_informado`).

Resumo agregado das 146 votações adicionais:

| Deputado     | Votações adicionais | `sim` | `nao` | `sem_registro` |
| ------------ | ------------------: | ----: | ----: | -------------: |
| Aécio Neves  |                 146 |    47 |    28 |             71 |
| André Fufuca |                 146 |    40 |    27 |             79 |

### PEC 186/2019

| `external_id_votacao` | Horário             | Aécio Neves    | André Fufuca   | Descrição da votação                                                                                                                                                                                                  |
| --------------------- | ------------------- | -------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `2272137-28`          | 2021-03-09 16:09:50 | `nao`          | `nao`          | Rejeitado o Requerimento. Sim: 30; não: 346; abstenção: 2; total: 378.                                                                                                                                                |
| `2272137-36`          | 2021-03-09 16:53:57 | `sem_registro` | `sem_registro` | Rejeitado o Requerimento. Sim: 13; não: 338; abstenção: 1 total: 352.                                                                                                                                                 |
| `2272137-49`          | 2021-03-09 18:30:03 | `sem_registro` | `sem_registro` | Aprovado o Requerimento. Sim: 358; não: 76; abstenção: 2; total: 436.                                                                                                                                                 |
| `2272137-60`          | 2021-03-09 20:31:53 | `sim`          | `sim`          | Aprovado o Parecer adotado pelo Relator da Comissão de Constituição e Justiça e de Cidadania pela admissibilidade da Proposta de Emenda à Constituição nº 186, de 2019. Sim: 366; não: 118; abstenção: 2; total: 486. |
| `2272137-76`          | 2021-03-09 21:54:29 | `sem_registro` | `nao`          | Rejeitado o Requerimento. Sim: 95; não: 292; abstenção: 1; total: 388.                                                                                                                                                |
| `2272137-89`          | 2021-03-09 22:40:47 | `sim`          | `sem_registro` | Aprovado o Requerimento. Sim: 308; não: 51; abstenção: 4; total: 363.                                                                                                                                                 |
| `2272137-99`          | 2021-03-09 23:37:36 | `sem_registro` | `nao`          | Rejeitado o Requerimento. Sim: 123; não: 337; total: 460.                                                                                                                                                             |
| `2272137-108`         | 2021-03-10 00:39:46 | `sim`          | `sim`          | Aprovado o Requerimento. Sim: 231; não: 90; abstenção: 1; total: 322.                                                                                                                                                 |
| `2272137-114`         | 2021-03-10 01:30:59 | `sim`          | `sim`          | Aprovada, em primeiro turno, a Proposta de Emenda à Constituição nº 186, de 2019. Sim: 341; não: 121; abstenção: 10; total: 472.                                                                                      |
| `2272137-123`         | 2021-03-10 11:42:05 | `sem_registro` | `nao`          | Rejeitado o Requerimento. Sim: 13; não: 307; abstenção: 2; total: 322.                                                                                                                                                |
| `2272137-125`         | 2021-03-10 12:17:04 | `sim`          | `sim`          | Mantido o texto. Sim: 333; não: 135; abstenção: 1; Total: 469.                                                                                                                                                        |
| `2272137-129`         | 2021-03-10 12:55:11 | `sim`          | `sim`          | Suprimido o texto. Sim: 302; não: 178; abstenção: 4; total: 484.                                                                                                                                                      |
| `2272137-133`         | 2021-03-10 15:21:50 | `sim`          | `sim`          | Mantido o texto. Sim: 319; não: 181; abstenção: 3; total: 503.                                                                                                                                                        |
| `2272137-137`         | 2021-03-10 16:43:19 | `sim`          | `sim`          | Mantido o texto. Sim: 325; não: 165; abstenção: 3; total: 493.                                                                                                                                                        |
| `2272137-144`         | 2021-03-10 17:04:05 | `nao`          | `sem_registro` | Rejeitado o Requerimento. Sim: 84; não: 260; abstenção: 1; total: 345.                                                                                                                                                |
| `2272137-147`         | 2021-03-10 18:49:51 | `sim`          | `sem_registro` | Mantido o texto. Sim: 334; não: 162; abstenção: 1; total: 497.                                                                                                                                                        |
| `2272137-152`         | 2021-03-10 19:26:35 | `sem_registro` | `sim`          | Mantido o texto. Sim: 464; não: 19; total: 483.                                                                                                                                                                       |
| `2272137-156`         | 2021-03-10 20:32:33 | `sim`          | `sim`          | Mantido o texto. Sim: 322; não: 173; abstenção: 1; total: 496.                                                                                                                                                        |
| `2272137-159`         | 2021-03-10 21:28:05 | `sim`          | `sim`          | Mantido o texto. Sim: 338; não: 153; total: 491.                                                                                                                                                                      |
| `2272137-172`         | 2021-03-10 22:08:39 | `sem_registro` | `sem_registro` | Rejeitado o Requerimento. Sim: 91; não: 260; total: 351.                                                                                                                                                              |
| `2272137-174`         | 2021-03-10 22:42:18 | `sim`          | `sim`          | Mantido o texto. Sim: 345; não: 144; total: 489.                                                                                                                                                                      |
| `2272137-177`         | 2021-03-11 00:00:26 | `sim`          | `sim`          | Mantido o texto. Sim: 337; não: 151; total: 488.                                                                                                                                                                      |
| `2272137-196`         | 2021-03-11 12:25:19 | `nao`          | `sem_registro` | Rejeitado o Requerimento. Sim: 93; não: 278; total: 371.                                                                                                                                                              |
| `2272137-215`         | 2021-03-11 13:46:50 | `nao`          | `sem_registro` | Rejeitado o Requerimento. Sim: 113; não: 334; abstenção: 1; total: 448.                                                                                                                                               |
| `2272137-218`         | 2021-03-11 14:05:52 | `sim`          | `sem_registro` | Aprovado o Requerimento. Sim: 264; não: 99; total: 363.                                                                                                                                                               |
| `2272137-231`         | 2021-03-11 16:11:25 | `sim`          | `sim`          | Mantido o texto. Sim: 364; não: 125; total: 489.                                                                                                                                                                      |
| `2272137-236`         | 2021-03-11 16:59:18 | `sim`          | `sim`          | Mantido o texto. Sim: 334; não: 150; abstenção: 2; total: 486.                                                                                                                                                        |
| `2272137-245`         | 2021-03-11 17:55:45 | `sim`          | `sem_registro` | Mantido o texto. Sim: 344; não: 150; total: 494.                                                                                                                                                                      |
| `2272137-249`         | 2021-03-11 18:56:54 | `sem_registro` | `nao`          | Suprimido o texto. Sim: 18; não: 444; total: 462.                                                                                                                                                                     |
| `2272137-253`         | 2021-03-11 19:44:34 | `sim`          | `sim`          | Mantido o texto. Sim: 351; não: 132; total: 483.                                                                                                                                                                      |
| `2272137-254`         | 2021-03-11 20:19:48 | `sim`          | `sim`          | Mantido o texto. Sim: 337; não: 145; abstenção: 1; total: 483.                                                                                                                                                        |
| `2272137-259`         | 2021-03-11 20:52:50 | `nao`          | `nao`          | Suprimido o texto. Sim:24; não: 462; total: 486.                                                                                                                                                                      |
| `2272137-263`         | 2021-03-11 21:29:12 | `sim`          | `sim`          | Mantido o texto. Sim: 338; não: 143; total: 481.                                                                                                                                                                      |
| `2272137-266`         | 2021-03-11 22:34:29 | `sim`          | `sim`          | Mantido o texto. Sim: 352; não: 134; total: 486.                                                                                                                                                                      |
| `2272137-269`         | 2021-03-12 00:01:37 | `sim`          | `sim`          | Mantido o texto. Sim: 356; não: 131; abstenção: 1; total: 488.                                                                                                                                                        |

### MPV 1031/2021

| `external_id_votacao` | Horário             | Aécio Neves    | André Fufuca   | Descrição da votação                                                                                                                                                 |
| --------------------- | ------------------- | -------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `2270789-41`          | 2021-05-19 16:25:33 | `sem_registro` | `sem_registro` | Rejeitado o Requerimento. Sim: 82; não: 310; abstenção: 5; total: 397.                                                                                               |
| `2270789-48`          | 2021-05-19 17:31:16 | `nao`          | `nao`          | Rejeitado o Requerimento. Sim: 68; não: 283; total: 351.                                                                                                             |
| `2270789-61`          | 2021-05-19 19:11:35 | `sim`          | `sim`          | Aprovado o Requerimento. Sim: 314; não: 58; abstenção: 2; total; 374.                                                                                                |
| `2270789-64`          | 2021-05-19 19:50:50 | `sim`          | `sim`          | Aprovado, em apreciação preliminar, o Parecer da Comissão Mista, na parte em que manifesta opinião favorável quanto ao atendimento dos pressupostos constitucionais. |
| `2270789-65`          | 2021-05-19 20:28:29 | `sim`          | `sim`          | Aprovado, em apreciação preliminar, o Parecer da Comissão Mista, na parte em que manifesta opinião pelo não atendimento dos pressupostos constitucionais.            |
| `2270789-68`          | 2021-05-19 20:55:20 | `nao`          | `sem_registro` | Rejeitado o Destaque. Sim: 158; não: 293; total: 451.                                                                                                                |
| `2270789-71`          | 2021-05-19 21:33:47 | `nao`          | `sem_registro` | Rejeitado o Destaque. Sim: 178; não: 271; abstenção:1; total: 450.                                                                                                   |
| `2270789-76`          | 2021-05-19 22:29:20 | `sem_registro` | `sem_registro` | Rejeitada a Emenda n° 11. Sim: 60; não: 406; total: 466.                                                                                                             |
| `2270789-79`          | 2021-05-19 22:39:05 | `sem_registro` | `sem_registro` | Mantido o texto. Sim: 297; não: 157; abstenção: 3; total: 457.                                                                                                       |
| `2270789-85`          | 2021-05-19 22:53:50 | `sem_registro` | `nao`          | Rejeitada a Emenda n° 1. Sim: 141; não: 316; total: 457.                                                                                                             |
| `2270789-88`          | 2021-05-19 23:09:32 | `sem_registro` | `sim`          | Mantido o texto. Sim: 330; não: 135; total: 465.                                                                                                                     |
| `2270789-91`          | 2021-05-19 23:23:27 | `sem_registro` | `nao`          | Rejeitada a Emenda n° 85.Sim: 140; não: 332; total: 472.                                                                                                             |
| `2270789-94`          | 2021-05-19 23:41:59 | `sem_registro` | `sim`          | Mantido o texto. Sim: 345; não: 130; total: 475.                                                                                                                     |
| `2270789-97`          | 2021-05-19 23:49:39 | `sim`          | `sim`          | Mantido o texto. Sim: 333; não: 127; total: 460.                                                                                                                     |
| `2270789-100`         | 2021-05-20 00:04:10 | `sim`          | `sim`          | Mantido o texto. Sim: 328; não: 128; total: 456.                                                                                                                     |
| `2270789-103`         | 2021-05-20 00:17:27 | `nao`          | `nao`          | Rejeitada a Emenda n° 369. Sim: 133; não: 139; abstenção: 3; total: 275.                                                                                             |
| `2270789-106`         | 2021-05-20 00:31:43 | `sem_registro` | `nao`          | Rejeitada a Emenda n° 87. Sim: 158; não: 286; total: 444.                                                                                                            |
| `2270789-144`         | 2021-06-21 16:06:51 | `nao`          | `nao`          | Rejeitado o Requerimento. Sim: 168; não: 265; total: 433.                                                                                                            |
| `2270789-150`         | 2021-06-21 16:34:52 | `nao`          | `sem_registro` | Rejeitado o Requerimento. Sim: 173; não: 252; total: 425.                                                                                                            |
| `2270789-157`         | 2021-06-21 18:32:37 | `sim`          | `sem_registro` | Aprovadas as Emendas do Senado Federal nºs 1, 2, 4, 6, 7, 9 a 11, 13 a 15, 17 a 20, 22, 23, 25 a 28.                                                                 |
| `2270789-158`         | 2021-06-21 18:49:43 | `nao`          | `nao`          | Rejeitadas as Emendas do Senado Federal nºs 5, 8,16, 21, 24 e partes das Emendas nº 3 e nº 12.                                                                       |
| `2270789-169`         | 2021-06-21 19:11:55 | `sim`          | `sim`          | Aprovada a Emenda do Senado Federal n° 1. Sim: 245; não: 174; abestenção: 5; total: 424.                                                                             |
| `2270789-170`         | 2021-06-21 19:13:17 | `sim`          | `sim`          | Aprovado o Requerimento. Sim: 274; não 155; abstenção: 3; total: 432.                                                                                                |
| `2270789-176`         | 2021-06-21 19:32:27 | `sem_registro` | `sim`          | Aprovado o parágrafo sexto contido no artigo primeiro da Emenda do Senado nº 1. Sim: 273; não: 158; abstenção: 3; total: 434.                                        |
| `2270789-179`         | 2021-06-21 19:55:10 | `sem_registro` | `sim`          | Aprovada a Emenda do Senado Federal n° 2. Sim: 292; não: 151; abstenção: 3; total: 446.                                                                              |
| `2270789-187`         | 2021-06-21 20:16:38 | `nao`          | `nao`          | Rejeitada a Emenda do Senado Federal nº 8. Sim: 162; não: 278; abestenção: 4; total: 444.                                                                            |
| `2270789-191`         | 2021-06-21 20:32:11 | `sim`          | `sem_registro` | Aprovada a Emenda do Senado Federal nº 15. Sim: 296; não: 142; abstenção: 3; total: 441.                                                                             |
| `2270789-194`         | 2021-06-21 20:48:15 | `sim`          | `sim`          | Aprovada a Emenda do Senado nº 28. Sim: 278; não: 172; abstenção: 3; total: 453.                                                                                     |

### PLP 112/2021

| `external_id_votacao` | Horário             | Aécio Neves    | André Fufuca   | Descrição da votação                                                                                  |
| --------------------- | ------------------- | -------------- | -------------- | ----------------------------------------------------------------------------------------------------- |
| `2294403-10`          | 2021-08-31 16:40:47 | `sim`          | `sem_registro` | Aprovado o Requerimento de Urgência (Art. 155 do RICD). Sim: 322; não: 139; abstenção: 1; total: 462. |
| `2292163-29`          | 2021-09-02 19:07:01 | `nao`          | `nao`          | Rejeitado o Requerimento. Sim: 118; não: 324; total: 442.                                             |
| `2292163-35`          | 2021-09-02 19:37:52 | `sem_registro` | `sem_registro` | Rejeitado o Requerimento. Sim: 119; não: 294; abstenção: 1; total: 414.                               |
| `2292163-66`          | 2021-09-09 15:15:40 | `sem_registro` | `sem_registro` | Rejeitado o Requerimento. Sim: 65; não: 365; abstenção: 1; total: 431.                                |
| `2292163-77`          | 2021-09-09 16:28:06 | `sem_registro` | `nao`          | Suprimido o texto. Sim: 138; não: 304; abstenção: 3; total: 445.                                      |
| `2292163-81`          | 2021-09-09 16:44:28 | `sem_registro` | `sem_registro` | Aprovada a Emenda de Plenário n° 100. Sim: 287; não: 141; abstenção: 3; total: 431.                   |
| `2292163-85`          | 2021-09-09 17:03:06 | `sem_registro` | `sem_registro` | Mantido o texto. Sim: 401; não: 38; abstenção: 2; total: 441.                                         |
| `2292163-88`          | 2021-09-09 17:20:25 | `sem_registro` | `nao`          | Rejeitada a Emenda de Plenário n° 40. Sim: 171; não: 253; abstenção: 3; total: 427.                   |
| `2292163-92`          | 2021-09-09 17:35:40 | `sem_registro` | `sem_registro` | Rejeitada a Emenda de Plenário n° 50. Sim: 183; não: 240; abstenção: 2; total:425.                    |
| `2292163-97`          | 2021-09-09 17:55:55 | `sem_registro` | `sem_registro` | Suprimido o texto. Sim: 254; não: 170; abstenção: 3; total: 427.                                      |
| `2292163-98`          | 2021-09-09 18:11:24 | `sim`          | `sem_registro` | Aprovada a Emenda de Plenário n° 36. Sim: 257; não: 179; abstenção: 2; total: 438.                    |
| `2292163-103`         | 2021-09-09 19:21:53 | `sim`          | `sem_registro` | Suprimido o texto. Sim: 52; não: 405; abstenção: 4; total: 461.                                       |
| `2292163-104`         | 2021-09-09 19:39:52 | `nao`          | `sem_registro` | Suprimido o texto. Sim: 14; não: 411; abstenção: 1; total: 426.                                       |
| `2292163-122`         | 2021-09-15 19:59:49 | `nao`          | `nao`          | Rejeitado o requerimento. Sim: 129; não: 320; total: 449.                                             |
| `2292163-125`         | 2021-09-15 21:01:41 | `sim`          | `sim`          | Aprovada a Emenda Aglutinativa nº 2. Sim: 273; não: 211; abstenção: 3; total: 487.                    |
| `2292163-130`         | 2021-09-15 21:13:44 | `sem_registro` | `sem_registro` | Rejeitada a Emenda de Plenário nº 53. Sim: 42; não: 381; abstenção: 1; total: 424.                    |
| `2292163-131`         | 2021-09-15 21:33:24 | `sim`          | `sim`          | Mantido o texto. Sim: 401; não: 40; abstenção: 2; total: 443.                                         |
| `2292163-137`         | 2021-09-15 21:48:32 | `nao`          | `sim`          | Rejeitada a Emenda de Plenário nº 68. Sim: 194; não: 254; abstenção: 3; total: 451.                   |
| `2292163-139`         | 2021-09-15 22:04:51 | `sem_registro` | `nao`          | Rejeitada a Emenda de Plenário nº 25. Sim: 222; não: 221; abstenção: 1; total: 444.                   |
| `2292163-142`         | 2021-09-15 22:16:31 | `sem_registro` | `nao`          | Rejeitada a Emenda de Plenário nº 27. Sim: 52; não: 381; abstenção: 2; total: 435.                    |
| `2292163-145`         | 2021-09-15 22:32:26 | `nao`          | `sim`          | Mantido o texto. Sim: 331; não: 111; abstenção: 2; total; 444.                                        |
| `2292163-148`         | 2021-09-15 22:35:33 | `sem_registro` | `sim`          | Mantido o texto. Sim: 297; não: 8; abstenção: 2; total: 307.                                          |
| `2292163-151`         | 2021-09-15 22:55:04 | `sim`          | `sem_registro` | Rejeitada a Emenda de Plenário nº 64. Sim: 159; não: 283; abstenção: 1; total: 443.                   |
| `2292163-154`         | 2021-09-15 23:34:32 | `sim`          | `nao`          | Aprovada a Emenda de Plenário nº 45. Sim: 309; não: 166; abstenção: 1; total: 476.                    |
| `2292163-157`         | 2021-09-15 23:50:31 | `sim`          | `nao`          | Suprimido o texto. Sim: 167; não: 276; abstenção: 1; total: 444.                                      |
| `2292163-167`         | 2021-09-16 00:09:12 | `sim`          | `sim`          | Mantido o texto. Sim: 355; não: 92; abstenção: 3; total: 450.                                         |
| `2292163-182`         | 2021-09-16 00:17:12 | `nao`          | `sem_registro` | Rejeitada a Emenda de Plenário nº 2. Sim: 26; não: 386; abstenção: 2; total: 414.                     |
| `2292163-188`         | 2021-09-16 00:27:07 | `sim`          | `sem_registro` | Aprovadas as Emendas de Redação nºs 1, 2, 3 e 5. Sim: 428; não: 3; abstenção: 3; total: 434.          |

### PL 4199/2020

| `external_id_votacao` | Horário             | Aécio Neves    | André Fufuca   | Descrição da votação                                                                                                                          |
| --------------------- | ------------------- | -------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `2260433-53`          | 2020-12-07 16:17:51 | `nao`          | `sem_registro` | Rejeitado o Requerimento. Sim: 5; não: 283; total: 288.                                                                                       |
| `2260433-58`          | 2020-12-07 17:09:43 | `sem_registro` | `sem_registro` | Rejeitado o Requerimento. Sim: 3; não: 259; total: 262.                                                                                       |
| `2260433-64`          | 2020-12-07 17:31:33 | `sem_registro` | `sem_registro` | Rejeitado o Requerimento. Sim: 6; não: 266; total: 272.                                                                                       |
| `2260433-76`          | 2020-12-07 19:21:14 | `sem_registro` | `sem_registro` | Rejeitado o Requerimento. Sim: 5; não: 287; total: 292.                                                                                       |
| `2260433-81`          | 2020-12-07 19:44:09 | `sem_registro` | `sem_registro` | Rejeitado o Requerimento. Sim: 3; não: 307; total: 310.                                                                                       |
| `2260433-83`          | 2020-12-07 20:11:49 | `sem_registro` | `sem_registro` | Rejeitado o Requerimento. Sim: 5; não: 291; total: 296.                                                                                       |
| `2260433-87`          | 2020-12-07 20:28:05 | `sem_registro` | `sem_registro` | Aprovado o Requerimento. Sim: 269; não: 2; total: 271.                                                                                        |
| `2260433-92`          | 2020-12-07 20:43:56 | `sem_registro` | `nao`          | Rejeitada a admissibilidade dos destaques simples. Em consequência, ficam prejudicados os referidos destaques. Sim: 12; não: 266; total: 278. |
| `2260433-104`         | 2020-12-07 21:24:32 | `sem_registro` | `sem_registro` | Rejeitado o Requerimento. Sim: 2; não: 269; total: 271.                                                                                       |
| `2260433-108`         | 2020-12-07 21:43:26 | `sem_registro` | `sem_registro` | Rejeitada a Emenda n° 116. Sim:114; não: 307; total 421.                                                                                      |
| `2260433-116`         | 2020-12-07 21:55:11 | `sem_registro` | `sem_registro` | Mantido o texto. Sim: 275; não: 116; abstenção: 1; total: 392.                                                                                |
| `2260433-124`         | 2020-12-07 22:38:01 | `sem_registro` | `sem_registro` | Rejeitada a Emenda n° 64. Sim: 119; não: 323; total:442.                                                                                      |
| `2260433-129`         | 2020-12-07 23:03:30 | `sem_registro` | `sem_registro` | Mantido o texto. Sim: 306; não: 124; abstenção: 1; total: 431.                                                                                |
| `2260433-136`         | 2020-12-07 23:25:33 | `sem_registro` | `sem_registro` | Mantido o texto. Sim: 239; não: 161; abstenção: 1; total: 401.                                                                                |
| `2260433-145`         | 2020-12-07 23:44:00 | `sem_registro` | `sem_registro` | Mantido o texto. Sim: 226; não: 149; abstenção: 1; total: 376.                                                                                |
| `2260433-156`         | 2020-12-08 00:33:16 | `sem_registro` | `sem_registro` | Mantido o texto. Sim: 192; não: 157; abstenção: 2; total: 351.                                                                                |
| `2260433-162`         | 2020-12-08 00:57:13 | `sem_registro` | `sem_registro` | Mantido o texto. Sim: 244; não: 107; abstenção: 1; total: 352.                                                                                |
| `2260433-167`         | 2020-12-08 01:35:24 | `sem_registro` | `sem_registro` | Rejeitada a Emenda. Sim: 30; Não: 224; Abstenção: 2; Total: 256.                                                                              |
| `2260433-176`         | 2020-12-08 02:09:12 | `sem_registro` | `sem_registro` | Aprovada a Emenda. Sim: 233; Não: 19; Abstenção: 5; Total: 257.                                                                               |
| `2260433-194`         | 2020-12-08 15:14:01 | `sem_registro` | `sem_registro` | Rejeitado o Requerimento. Sim: 36; não: 309; total: 345.                                                                                      |
| `2260433-198`         | 2020-12-08 15:38:02 | `nao`          | `sem_registro` | Rejeitada a Emenda de Plenário n° 114. Sim: 108; não: 295; abstenção: 1; total: 404.                                                          |
| `2260433-200`         | 2020-12-08 16:00:16 | `nao`          | `sem_registro` | Suprimido o texto. Sim 153 não: 262; abstenções: 2; total: 417.                                                                               |
| `2260433-204`         | 2020-12-08 16:19:40 | `sem_registro` | `sem_registro` | Suprimido o texto. Sim 149; não: 247; total: 396.                                                                                             |
| `2260433-210`         | 2020-12-08 16:43:07 | `sim`          | `sim`          | Mantido o texto. Sim 313; não: 128; abstenção: 1; total: 442.                                                                                 |
| `2260433-305`         | 2021-12-15 13:59:59 | `sem_registro` | `sem_registro` | Rejeitado o Requerimento. Sim: 11; não: 314; total: 325.                                                                                      |
| `2260433-312`         | 2021-12-15 14:46:32 | `sim`          | `sem_registro` | Aprovadas as Emendas do Senado Federal ao Projeto de Lei nº 4.199, de 2020. Sim: 384; não: 19; total: 403.                                    |
| `2260433-329`         | 2021-12-15 15:11:18 | `nao`          | `sem_registro` | Rejeitada a Emenda do Senado Federal nº 8. Sim: 82; não: 252; total: 334.                                                                     |
| `2260433-338`         | 2021-12-15 15:16:57 | `nao`          | `sem_registro` | Rejeitada a Emenda do Senado Federal nº 11. Sim: 98; não: 228; 326.                                                                           |

### PL 2159/2021

| `external_id_votacao` | Horário             | Aécio Neves    | André Fufuca   | Descrição da votação                                                                                           |
| --------------------- | ------------------- | -------------- | -------------- | -------------------------------------------------------------------------------------------------------------- |
| `257161-294`          | 2021-05-12 18:35:41 | `sem_registro` | `nao`          | Rejeitado o Requerimento. Sim: 21; não: 322; abstenção: 2; total: 345.                                         |
| `257161-303`          | 2021-05-12 20:08:03 | `nao`          | `sem_registro` | Rejeitado o Requerimento. Sim: 15; não: 320; abstenção: 1; total: 336.                                         |
| `257161-309`          | 2021-05-12 21:29:39 | `sim`          | `sim`          | Aprovado o Requerimento. Sim: 343; não: 19; abstenção: 2; total: 364.                                          |
| `257161-323`          | 2021-05-12 22:06:04 | `sem_registro` | `nao`          | Rejeitado o Requerimento. Sim: 13; não: 338; abstenção: 1; total: 352.                                         |
| `257161-328`          | 2021-05-12 22:28:34 | `sem_registro` | `sem_registro` | Rejeitado o Requerimento. Sim: 15; não: 306; abstenção: 1; total: 322.                                         |
| `257161-331`          | 2021-05-12 22:54:09 | `sem_registro` | `sem_registro` | Rejeitado o Requerimento. Sim: 10; não: 300; total: 310.                                                       |
| `257161-335`          | 2021-05-12 23:25:24 | `sem_registro` | `sem_registro` | Rejeitado o Destaque de Preferência. Sim: 93; não: 251; abstenção: 1; total: 345.                              |
| `257161-346`          | 2021-05-13 10:54:12 | `sem_registro` | `sem_registro` | Rejeitado o Requerimento. Sim: 16; não: 301; abstenção: 1; total: 318.                                         |
| `257161-358`          | 2021-05-13 11:39:35 | `sim`          | `sem_registro` | Mantido o texto. Sim: 258; não: 119; total: 377.                                                               |
| `257161-363`          | 2021-05-13 12:18:32 | `sem_registro` | `nao`          | Rejeitada a Emenda de Plenário nº 19. Sim: 140; não: 298; total: 438.                                          |
| `257161-367`          | 2021-05-13 12:49:48 | `nao`          | `nao`          | Rejeitada a Emenda de Plenário nº 64. Sim: 126; não: 297; total: 423.                                          |
| `257161-371`          | 2021-05-13 13:51:28 | `sem_registro` | `sem_registro` | Rejeitada a Emenda de Plenário nº 59. Sim: 124; não: 287; total: 411.                                          |
| `257161-374`          | 2021-05-13 14:22:08 | `sim`          | `sem_registro` | Mantido o texto. Sim: 297; não: 131; total: 428.                                                               |
| `257161-380`          | 2021-05-13 14:50:15 | `nao`          | `sem_registro` | Rejeitada a Emenda de Plenário nº 46. Sim: 135; não: 307; abstenção: 1; total: 443.                            |
| `257161-383`          | 2021-05-13 15:12:49 | `nao`          | `sem_registro` | Rejeitada a Emenda de Plenário nº 87. Sim: 112; não: 289; total: 401.                                          |
| `257161-386`          | 2021-05-13 16:07:37 | `sem_registro` | `sim`          | Aprovada a Redação Final assinada pelo Relator, Dep. Dep. Neri Geller (PP-MT). Sim: 290; não: 115; total: 405. |
| `257161-442`          | 2025-07-17 00:12:46 | `sem_registro` | `sem_registro` | Rejeitado o Requerimento. Sim: 124; Não: 269; Total: 393.                                                      |
| `257161-446`          | 2025-07-17 00:39:49 | `sem_registro` | `sem_registro` | Rejeitado o Requerimento. Sim: 119; Não: 273; Total: 392.                                                      |
| `257161-450`          | 2025-07-17 01:36:36 | `sem_registro` | `sem_registro` | Aprovado o Requerimento. Sim: 256; Não: 109; Total: 365.                                                       |
| `257161-454`          | 2025-07-17 01:53:52 | `sem_registro` | `sem_registro` | Aprovadas. Sim: 267; Não: 116; Total: 383.                                                                     |
| `257161-462`          | 2025-07-17 02:21:29 | `sem_registro` | `sem_registro` | Aprovada a Emenda do Senado Federal nº 1. Sim: 242; Não: 117; Total: 359.                                      |
| `257161-465`          | 2025-07-17 02:32:05 | `sem_registro` | `sem_registro` | Aprovada a Emenda do Senado Federal nº 3. Sim: 232; Não: 104; Total: 336.                                      |
| `257161-467`          | 2025-07-17 02:51:13 | `sem_registro` | `sem_registro` | Aprovada a Emenda do Senado Federal nº 4. Sim: 234; Não: 101; Total: 335.                                      |
| `257161-476`          | 2025-07-17 03:11:13 | `sem_registro` | `sem_registro` | Aprovada a Emenda do Senado Federal nº 18. Sim: 221; Não: 77; Abstenção: 1; Total: 299.                        |
| `257161-479`          | 2025-07-17 03:27:34 | `sem_registro` | `sem_registro` | Aprovada a Emenda do Senado nº 28. Sim: 229; Não: 82; Abstenção: 1; Total: 312.                                |
| `257161-483`          | 2025-07-17 03:37:38 | `sem_registro` | `sem_registro` | Aprovada a Redação Final assinada pelo Relator, Dep. Zé Vitor (PL-MG). Sim: 231; Não: 87; Total: 318.          |

## Evidência por deputado

### Aécio Neves — 74646

Estava em exercício nas cinco votações. O evento base em todas elas é `Entrada - Posse de Eleito Titular - Posse na Sessão Preparatória`, em 2019-02-01 11:45, sem fechamento antes das datas consultadas.

Partido vigente: PSDB.

### Coronel Telhada — 222142

Não estava em exercício em nenhuma das cinco votações. Não há evento efetivo anterior às datas de 2020 e 2021; sua linha do tempo começa na legislatura 57, em 2023.

### André Fufuca — 178882

Estava em exercício nas cinco votações. O evento base em todas elas é `Entrada - Posse de Eleito Titular - Posse na Sessão Preparatória`, em 2019-02-01 11:45, sem licença antes das datas analisadas.

Partido vigente: PP.

### Schiavinato — 204399

Estava em exercício nas votações anteriores à vacância por falecimento:

| Votação                   | Resultado |
| ------------------------- | --------- |
| PL 4199/2020, 2020-12-07  | Sim       |
| PEC 186/2019, 2021-03-11  | Sim       |
| PL 2159/2021, 2021-05-13  | Não       |
| MPV 1031/2021, 2021-05-19 | Não       |
| PLP 112/2021, 2021-09-09  | Não       |

Evento de fechamento: `Saída - Afastamento definitivo - Falecimento`, em 2021-04-13 21:10.

### Flordelis — 204447

Estava em exercício nas votações anteriores à perda de mandato e fora de exercício na votação posterior:

| Votação                   | Resultado |
| ------------------------- | --------- |
| PL 4199/2020, 2020-12-07  | Sim       |
| PEC 186/2019, 2021-03-11  | Sim       |
| PL 2159/2021, 2021-05-13  | Sim       |
| MPV 1031/2021, 2021-05-19 | Sim       |
| PLP 112/2021, 2021-09-09  | Não       |

Evento de fechamento: `Saída - Afastamento definitivo - Perda de Mandato por Resolução`, em 2021-08-12 00:00.

### Alexandre Serfiotis — 178833

Estava em exercício apenas na votação anterior à renúncia:

| Votação                   | Resultado |
| ------------------------- | --------- |
| PL 4199/2020, 2020-12-07  | Sim       |
| PEC 186/2019, 2021-03-11  | Não       |
| PL 2159/2021, 2021-05-13  | Não       |
| MPV 1031/2021, 2021-05-19 | Não       |
| PLP 112/2021, 2021-09-09  | Não       |

Evento de fechamento: `Saída - Afastamento definitivo - Renúncia`, em 2021-01-01 00:00.

### Sérgio Brito — 73808

Estava em exercício nas cinco votações. O evento base em todas elas é `Entrada - Reassunção`, em 2019-10-02 11:06, depois de licença em 2019 e antes do fim da legislatura 56.

Partido vigente: PSD.

### Chico Alencar — 74171

Não estava em exercício em nenhuma das cinco votações. O último evento efetivo anterior às datas analisadas é `Saída - Afastamento definitivo - Término da Legislatura`, em 2019-01-31 23:59. O próximo evento de entrada só aparece em 2023-02-01 12:05.

## Conclusão

Para esse recorte, `deputado_historico` sozinho responde se o deputado estava em exercício. `votacao_votos` complementa a análise com o voto individual quando há registro.

O cruzamento mostra três situações distintas:

- deputado fora de exercício e sem registro de voto: esperado, fora do denominador do matcher;
- deputado em exercício com voto registrado: voto computável;
- deputado em exercício sem registro em `votacao_votos`: ausência sem motivo conhecido para o matcher, conforme ADR 0008.

Os casos mais úteis para validar a regra são:

- vacância entre votações próximas: Schiavinato e Flordelis;
- renúncia antes de quase todas as top 5: Alexandre Serfiotis;
- hiato entre mandatos: Chico Alencar;
- ausência completa de mandato na época da votação: Coronel Telhada;
- exercício contínuo no período: Aécio Neves, André Fufuca e Sérgio Brito.
