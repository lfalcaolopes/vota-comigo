# Linhas do tempo de `deputado_historico`

Consulta exploratória feita no banco local em 2026-06-08 para entender como traduzir registros de `deputado_historico` em informação utilizável: intervalos de exercício, afastamentos, suplência, vacância, partido no tempo e motivo público do estado.

Deputados analisados:

| Deputado            | `external_id_deputado` |
| ------------------- | ---------------------: |
| Aécio Neves         |                  74646 |
| Coronel Telhada     |                 222142 |
| André Fufuca        |                 178882 |
| Schiavinato         |                 204399 |
| Flordelis           |                 204447 |
| Alexandre Serfiotis |                 178833 |
| Sérgio Brito        |                  73808 |
| Chico Alencar       |                  74171 |

Os horários abaixo são os valores persistidos em `data_hora` exibidos em UTC.

## Campos usados

| Campo                | Uso na tradução                                                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data_hora`          | Instante do evento. Ordena a linha do tempo e vira limite inicial ou final de um estado derivado.                                                                          |
| `legislatura_id`     | Separa eventos por legislatura e identifica âncoras de início/fim.                                                                                                         |
| `situacao`           | Sinal principal do estado bruto, mas não é suficiente sozinha. Valores observados: `Exercício`, `Convocado`, `Suplência`, `Licença`, `Fim de Mandato`, `Vacância`, `null`. |
| `condicao_eleitoral` | Distingue `Titular` e `Suplente`. Não decide exercício sozinho.                                                                                                            |
| `descricao_status`   | Campo mais rico para detectar transição (`Entrada`, `Saída`), evento administrativo, mudança de partido e motivo do afastamento. Deve ser usado junto de `situacao`.       |
| `partido_id`         | Snapshot do partido naquele evento. Mudanças de partido aparecem como eventos próprios e devem atualizar o partido vigente sem abrir ou fechar exercício.                  |
| `sigla_uf`           | Snapshot da UF representada. Nestes casos não houve mudança de UF dentro do mesmo deputado.                                                                                |

## Regras de tradução inferidas

1. Um intervalo de exercício abre quando qualquer segmento de `descricao_status` começa com `Entrada -`, ou quando `situacao = 'Exercício'` em registro de posse/início de legislatura.
2. Um intervalo de exercício fecha quando `descricao_status` tem segmento `Saída -`, ou quando `situacao` é `Suplência`, `Licença`, `Fim de Mandato` ou `Vacância`.
3. `Convocado` não abre exercício. Ele representa preparação para posse/reassunção, salvo quando a própria `descricao_status` também contém um segmento `Entrada -`.
4. `descricao_status = 'Alteração de partido'` não muda o estado de exercício; atualiza apenas o partido vigente. Isso vale inclusive quando `situacao = 'Licença'`.
5. Registros com `situacao = null` e `descricao_status` começando por `Nome no início da legislatura / Partido no início da legislatura` são âncoras administrativas. Eles não abrem exercício.
6. Registros legados com `descricao_status = 'Situação e condição ao fim da legislatura (dados legados)'` fecham o intervalo da legislatura mesmo quando `situacao = 'Exercício'`. Nesses casos, `situacao` descreve a condição no fim, não uma nova entrada.
7. Quando há eventos no mesmo `data_hora`, eventos administrativos como `Diverso - Convocação...` não devem sobrescrever uma `Entrada -` no mesmo instante. A transição efetiva deve preferir `Entrada -` ou `Saída -`.
8. Se o último evento efetivo é uma entrada e não há fechamento posterior no banco, o intervalo fica aberto no snapshot consultado.

## Transição entre padrões antigos e atuais

No banco local, a transição estrutural acontece na legislatura 52, iniciada em 2003-02-01.

| Faixa                                            | Padrão observado                                                                                                                                                                                            |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Legislaturas 40 a 51, até 2003-01-31             | Padrão legado dominante. Não há `Entrada -` nem `Saída -`; os registros usam descrições como `Primeira posse na legislatura (dados legados)` e `Situação e condição ao fim da legislatura (dados legados)`. |
| Legislaturas 52 a 54, de 2003-02-01 a 2015-01-31 | Padrão estruturado já aparece como regra: `Entrada -`, `Saída -`, `Alteração de partido` e motivos mais específicos. Alguns registros combinam snapshot inicial e entrada na mesma `descricao_status`.      |
| Legislaturas 55 em diante, desde 2015-02-01      | Padrão atual mais granular. O snapshot inicial de nome/partido frequentemente aparece como evento separado com `situacao = null`, seguido de entrada efetiva com hora exata.                                |

Ainda existem exceções pontuais com `dados legados` depois da legislatura 52, mas elas aparecem como registros residuais de fim de legislatura, não como o padrão principal: quatro eventos na legislatura 55 e três na legislatura 56 nesta base. Por isso a regra não deve usar apenas a data ou a legislatura; ela deve reconhecer os textos legados quando aparecerem.

## Situações utilizáveis

| Situação derivada     | Como reconhecer                                                                                                | Consequência para "em exercício" |
| --------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Em exercício          | Entrada/posse/reassunção ou `situacao = 'Exercício'` em início de legislatura, preservando mudanças de partido | Sim                              |
| Licença               | `situacao = 'Licença'` ou saída cujo motivo é licença/cargo executivo                                          | Não                              |
| Suplência             | `situacao = 'Suplência'` ou saída por afastamento de suplente                                                  | Não                              |
| Fim de mandato        | `situacao = 'Fim de Mandato'` ou saída por término da legislatura                                              | Não                              |
| Vacância              | `situacao = 'Vacância'`, normalmente por falecimento, renúncia ou perda de mandato                             | Não                              |
| Convocado             | `situacao = 'Convocado'` sem segmento `Entrada -`                                                              | Não                              |
| Âncora administrativa | `situacao = null` com snapshot de nome/partido                                                                 | Não altera estado                |
| Mudança de partido    | `descricao_status = 'Alteração de partido'`                                                                    | Não altera estado                |

## Aécio Neves — 74646

Padrão: titular com legislaturas antigas em formato legado, mandato recente com eventos detalhados e intervalo aberto na legislatura 57.

| De               | Até              | Estado derivado       | Partido | Lógica                                                                                                     |
| ---------------- | ---------------- | --------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| 1987-02-01 00:00 | 1991-01-31 23:59 | Em exercício, titular | PMDB    | `situacao = Exercício` e descrição legada de primeira posse abrem; `Vacância` no fim da legislatura fecha. |
| 1991-02-01 00:00 | 1995-01-31 23:59 | Em exercício, titular | PSDB    | Mesmo padrão legado; início com `Exercício`, fim com `Vacância`.                                           |
| 1995-02-01 00:00 | 1999-01-31 23:59 | Em exercício, titular | PSDB    | Mesmo padrão legado.                                                                                       |
| 1999-02-01 00:00 | 2003-01-31 23:59 | Em exercício, titular | PSDB    | Mesmo padrão legado.                                                                                       |
| 2019-02-01 00:00 | 2019-02-01 11:45 | Âncora administrativa | PSDB    | `situacao = null`; snapshot de nome/partido não abre exercício.                                            |
| 2019-02-01 11:45 | 2023-01-31 23:59 | Em exercício, titular | PSDB    | `Entrada - Posse de Eleito Titular`; fecha por `Saída - ... Término da Legislatura` com `Fim de Mandato`.  |
| 2023-02-01 00:00 | 2023-02-01 12:05 | Âncora administrativa | PSDB    | Snapshot inicial da legislatura 57.                                                                        |
| 2023-02-01 12:05 | Aberto no banco  | Em exercício, titular | PSDB    | Último evento efetivo é `Entrada - Posse de Eleito Titular`.                                               |

## Coronel Telhada — 222142

Padrão: suplente intermitente. `Convocado` aparece antes de entradas, mas não conta como exercício. Há uma inconsistência relevante em 2024-03-25: `situacao = Convocado`, porém `descricao_status` contém `Entrada - Reassunção`; a descrição deve abrir o intervalo.

| De               | Até              | Estado derivado        | Partido | Lógica                                                                                                  |
| ---------------- | ---------------- | ---------------------- | ------- | ------------------------------------------------------------------------------------------------------- |
| 2023-02-01 00:00 | 2023-02-07 18:21 | Âncora administrativa  | PP      | Snapshot inicial; sem exercício.                                                                        |
| 2023-02-07 18:21 | 2023-02-08 14:05 | Convocado, suplente    | PP      | Eventos `Diverso - Convocação...`; aguardando posse, ainda fora de exercício.                           |
| 2023-02-08 14:05 | 2023-04-27 12:53 | Em exercício, suplente | PP      | `Entrada - Posse de Suplente`; fecha por `Suplência` e `Saída - ... Afastamento de Suplente`.           |
| 2023-04-28 16:44 | 2023-04-28 16:54 | Convocado, suplente    | PP      | Convocação sem entrada até 16:54.                                                                       |
| 2023-04-28 16:54 | 2023-08-03 16:46 | Em exercício, suplente | PP      | `Entrada - Reassunção`; fecha por `Suplência`.                                                          |
| 2023-08-04 15:30 | 2023-08-04 15:31 | Convocado, suplente    | PP      | Convocação; no mesmo minuto há outro evento de convocação e uma entrada.                                |
| 2023-08-04 15:31 | 2024-03-22 12:25 | Em exercício, suplente | PP      | `Entrada - Reassunção`; evento administrativo no mesmo `data_hora` não deve sobrescrever a entrada.     |
| 2024-03-25 16:50 | 2024-03-25 17:03 | Convocado, suplente    | PP      | Convocação sem entrada.                                                                                 |
| 2024-03-25 17:03 | 2024-08-01 15:50 | Em exercício, suplente | PP      | `descricao_status` contém `Entrada - Reassunção` apesar de `situacao = Convocado`; a entrada prevalece. |
| 2024-08-01 15:50 | Aberto no banco  | Suplência, suplente    | PP      | Último evento efetivo é `Saída - ... Afastamento de Suplente` com `situacao = Suplência`.               |

## André Fufuca — 178882

Padrão: titular com mudança de partido na legislatura 55, licença curta em 2016 e múltiplas licenças como Ministro de Estado na legislatura 57.

| De               | Até              | Estado derivado                             | Partido | Lógica                                                                                                              |
| ---------------- | ---------------- | ------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| 2015-02-01 00:00 | 2015-02-01 10:00 | Âncora administrativa                       | PEN     | Snapshot inicial; sem exercício até a posse.                                                                        |
| 2015-02-01 10:00 | 2016-03-17 10:54 | Em exercício, titular                       | PEN     | `Entrada - Posse de Eleito Titular`.                                                                                |
| 2016-03-17 10:54 | 2016-06-20 11:47 | Em exercício, titular                       | PP\*\*  | `Alteração de partido`; estado continua em exercício.                                                               |
| 2016-06-20 11:47 | 2016-10-19 00:00 | Licença, titular                            | PP\*\*  | `Licença` e `Saída - Afastamento com prazo determinado`; motivo: LTS por 1 dia e interesse particular por 120 dias. |
| 2016-10-19 00:00 | 2018-12-11 10:29 | Em exercício, titular                       | PP\*\*  | `Entrada - Reassunção`.                                                                                             |
| 2018-12-11 10:29 | 2019-01-31 23:59 | Em exercício, titular                       | PP      | `Alteração de partido`; estado continua em exercício.                                                               |
| 2019-01-31 23:59 | 2019-02-01 11:45 | Fim de mandato / âncora da nova legislatura | PP      | `Fim de Mandato` fecha a legislatura 55; snapshot de 2019-02-01 00:00 não reabre.                                   |
| 2019-02-01 11:45 | 2023-01-31 23:59 | Em exercício, titular                       | PP      | Posse na legislatura 56; fecha por término da legislatura.                                                          |
| 2023-02-01 00:00 | 2023-02-01 12:05 | Âncora administrativa                       | PP      | Snapshot inicial da legislatura 57.                                                                                 |
| 2023-02-01 12:05 | 2023-09-13 14:53 | Em exercício, titular                       | PP      | Posse como eleito titular.                                                                                          |
| 2023-09-13 14:53 | 2024-12-03 10:11 | Licença, titular                            | PP      | `Saída - Afastamento sem prazo determinado - Ministro de Estado`.                                                   |
| 2024-12-03 10:11 | 2024-12-06 17:00 | Em exercício, titular                       | PP      | `Entrada - Reassunção`; intervalo curto antes de nova licença.                                                      |
| 2024-12-06 17:00 | 2025-02-01 08:38 | Licença, titular                            | PP      | Saída por Ministro de Estado.                                                                                       |
| 2025-02-01 08:38 | 2025-02-03 11:24 | Em exercício, titular                       | PP      | Reassunção curta.                                                                                                   |
| 2025-02-03 11:24 | 2025-10-08 18:56 | Licença, titular                            | PP      | Saída por Ministro de Estado; descrição inclui ofício.                                                              |
| 2025-10-08 18:56 | 2025-10-09 11:03 | Em exercício, titular                       | PP      | Reassunção curta.                                                                                                   |
| 2025-10-09 11:03 | 2025-11-13 10:10 | Licença, titular                            | PP      | Saída por Ministro de Estado.                                                                                       |
| 2025-11-13 10:10 | 2025-11-15 13:00 | Em exercício, titular                       | PP      | Reassunção curta.                                                                                                   |
| 2025-11-15 13:00 | 2026-03-31 15:28 | Licença, titular                            | PP      | Saída por Ministro de Estado; descrição inclui ofício.                                                              |
| 2026-03-31 15:28 | Aberto no banco  | Em exercício, titular                       | PP      | Último evento efetivo é `Entrada - Reassunção`.                                                                     |

## Schiavinato — 204399

Padrão: titular com vacância por falecimento.

| De               | Até              | Estado derivado          | Partido | Lógica                                                       |
| ---------------- | ---------------- | ------------------------ | ------- | ------------------------------------------------------------ |
| 2019-02-01 00:00 | 2019-02-01 11:45 | Âncora administrativa    | PP      | Snapshot inicial; não abre exercício.                        |
| 2019-02-01 11:45 | 2021-04-13 21:10 | Em exercício, titular    | PP      | `Entrada - Posse de Eleito Titular`.                         |
| 2021-04-13 21:10 | Aberto no banco  | Vacância por falecimento | PP      | `Vacância` e `Saída - Afastamento definitivo - Falecimento`. |

## Flordelis — 204447

Padrão: titular com vacância por perda de mandato.

| De               | Até              | Estado derivado               | Partido | Lógica                                                                          |
| ---------------- | ---------------- | ----------------------------- | ------- | ------------------------------------------------------------------------------- |
| 2019-02-01 00:00 | 2019-02-01 11:45 | Âncora administrativa         | PSD     | Snapshot inicial; não abre exercício.                                           |
| 2019-02-01 11:45 | 2021-08-12 00:00 | Em exercício, titular         | PSD     | `Entrada - Posse de Eleito Titular`.                                            |
| 2021-08-12 00:00 | Aberto no banco  | Vacância por perda de mandato | PSD     | `Vacância` e `Saída - Afastamento definitivo - Perda de Mandato por Resolução`. |

## Alexandre Serfiotis — 178833

Padrão: titular com licenças curtas para cargo executivo municipal/estadual, mudanças de partido e vacância por renúncia na legislatura 56.

| De               | Até              | Estado derivado                             | Partido | Lógica                                                                |
| ---------------- | ---------------- | ------------------------------------------- | ------- | --------------------------------------------------------------------- |
| 2015-02-01 00:00 | 2015-02-01 10:00 | Âncora administrativa                       | PSD     | Snapshot inicial; sem exercício até posse.                            |
| 2015-02-01 10:00 | 2015-02-09 19:03 | Em exercício, titular                       | PSD     | Posse como eleito titular.                                            |
| 2015-02-09 19:03 | 2015-02-12 09:11 | Licença, titular                            | PSD     | Saída por Secretário de Estado.                                       |
| 2015-02-12 09:11 | 2015-12-15 15:13 | Em exercício, titular                       | PSD     | `Entrada - Reassunção`.                                               |
| 2015-12-15 15:13 | 2015-12-22 15:22 | Licença, titular                            | PSD     | Saída por Secretário de Prefeitura de Capital.                        |
| 2015-12-22 15:22 | 2016-02-17 09:41 | Em exercício, titular                       | PSD     | Reassunção.                                                           |
| 2016-02-17 09:41 | 2016-02-19 14:28 | Licença, titular                            | PSD     | Saída por Secretário de Prefeitura de Capital.                        |
| 2016-02-19 14:28 | 2016-03-21 20:25 | Em exercício, titular                       | PSD     | Reassunção.                                                           |
| 2016-03-21 20:25 | 2018-04-06 15:06 | Em exercício, titular                       | PMDB    | `Alteração de partido`; estado continua em exercício.                 |
| 2018-04-06 15:06 | 2018-04-10 18:00 | Em exercício, titular                       | S.PART. | `Alteração de partido`; período sem partido registrado.               |
| 2018-04-10 18:00 | 2019-01-31 23:59 | Em exercício, titular                       | PSD     | `Alteração de partido`; volta ao PSD.                                 |
| 2019-01-31 23:59 | 2019-02-01 11:45 | Fim de mandato / âncora da nova legislatura | PSD     | Fim da legislatura 55; snapshot da legislatura 56 não abre exercício. |
| 2019-02-01 11:45 | 2021-01-01 00:00 | Em exercício, titular                       | PSD     | Posse na legislatura 56.                                              |
| 2021-01-01 00:00 | Aberto no banco  | Vacância por renúncia                       | PSD     | `Vacância` e `Saída - Afastamento definitivo - Renúncia`.             |

## Sérgio Brito — 73808

Padrão: titular com legislaturas antigas em dados legados, hiatos sem mandato no histórico, mudanças de partido, licença durante cargo executivo e retorno com intervalo aberto. É o caso que mostra que `situacao = Exercício` em fim de legislatura legado não pode abrir intervalo.

| De               | Até              | Estado derivado          | Partido | Lógica                                                                                                              |
| ---------------- | ---------------- | ------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------- |
| 1987-02-01 00:00 | 1991-01-31 23:59 | Em exercício, titular    | PFL     | Registro legado de primeira posse abre; registro legado de fim de legislatura fecha, embora `situacao = Exercício`. |
| 1991-02-01 00:00 | 1995-01-31 23:59 | Em exercício, titular    | PDC     | Mesmo padrão legado.                                                                                                |
| 1995-01-31 23:59 | 2007-02-01 00:00 | Sem exercício registrado | -       | Não há evento de mandato nas legislaturas intermediárias para este `external_id_deputado`.                          |
| 2007-02-01 00:00 | 2007-09-24 12:31 | Em exercício, titular    | PDT     | Posse na legislatura 53.                                                                                            |
| 2007-09-24 12:31 | 2007-10-30 00:00 | Em exercício, titular    | PMDB    | `Alteração de partido`; estado continua em exercício.                                                               |
| 2007-10-30 00:00 | 2009-10-01 00:00 | Em exercício, titular    | PDT     | Nova alteração de partido; estado continua em exercício.                                                            |
| 2009-10-01 00:00 | 2009-10-08 18:11 | Licença, titular         | PDT     | Saída por Secretário de Prefeitura de Capital.                                                                      |
| 2009-10-08 18:11 | 2010-03-22 16:07 | Licença, titular         | PSC     | `Alteração de partido` com `situacao = Licença`; continua licenciado, só muda o partido.                            |
| 2010-03-22 16:07 | 2011-01-31 23:59 | Em exercício, titular    | PSC     | Reassunção; fecha por término da legislatura.                                                                       |
| 2011-02-01 00:00 | 2011-10-26 12:55 | Em exercício, titular    | PSC     | Posse na legislatura 54.                                                                                            |
| 2011-10-26 12:55 | 2015-01-31 23:59 | Em exercício, titular    | PSD     | `Alteração de partido`; fecha por término da legislatura.                                                           |
| 2015-02-01 00:00 | 2015-02-01 10:00 | Âncora administrativa    | PSD     | Snapshot inicial da legislatura 55.                                                                                 |
| 2015-02-01 10:00 | 2019-01-31 23:59 | Em exercício, titular    | PSD     | Posse; fecha por término da legislatura.                                                                            |
| 2019-02-01 00:00 | 2019-02-01 11:45 | Âncora administrativa    | PSD     | Snapshot inicial da legislatura 56.                                                                                 |
| 2019-02-01 11:45 | 2019-03-14 09:14 | Em exercício, titular    | PSD     | Posse.                                                                                                              |
| 2019-03-14 09:14 | 2019-10-02 11:06 | Licença, titular         | PSD     | Saída por Secretário de Estado.                                                                                     |
| 2019-10-02 11:06 | 2023-01-31 23:59 | Em exercício, titular    | PSD     | Reassunção; fecha por término da legislatura.                                                                       |
| 2023-02-01 00:00 | 2023-02-01 12:05 | Âncora administrativa    | PSD     | Snapshot inicial da legislatura 57.                                                                                 |
| 2023-02-01 12:05 | 2023-02-08 12:03 | Em exercício, titular    | PSD     | Posse.                                                                                                              |
| 2023-02-08 12:03 | 2023-11-17 10:25 | Licença, titular         | PSD     | Saída por Secretário de Estado.                                                                                     |
| 2023-11-17 10:25 | 2023-12-06 17:19 | Em exercício, titular    | PSD     | Reassunção.                                                                                                         |
| 2023-12-06 17:19 | 2024-11-29 10:48 | Licença, titular         | PSD     | Saída por Secretário de Estado.                                                                                     |
| 2024-11-29 10:48 | 2024-12-10 12:30 | Em exercício, titular    | PSD     | Reassunção.                                                                                                         |
| 2024-12-10 12:30 | 2025-11-11 10:22 | Licença, titular         | PSD     | Saída por Secretário de Estado; descrição inclui ofício.                                                            |
| 2025-11-11 10:22 | Aberto no banco  | Em exercício, titular    | PSD     | Último evento efetivo é `Entrada - Reassunção`.                                                                     |

## Chico Alencar — 74171

Padrão: titular com mudança de partido em 2005, mandatos contínuos até 2019, hiato sem mandato na legislatura 56 e novo intervalo aberto na legislatura 57.

| De               | Até              | Estado derivado          | Partido | Lógica                                                             |
| ---------------- | ---------------- | ------------------------ | ------- | ------------------------------------------------------------------ |
| 2003-02-01 00:00 | 2005-10-27 14:54 | Em exercício, titular    | PT      | Registro combina início de legislatura e `Entrada - Posse`.        |
| 2005-10-27 14:54 | 2007-01-31 00:00 | Em exercício, titular    | PSOL    | `Alteração de partido`; fecha por término da legislatura.          |
| 2007-02-01 00:00 | 2011-01-31 23:59 | Em exercício, titular    | PSOL    | Posse na legislatura 53; fecha por término da legislatura.         |
| 2011-02-01 00:00 | 2015-01-31 23:59 | Em exercício, titular    | PSOL    | Posse na legislatura 54; fecha por término da legislatura.         |
| 2015-02-01 00:00 | 2015-02-01 10:00 | Âncora administrativa    | PSOL    | Snapshot inicial da legislatura 55.                                |
| 2015-02-01 10:00 | 2019-01-31 23:59 | Em exercício, titular    | PSOL    | Posse; fecha por término da legislatura.                           |
| 2019-01-31 23:59 | 2023-02-01 00:00 | Sem exercício registrado | -       | Não há eventos da legislatura 56 para este `external_id_deputado`. |
| 2023-02-01 00:00 | 2023-02-01 12:05 | Âncora administrativa    | PSOL    | Snapshot inicial da legislatura 57.                                |
| 2023-02-01 12:05 | Aberto no banco  | Em exercício, titular    | PSOL    | Último evento efetivo é `Entrada - Posse de Eleito Titular`.       |

## Conclusões para implementação

O consumidor não deve transformar `deputado_historico` usando apenas `situacao`. A tradução precisa combinar `situacao`, `descricao_status` e o estado anterior.

Uma função de derivação deve produzir pelo menos:

| Campo derivado      | Observação                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `dataInicio`        | `data_hora` do evento efetivo que abre o estado.                                                                                           |
| `dataFim`           | `data_hora` do próximo evento efetivo que fecha ou substitui o estado; nulo para estado aberto.                                            |
| `estado`            | Um conjunto controlado como `em_exercicio`, `licenca`, `suplencia`, `fim_de_mandato`, `vacancia`, `convocado`, `sem_exercicio_registrado`. |
| `isEmExercicio`     | `true` apenas para `estado = em_exercicio`.                                                                                                |
| `condicaoEleitoral` | `Titular` ou `Suplente`, vindo de `condicao_eleitoral`.                                                                                    |
| `partido`           | Partido vigente no intervalo, atualizado por eventos de alteração de partido.                                                              |
| `motivo`            | Texto extraído da parte final de `descricao_status` em saídas, por exemplo `Ministro de Estado`, `Falecimento`, `Renúncia`.                |
| `origem`            | Lista dos campos/eventos que justificaram o estado derivado, útil para auditoria.                                                          |

Casos que precisam de teste antes de codificar a regra:

1. `situacao = Convocado` com `descricao_status` contendo `Entrada - Reassunção` deve abrir exercício.
2. `descricao_status = Alteração de partido` com `situacao = Licença` deve manter o deputado licenciado e só trocar partido.
3. Fim de legislatura legado com `situacao = Exercício` deve fechar o intervalo naquela legislatura.
4. Eventos com `situacao = null` no início da legislatura não devem abrir exercício.
5. Dois eventos no mesmo `data_hora` devem ser resolvidos por tipo de evento, não por ordem textual arbitrária.
