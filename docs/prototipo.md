# Quem Vota Comigo — Protótipo

## Objetivo

Validar, antes de construir qualquer interface ou backend de produto, três coisas:

1. **Viabilidade dos dados:** o que está disponível nas fontes públicas da Câmara dos Deputados é suficiente e confiável para alimentar o produto?
2. **Modelagem coerente:** o schema consegue representar as entidades do domínio de forma que acomode o produto completo, não apenas o MVP?
3. **Ranking público defensável:** a ordenação de proposições votadas é auditável, explicável e publicamente defensável quando aplicada a dados reais?

Sem essas três validações, qualquer trabalho de frontend ou backend é especulativo.

## Critério de saída

O Protótipo está concluído quando for possível olhar para o ranking das 20 proposições com maior volume de votações nominais em plenário de um ano de dados reais e considerá-lo **publicamente defensável** como porta de entrada do produto.

---

## Etapas

### 1. Inventário de fontes

Testar em paralelo as duas formas de acesso aos dados públicos da Câmara:

- **CSVs anuais** — `votacoes-{ano}.csv`, `votacoesVotos-{ano}.csv`, `votacoesOrientacoes-{ano}.csv` e demais datasets do `dadosabertos.camara.leg.br`
- **API REST** — endpoints do mesmo domínio

Para cada fonte, documentar:

- Quais entidades e campos estão disponíveis
- Qual está mais atualizada (especialmente para eventos recentes)
- Onde se sobrepõem e onde se complementam
- Limitações conhecidas (ex.: orientações ausentes, snapshots desatualizados, etc.)

**Hipótese a validar:** CSV serve para carga inicial em massa; API serve para incrementos recentes e para enriquecimento de detalhes não presentes no dump. Documentar o resultado real do teste.

### 2. Modelagem do schema

A modelagem das entidades específicas será um trabalho próprio, realizado a partir do inventário de fontes. Este documento não prescreve quais entidades devem existir — essa decisão é parte do trabalho de modelagem.

Princípios que devem guiar a modelagem:

- **Escopo do produto completo, não só do Protótipo.** Mesmo que o Protótipo importe apenas um subconjunto dos dados, o schema deve acomodar tudo que o produto completo precisará. Evita retrabalho posterior.
- **Proposição afetada como unidade de vínculo.** A relação votação-proposição vem exclusivamente de `votacoesProposicoes-{ano}.csv`, que lista as proposições afetadas por cada votação. A cardinalidade é N:N: uma votação pode afetar múltiplas proposições, e uma proposição pode acumular múltiplas votações ao longo da tramitação. Relações como `uriProposicaoPrincipal` ou `/proposicoes/{id}/relacionadas` continuam úteis como contexto de tramitação, mas não definem o vínculo canônico da votação. A proposição principal não é ingerida no pipeline-runner do MVP (ver ADR 0012).
- **Relações temporais.** Relações como deputado↔partido e deputado↔comissão mudam ao longo do tempo. Não podem ser tratadas como chave fixa.

### 3. Ingestão mínima

O Protótipo importa apenas o necessário para alimentar o ranking público por volume de votações em plenário e um matcher de teste. Dados complementares (gastos de cota parlamentar, frentes parlamentares, estrutura de comissões do deputado, emendas, discursos) ficam **modelados no schema mas fora do escopo de ingestão do Protótipo**.

- Janela temporal: 2-3 anos recentes, não histórico completo
- Critério: o suficiente para validar a ordenação por volume de votações em plenário com diversidade de proposições

### 4. Validação do ranking público

O ranking público do MVP usa volume de votações nominais em plenário vinculadas pela relação canônica `votacao_proposicao`, conforme ADR 0013. A regra substitui a fórmula ponderada inicialmente considerada porque a análise com dados reais mostrou que o baseline de contagem de votações era mais simples, auditável e não materialmente pior.

**Decisão superveniente:** quebra de disciplina partidária foi removida do ranking. O fator depende de orientação efetiva por deputado, mas orientações não são ingeridas no banco no MVP e a cascata sustentável cobre apenas partido e federação. A disciplina partidária como fator de ranking fica descartada no roadmap atual, conforme ADR 0005 e `docs/melhorias.md`.

**O que fazer nesta etapa:**

1. Rodar a ordenação por volume sobre os dados reais ingeridos
2. Validar manualmente as top 20 proposições do ranking
3. Conferir se o ranking é defensável como porta de entrada pública
4. Se houver buracos óbvios, registrar a limitação e tratar como possível revisão futura da regra, não como ajuste implícito de pesos

**O que NÃO fazer nesta etapa:**

- Incorporar cobertura midiática como critério do ranking. Essa ideia foi avaliada e movida para melhorias pós-MVP (ver seção final). O motivo é disciplina de escopo: a regra atual por volume é auditável e suficiente para o MVP; sinais externos só devem entrar se houver evidência empírica de que fazem falta.

## Decisões metodológicas registradas

- **Neutralidade por transparência, não por omissão.** Decisões editoriais inerentes à construção do ranking e das tabelas de apoio devem ser documentadas e revisáveis. Open methodology é o mecanismo que viabiliza a promessa de neutralidade.
- **Sinais endógenos antes de externos.** Tudo que vem dos dados da Câmara é auditável, gratuito e não depende de terceiros. Fontes externas só entram quando o sinal endógeno se provar insuficiente.
- **Ranking auditável.** A posição no ranking público indica volume de votações nominais em plenário nos dados ingeridos, não maior saliência pública, impacto social, polarização ou mérito político.
- **Escopo limitado a quem vota.** Cargos executivos (presidente, governadores, prefeitos) ficam fora do produto — não votam, não há o que comparar.

### Escopo de votações

Apenas votações nominais com voto individual computado (sim/não/abstenção registrados por deputado) entram no Protótipo. Votações por aclamação ficam fora porque não alimentam a polarização nem a lógica do matcher (que compara a posição do usuário com o voto do deputado). A informação de que uma proposição foi aprovada por aclamação pode ser exibida no perfil da proposição a partir dos endpoints de tramitação, sem necessidade de ingerir os registros dessas votações.

### Escopo de votações: plenário vs. comissão

Votações nominais acontecem em dois contextos: no Plenário da Câmara (todos os 513 deputados podem votar) e em comissões temáticas, especiais ou de inquérito (apenas os 30-60 deputados membros daquela comissão votam).

As duas categorias são ingeridas, mas tratadas de forma distinta. Cada votação recebe uma flag `escopo_votacao` derivada do `siglaOrgao`:

- `escopo_votacao = plenario` quando `siglaOrgao` é `PLEN` (Plenário da Câmara) ou `CN` (Congresso Nacional em sessão conjunta com o Senado).
- `escopo_votacao = comissao` para qualquer outro `siglaOrgao` — comissões permanentes (CCJC, CFT, CSAUDE, CE, CCOM, etc.), comissões especiais (geralmente nomeadas pelo número da proposição que analisam, ex.: `PL233823`, `PEC01825`), comissões externas (`CEX...`), grupos de trabalho (`GT...`), subcomissões (`SUB...`) e Mesa Diretora (`MESA`).

A regra é: tudo que não é `PLEN` ou `CN` é comissão. Não há lista enumerada de siglas de comissão a manter — sua composição muda a cada legislatura, comissões especiais são criadas e extintas durante o ano, e comissões externas surgem reativamente (ex.: tragédia em Brumadinho gerou `CEXMABRU`). Manter uma lista positiva de comissões seria fonte permanente de drift; manter a lista positiva mínima de plenário (`PLEN`, `CN`) é estável e auditável.

A flag é usada assim:

- **Ranking público e matcher:** filtram por `escopo_votacao = plenario`. Votações em comissão ficam fora dessas duas engines centrais. Motivo: deputados que não pertencem à comissão nunca aparecem nas votações dela — não por ausência, por não pertencer. Comparar deputados desiguais introduz viés sistemático.
- **Perfil do deputado e da proposição:** podem exibir votações em comissão como contexto consultável, segregadas das de plenário.

Esta decisão pode ser revisitada em melhorias pós-MVP se houver demanda por accountability mais granular sobre o trabalho dos deputados em comissões, com modelagem que trate a desigualdade de pertencimento.

## Investigação concluída: histórico de exercício dos deputados

Análise exploratória realizada sobre o endpoint `/deputados/{id}/historico` da API da Câmara. Documenta a estrutura dos dados e as regras de transformação em intervalos de exercício para uso no matcher e no perfil do deputado.

### Estrutura dos dados

O endpoint retorna uma lista de eventos ordenados cronologicamente, cada um com `dataHora`, `situacao`, `condicaoEleitoral` e `descricaoStatus`. Não são intervalos — são eventos pontuais de mudança de status que precisam ser transformados em pares (entrada, saída) para determinar os períodos em que o deputado estava em exercício.

### Valores de `situacao` mapeados

| Valor | Significado | Efeito no intervalo |
| --- | --- | --- |
| `"Exercício"` | Deputado em atividade, pode votar | Abre intervalo |
| `"Suplência"` | Suplente afastado (titular retornou) | Fecha intervalo |
| `"Licença"` | Titular licenciado (ministro, saúde, interesse particular) | Fecha intervalo |
| `"Fim de Mandato"` | Término da legislatura | Fecha intervalo |
| `"Vacância"` | Fim de legislatura (dados legados, legislaturas antigas) | Fecha intervalo |
| `"Convocado"` | Etapa processual, aguardando posse | Ignorar |
| `null` | Registro-âncora pré-posse | Ignorar |

### Informações encontradas durante análise

Um intervalo de exercício **abre** quando `situacao == "Exercício"` ou `descricaoStatus` começa com `"Entrada"`.

Um intervalo **fecha** quando `situacao` é `"Suplência"`, `"Licença"`, `"Fim de Mandato"` ou `"Vacância"`, ou quando `descricaoStatus` começa com `"Saída"`.

Registros com `situacao` = `null` ou `"Convocado"` são **ignorados**, exceto quando `descricaoStatus` contém o prefixo `"Entrada"` (caso irregular encontrado na investigação — ver abaixo).

A dupla checagem via `descricaoStatus` (prefixos "Entrada" / "Saída") serve como fallback para registros onde `situacao` não reflete o evento real.

Se o último registro de um deputado é uma abertura de intervalo sem fechamento, o intervalo fica aberto (`data_fim = null`), significando que o deputado está em exercício atualmente.

### Casos investigados

Três perfis foram analisados para cobrir os padrões principais:

- **Titular simples (Aécio Neves, id 74646).** Múltiplas legislaturas com pares limpos de Exercício/Vacância. Legislaturas antigas (48-51) usam registros legados genéricos sem detalhe de eventos intermediários. Legislaturas recentes (56-57) têm eventos detalhados com hora exata de posse e término.
- **Suplente intermitente (Coronel Telhada, id 222142).** Legislatura 57 com 4 ciclos de entrada/saída como suplente. Saídas marcadas com `situacao = "Suplência"` e `descricaoStatus = "Saída - Afastamento sem prazo determinado - Afastamento de Suplente (automático)"`. Uma irregularidade encontrada: registro de 25/03/2024 com `situacao = "Convocado"` mas `descricaoStatus` contendo "Entrada - Reassunção" — motivou a regra de fallback via `descricaoStatus`.
- **Titular licenciado para cargo no Executivo (André Fufuca, id 178882).** Legislatura 57 com múltiplas licenças para exercer cargo de Ministro do Esporte. Saídas marcadas com `situacao = "Licença"` e `descricaoStatus = "Saída - Afastamento sem prazo determinado - Ministro de Estado"`. O motivo do afastamento presente na `descricaoStatus` pode ser extraído para exibição no perfil do deputado.

### Informações adicionais nos registros

- **Mudanças de partido** geram registros com `situacao = "Exercício"` e `descricaoStatus = "Alteração de partido"`, com `siglaPartido` já atualizado. Permite saber a qual partido o deputado pertencia no momento de cada votação.
- **Motivo do afastamento** é extraível da `descricaoStatus` nas saídas: "Ministro de Estado", "Afastamento de Suplente (automático)", "Licença para tratar de interesse particular", "LTS" (licença saúde). Útil para explicar períodos fora de exercício no perfil do deputado; não distingue justificativa de ausência em votações individuais.
 
---

## Fontes de dados

- **Câmara dos Deputados** — `dadosabertos.camara.leg.br` (única fonte do Protótipo)

---

## Fora do escopo do Protótipo

Itens que foram discutidos mas estão explicitamente adiados:

- **Cobertura midiática no ranking público.** Movido para melhorias pós-MVP. A integração mais viável seria via GDELT Project (dataset público, gratuito via Google BigQuery). Antes de incorporar, validar experimentalmente se o sinal melhora a regra atual por volume de votações em plenário. Se for redundante, descartar; se for complementar, documentar nova decisão metodológica.
- **Curadoria de apelidos populares.** Pode enriquecer busca, exibição e cobertura midiática futura, mas não é pré-requisito do Protótipo depois da decisão de ranking por volume de votações em plenário.
- **Ingestão de dados complementares** (gastos, frentes, estrutura de comissões do deputado, emendas, discursos). Modelados no schema, importados depois.
- **Backend e frontend do produto.** Só começam depois que o Protótipo sair com critério de saída cumprido.
