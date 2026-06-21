# Votação de referência do matcher

Este documento registra a heurística operacional para escolher a **Votação de referência do matcher**. Ele complementa a ADR 014, que registra a decisão conceitual, e preserva a regra exata para reimplementação futura fora dos artefatos ignorados em `csv/analysis/`.

## Objetivo

Para cada **Proposição computável pelo matcher**, escolher exatamente uma votação nominal em plenário que funcione como votação decisiva de referência da proposição. Essa é a votação usada pelo matcher para comparar a posição declarada do usuário com o voto dos deputados. A regra prioriza votos de mérito decisório descritos pela Câmara e usa turno explícito apenas como fallback controlado.

O matcher não usa destaques, DTQs, requerimentos, recursos, dispensas, preferências, apreciações preliminares ou votos de manutenção/supressão de trecho como votação decisiva de referência. Redação final não é mérito decisório; só entra como fallback fraco.

## Fonte de dados

A regra deve rodar sobre os dados ingeridos no banco, não sobre CSV bruto.

Tabelas usadas:

- `votacao_proposicao`: vínculo canônico entre votação e proposição afetada.
- `votacao`: dados da votação.
- `proposicao`: dados da proposição afetada.

Escopo:

- somente `votacao.escopo_votacao = 'plenario'`;
- somente votações nominais;
- vínculo sempre por `votacao_proposicao`;
- a escolha é por `external_id_proposicao`, sem reconstruir proposição principal e sem consolidar proposições derivadas.

Campos textuais reais usados em `votacao`:

- `descricao`;
- `ultima_abertura_votacao_descricao`;
- `ultima_apresentacao_proposicao_descricao`.

Campos de desempate:

- `data_hora_registro`;
- `votos_sim`;
- `votos_nao`;
- `votos_outros`;
- `external_id_votacao`.

`total_votos` é calculado como:

```sql
coalesce(votos_sim, 0) + coalesce(votos_nao, 0) + coalesce(votos_outros, 0)
```

## Normalização

A análise validada não depende da extensão `unaccent`. Use uma função temporária ou equivalente que remova acentos por `translate`.

```sql
create or replace function pg_temp.unaccent(value text)
returns text
language sql
immutable
parallel safe
as $$
  select translate(
    coalesce(value, ''),
    'áàâãäÁÀÂÃÄéèêëÉÈÊËíìîïÍÌÎÏóòôõöÓÒÔÕÖúùûüÚÙÛÜçÇñÑº°',
    'aaaaaAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUcCnNoo'
  );
$$;
```

Textos derivados:

```sql
lower(pg_temp.unaccent(coalesce(v.descricao, ''))) as d,
coalesce(
  nullif(btrim(v.ultima_abertura_votacao_descricao), ''),
  nullif(btrim(v.ultima_apresentacao_proposicao_descricao), ''),
  nullif(btrim(v.descricao), '')
) as texto_votacao_cascata
```

`d` é usado nos padrões positivos sobre o resultado da votação. `texto_votacao_cascata` é usado no fallback por turno e segue a cascata validada na análise anterior: abertura, depois última apresentação, depois descrição.

## Prioridades

A votação candidata recebe `prioridade_votacao_referencia` conforme a primeira regra que casar:

| Prioridade | Padrão                                                                                                                                                                          |
| ---------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|          6 | PEC em segundo turno                                                                                                                                                            |
|          5 | Mérito principal por `descricao`: medida provisória, projeto de lei, projeto de decreto legislativo, projeto de resolução, substitutivo, subemenda substitutiva ou PEC genérica |
|          4 | Emendas do Senado Federal                                                                                                                                                       |
|          3 | PEC em primeiro turno                                                                                                                                                           |
|          2 | Recall por turno da regra em cascata, desde que a descrição não seja fragmentária nem redação final                                                                             |
|          1 | Redação final                                                                                                                                                                   |

Votação sem prioridade é descartada como candidata. Proposição sem nenhuma candidata fica sem votação de referência e não é computável pelo matcher.

## Heurística exata

```sql
case
  when d ~* '(requerimento|recurso|intersticio|dispensa|preferencia)'
    then null
  when d ~* 'proposta de emenda a constituicao'
    and texto_votacao_cascata ~* '(segundo turno|2[º°]? turno)'
    then 6
  when d ~* '(aprovad.|rejeitad.) a medida provisoria'
    then 5
  when d ~* '(aprovad.|rejeitad.) o projeto de lei'
    then 5
  when d ~* '(aprovad.|rejeitad.) o projeto de decreto legislativo'
    then 5
  when d ~* '(aprovad.|rejeitad.) o projeto de resolucao'
    then 5
  when d ~* '(aprovad.|rejeitad.) (o substitutivo|a subemenda substitutiva)'
    then 5
  when d ~* 'proposta de emenda a constituicao'
    then 5
  when d ~* 'emendas do senado federal'
    then 4
  when d ~* 'proposta de emenda a constituicao'
    and texto_votacao_cascata ~* '(primeiro turno|1[º°]? turno|turno 1)'
    then 3
  when (
      case
        when texto_votacao_cascata ~* '(vota[cç][ãa]o do dtq|(^|[^[:alnum:]_])dtq([^[:alnum:]_]|$)|destaque|requerimento|reda[cç][ãa]o final|redacao final|emenda aglutinativa)'
          then null
        when texto_votacao_cascata ~* '(segundo turno|2[º°]? turno)'
          then 3
        when texto_votacao_cascata ~* '(turno único|turno unico)'
          then 2
        when texto_votacao_cascata ~* '(primeiro turno|1[º°]? turno|turno 1)'
          then 1
        else null
      end
    ) is not null
    and d !~* '(destaque|dtq|mantido o texto|suprimido o texto|emenda de (plenario|comissao)|redacao final)'
    then 2
  when d ~* 'redacao final'
    then 1
  else null
end as prioridade_votacao_referencia
```

O padrão explicativo associado deve usar o mesmo `case`, trocando os números por:

```sql
case
  when d ~* '(requerimento|recurso|intersticio|dispensa|preferencia)'
    then null
  when d ~* 'proposta de emenda a constituicao'
    and texto_votacao_cascata ~* '(segundo turno|2[º°]? turno)'
    then 'pec_segundo_turno'
  when d ~* '(aprovad.|rejeitad.) a medida provisoria'
    then 'medida_provisoria'
  when d ~* '(aprovad.|rejeitad.) o projeto de lei'
    then 'projeto_de_lei'
  when d ~* '(aprovad.|rejeitad.) o projeto de decreto legislativo'
    then 'projeto_decreto_legislativo'
  when d ~* '(aprovad.|rejeitad.) o projeto de resolucao'
    then 'projeto_resolucao'
  when d ~* '(aprovad.|rejeitad.) (o substitutivo|a subemenda substitutiva)'
    then 'substitutivo_ou_subemenda_substitutiva'
  when d ~* 'proposta de emenda a constituicao'
    then 'pec_generica'
  when d ~* 'emendas do senado federal'
    then 'emendas_senado_federal'
  when d ~* 'proposta de emenda a constituicao'
    and texto_votacao_cascata ~* '(primeiro turno|1[º°]? turno|turno 1)'
    then 'pec_primeiro_turno'
  when (
      case
        when texto_votacao_cascata ~* '(vota[cç][ãa]o do dtq|(^|[^[:alnum:]_])dtq([^[:alnum:]_]|$)|destaque|requerimento|reda[cç][ãa]o final|redacao final|emenda aglutinativa)'
          then null
        when texto_votacao_cascata ~* '(segundo turno|2[º°]? turno)'
          then 3
        when texto_votacao_cascata ~* '(turno único|turno unico)'
          then 2
        when texto_votacao_cascata ~* '(primeiro turno|1[º°]? turno|turno 1)'
          then 1
        else null
      end
    ) is not null
    and d !~* '(destaque|dtq|mantido o texto|suprimido o texto|emenda de (plenario|comissao)|redacao final)'
    then 'recall_turno_cascata'
  when d ~* 'redacao final'
    then 'redacao_final'
  else null
end as padrao_votacao_referencia
```

## Seleção da referência

Depois de classificar as votações, escolher uma por proposição:

```sql
select distinct on (external_id_proposicao)
  external_id_proposicao,
  external_id_votacao as external_id_votacao_referencia,
  data,
  data_hora_registro,
  descricao,
  ultima_abertura_votacao_descricao,
  ultima_apresentacao_proposicao_descricao,
  votos_sim,
  votos_nao,
  votos_outros,
  total_votos,
  prioridade_votacao_referencia,
  padrao_votacao_referencia
from votacoes_classificadas
where prioridade_votacao_referencia is not null
order by
  external_id_proposicao,
  prioridade_votacao_referencia desc,
  data_hora_registro desc nulls last,
  total_votos desc,
  external_id_votacao desc;
```

## Query mínima para replicação

```sql
create or replace function pg_temp.unaccent(value text)
returns text
language sql
immutable
parallel safe
as $$
  select translate(
    coalesce(value, ''),
    'áàâãäÁÀÂÃÄéèêëÉÈÊËíìîïÍÌÎÏóòôõöÓÒÔÕÖúùûüÚÙÛÜçÇñÑº°',
    'aaaaaAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUcCnNoo'
  );
$$;

with base as (
  select
    p.external_id_proposicao,
    p.sigla_tipo,
    p.numero,
    p.ano,
    p.ementa,
    v.external_id_votacao,
    v.data,
    v.data_hora_registro,
    coalesce(v.votos_sim, 0) as votos_sim,
    coalesce(v.votos_nao, 0) as votos_nao,
    coalesce(v.votos_outros, 0) as votos_outros,
    coalesce(v.votos_sim, 0) + coalesce(v.votos_nao, 0) + coalesce(v.votos_outros, 0) as total_votos,
    nullif(btrim(v.descricao), '') as descricao,
    nullif(btrim(v.ultima_abertura_votacao_descricao), '') as ultima_abertura_votacao_descricao,
    nullif(btrim(v.ultima_apresentacao_proposicao_descricao), '') as ultima_apresentacao_proposicao_descricao,
    lower(pg_temp.unaccent(coalesce(v.descricao, ''))) as d,
    coalesce(
      nullif(btrim(v.ultima_abertura_votacao_descricao), ''),
      nullif(btrim(v.ultima_apresentacao_proposicao_descricao), ''),
      nullif(btrim(v.descricao), '')
    ) as texto_votacao_cascata
  from votacao_proposicao vp
  join votacao v on v.id = vp.votacao_id
  join proposicao p on p.id = vp.proposicao_id
  where v.escopo_votacao = 'plenario'
),
classificadas as (
  select
    *,
    case
      when d ~* '(requerimento|recurso|intersticio|dispensa|preferencia)' then null
      when d ~* 'proposta de emenda a constituicao' and texto_votacao_cascata ~* '(segundo turno|2[º°]? turno)' then 6
      when d ~* '(aprovad.|rejeitad.) a medida provisoria' then 5
      when d ~* '(aprovad.|rejeitad.) o projeto de lei' then 5
      when d ~* '(aprovad.|rejeitad.) o projeto de decreto legislativo' then 5
      when d ~* '(aprovad.|rejeitad.) o projeto de resolucao' then 5
      when d ~* '(aprovad.|rejeitad.) (o substitutivo|a subemenda substitutiva)' then 5
      when d ~* 'proposta de emenda a constituicao' then 5
      when d ~* 'emendas do senado federal' then 4
      when d ~* 'proposta de emenda a constituicao' and texto_votacao_cascata ~* '(primeiro turno|1[º°]? turno|turno 1)' then 3
      when (
          case
            when texto_votacao_cascata ~* '(vota[cç][ãa]o do dtq|(^|[^[:alnum:]_])dtq([^[:alnum:]_]|$)|destaque|requerimento|reda[cç][ãa]o final|redacao final|emenda aglutinativa)' then null
            when texto_votacao_cascata ~* '(segundo turno|2[º°]? turno)' then 3
            when texto_votacao_cascata ~* '(turno único|turno unico)' then 2
            when texto_votacao_cascata ~* '(primeiro turno|1[º°]? turno|turno 1)' then 1
            else null
          end
        ) is not null
        and d !~* '(destaque|dtq|mantido o texto|suprimido o texto|emenda de (plenario|comissao)|redacao final)' then 2
      when d ~* 'redacao final' then 1
      else null
    end as prioridade_votacao_referencia,
    case
      when d ~* '(requerimento|recurso|intersticio|dispensa|preferencia)' then null
      when d ~* 'proposta de emenda a constituicao' and texto_votacao_cascata ~* '(segundo turno|2[º°]? turno)' then 'pec_segundo_turno'
      when d ~* '(aprovad.|rejeitad.) a medida provisoria' then 'medida_provisoria'
      when d ~* '(aprovad.|rejeitad.) o projeto de lei' then 'projeto_de_lei'
      when d ~* '(aprovad.|rejeitad.) o projeto de decreto legislativo' then 'projeto_decreto_legislativo'
      when d ~* '(aprovad.|rejeitad.) o projeto de resolucao' then 'projeto_resolucao'
      when d ~* '(aprovad.|rejeitad.) (o substitutivo|a subemenda substitutiva)' then 'substitutivo_ou_subemenda_substitutiva'
      when d ~* 'proposta de emenda a constituicao' then 'pec_generica'
      when d ~* 'emendas do senado federal' then 'emendas_senado_federal'
      when d ~* 'proposta de emenda a constituicao' and texto_votacao_cascata ~* '(primeiro turno|1[º°]? turno|turno 1)' then 'pec_primeiro_turno'
      when (
          case
            when texto_votacao_cascata ~* '(vota[cç][ãa]o do dtq|(^|[^[:alnum:]_])dtq([^[:alnum:]_]|$)|destaque|requerimento|reda[cç][ãa]o final|redacao final|emenda aglutinativa)' then null
            when texto_votacao_cascata ~* '(segundo turno|2[º°]? turno)' then 3
            when texto_votacao_cascata ~* '(turno único|turno unico)' then 2
            when texto_votacao_cascata ~* '(primeiro turno|1[º°]? turno|turno 1)' then 1
            else null
          end
        ) is not null
        and d !~* '(destaque|dtq|mantido o texto|suprimido o texto|emenda de (plenario|comissao)|redacao final)' then 'recall_turno_cascata'
      when d ~* 'redacao final' then 'redacao_final'
      else null
    end as padrao_votacao_referencia
  from base
)
select distinct on (external_id_proposicao)
  external_id_proposicao,
  sigla_tipo,
  numero,
  ano,
  external_id_votacao as external_id_votacao_referencia,
  data,
  data_hora_registro,
  descricao,
  ultima_abertura_votacao_descricao,
  ultima_apresentacao_proposicao_descricao,
  votos_sim,
  votos_nao,
  votos_outros,
  total_votos,
  prioridade_votacao_referencia,
  padrao_votacao_referencia,
  ementa
from classificadas
where prioridade_votacao_referencia is not null
order by
  external_id_proposicao,
  prioridade_votacao_referencia desc,
  data_hora_registro desc nulls last,
  total_votos desc,
  external_id_votacao desc;
```

## Valores esperados da análise de validação

Na reanálise `uniao-v2`, com a base local usada em junho de 2026:

- total de proposições avaliadas: 874;
- proposições com referência: 375;
- cobertura: 42,91%;
- MPV: 66 de 117;
- REQ: 0 capturados;
- PEC: 42 de 43, 97,67%;
- Top 20: 0 fora;
- Top 50: 1 fora;
- Top 100: 7 fora;
- ranking completo: 499 fora.

Distribuição por prioridade e padrão:

| Prioridade | Padrão                                   | Referências |
| ---------: | ---------------------------------------- | ----------: |
|          6 | `pec_segundo_turno`                      |          39 |
|          5 | `substitutivo_ou_subemenda_substitutiva` |         189 |
|          5 | `projeto_de_lei`                         |          61 |
|          5 | `medida_provisoria`                      |          42 |
|          5 | `projeto_decreto_legislativo`            |          19 |
|          5 | `pec_generica`                           |           2 |
|          5 | `projeto_resolucao`                      |           1 |
|          4 | `emendas_senado_federal`                 |           8 |
|          2 | `recall_turno_cascata`                   |          14 |

Validação positiva que deve continuar com referência:

| Proposição    | Votação escolhida | Padrão                                   | Placar    |
| ------------- | ----------------- | ---------------------------------------- | --------- |
| MPV 1300/2025 | `2515300-38`      | `medida_provisoria`                      | 423 x 36  |
| MPV 1301/2025 | `2519886-34`      | `medida_provisoria`                      | 403 x 6   |
| PL 1707/2024  | `2432423-88`      | `substitutivo_ou_subemenda_substitutiva` | 278 x 110 |
| PL 7906/2014  | `622019-73`       | `projeto_de_lei`                         | 204 x 128 |
| PL 327/2021   | `2269745-144`     | `emendas_senado_federal`                 | 448 x 14  |
| PL 3626/2023  | `2374400-110`     | `emendas_senado_federal`                 | 292 x 114 |
| PL 914/2024   | `2422697-129`     | `emendas_senado_federal`                 | 380 x 26  |

Validação negativa que deve continuar sem referência:

- MPV 1016/2020;
- MPV 1070/2021;
- MPV 926/2020;
- MPV 944/2020;
- PL 2384/2023;
- PL 2462/1991;
- PL 2685/2022;
- PL 4491/2021;
- PL 5191/2020;
- PL 5284/2020;
- PL 545/2024;
- PL 5516/2020;
- PL 81/2024.

## Histórico da regra

A regra antiga usava turno explícito em `ultima_abertura_votacao_descricao` e atingia 374/874, 42,79%, mas incluía falsos positivos de destaque e preliminares.

A regra em cascata manteve 374/874, 42,79%, trocando o campo único por cascata textual.

A regra decisória pura subiu a qualidade dos casos de mérito, mas caiu para 341/874, 39,02%, porque perdeu tipos inteiros como PDL e MPV e descartou o sinal de turno único.

A regra unida v1 recuperou parte da cobertura, mas capturou 4 REQ por menção a PEC em requerimentos procedurais.

A regra unida v2 é a regra operacional atual: preserva mérito decisório, recupera MPVs de subemenda substitutiva, zera REQ e mantém fora as proposições simbólicas sem voto de mérito.

## Arquivos de análise relacionados

Os artefatos abaixo foram gerados durante a investigação, mas ficam em `csv/analysis/`, que é ignorado pelo git:

- `csv/analysis/votacao-referencia-matcher-uniao-v2.sql`;
- `csv/analysis/votacao-referencia-matcher-uniao-v2.md`;
- `csv/analysis/votacao-referencia-matcher-proposicoes-uniao-v2.csv`;
- `csv/analysis/votacao-referencia-matcher-resumo-uniao-v2.csv`;
- `csv/analysis/votacao-referencia-matcher-distribuicao-sigla-tipo-uniao-v2.csv`;
- `csv/analysis/votacao-referencia-matcher-tier-origem-uniao-v2.csv`;
- `csv/analysis/votacao-referencia-matcher-validacao-positiva-uniao-v2.csv`;
- `csv/analysis/votacao-referencia-matcher-validacao-negativa-uniao-v2.csv`;
- `csv/analysis/votacao-referencia-matcher-impacto-ranking-uniao-v2.csv`.
