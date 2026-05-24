# Quem Vota Comigo — Protótipo

## Objetivo

Validar, antes de construir qualquer interface ou backend de produto, três coisas:

1. **Viabilidade dos dados:** o que está disponível nas fontes públicas da Câmara dos Deputados é suficiente e confiável para alimentar o produto?
2. **Modelagem coerente:** o schema consegue representar as entidades do domínio de forma que acomode o produto completo, não apenas o MVP?
3. **Fórmula de relevância defensável:** o ranking de proposições votadas produzido pela fórmula é publicamente defensável quando aplicado a dados reais?

Sem essas três validações, qualquer trabalho de frontend ou backend é especulativo.

## Critério de saída

O Protótipo está concluído quando for possível olhar para o ranking das 20 proposições votadas mais relevantes de um ano de dados reais e considerá-lo **publicamente defensável** — isto é, alguém que acompanha política brasileira concordaria que aquelas foram, de fato, as proposições que importaram.

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
- **Proposição afetada como unidade de vínculo.** A relação votação-proposição vem exclusivamente de `votacoesProposicoes-{ano}.csv`, que lista as proposições afetadas por cada votação. A cardinalidade é N:N: uma votação pode afetar múltiplas proposições, e uma proposição pode acumular múltiplas votações ao longo da tramitação. Relações como `uriProposicaoPrincipal` ou `/proposicoes/{id}/relacionadas` continuam úteis como contexto de tramitação, mas não definem o vínculo canônico da votação.
- **Relações temporais.** Relações como deputado↔partido e deputado↔comissão mudam ao longo do tempo. Não podem ser tratadas como chave fixa.

### 3. Ingestão mínima

O Protótipo importa apenas o necessário para alimentar a fórmula de relevância e um matcher de teste. Dados complementares (gastos de cota parlamentar, frentes parlamentares, estrutura de comissões do deputado, emendas, discursos) ficam **modelados no schema mas fora do escopo de ingestão do Protótipo**.

- Janela temporal: 2-3 anos recentes, não histórico completo
- Critério: o suficiente para calibrar a fórmula com volume estatisticamente relevante e diversidade de proposições

### 4. Calibração da fórmula de relevância

A fórmula inicial tem quatro fatores com pesos definidos:

- Polarização — 0.35 (votação apertada)
- Quebra de disciplina partidária — 0.30 (parlamentares votando contra orientação do partido)
- Tipo de proposição — 0.20 (PEC pesa mais que requerimento procedural)
- Apelido popular — 0.15 (bônus para proposições conhecidas publicamente, calibrado para não dominar o ranking)

**O que fazer nesta etapa:**

1. Rodar a fórmula sobre os dados reais ingeridos
2. Validar manualmente as top 20 proposições do ranking
3. Ajustar pesos conforme necessário
4. Se houver buracos óbvios (proposições estruturalmente importantes ranqueando baixo), considerar sinais endógenos adicionais: presença na sessão, quantidade de votações associadas, regime de urgência, etc. Todos esses sinais são auditáveis e vêm dos próprios dados da Câmara.

**O que NÃO fazer nesta etapa:**

- Incorporar cobertura midiática como peso na fórmula. Essa ideia foi avaliada e movida para melhorias pós-MVP (ver seção final). O motivo é disciplina de escopo: se a fórmula com sinais endógenos produzir um ranking defensável, cobertura midiática vira complexidade desnecessária. Se não produzir, aí existe evidência empírica de que faz falta.

### 5. Curadoria da tabela de apelidos populares

Montar tabela de aproximadamente 80-150 apelidos de proposições conhecidas publicamente ("PEC da Impunidade", "Lei da Ficha Limpa", "Lei da Palmada", etc.). Trabalho manual, feito em paralelo com a calibração da fórmula — é insumo direto do fator "apelido popular".

---

## Decisões metodológicas registradas

- **Neutralidade por transparência, não por omissão.** Decisões editoriais inerentes à construção da fórmula e das tabelas de apoio devem ser documentadas e revisáveis. Open methodology é o mecanismo que viabiliza a promessa de neutralidade.
- **Sinais endógenos antes de externos.** Tudo que vem dos dados da Câmara é auditável, gratuito e não depende de terceiros. Fontes externas só entram quando o sinal endógeno se provar insuficiente.
- **Fórmula resiliente a gaming.** Uma votação unânime sobre uma proposta popular não pode dominar o ranking acima de uma votação polarizada menos conhecida. Isso está refletido no peso baixo do fator "apelido popular" (0.15).
- **Escopo limitado a quem vota.** Cargos executivos (presidente, governadores, prefeitos) ficam fora do produto — não votam, não há o que comparar.

### Escopo de votações

Apenas votações nominais com voto individual computado (sim/não/abstenção registrados por deputado) entram no Protótipo. Votações por aclamação ficam fora porque não alimentam os dois fatores principais da fórmula de relevância — polarização e quebra de disciplina partidária — nem a lógica do matcher (que compara a posição do usuário com o voto do deputado). A informação de que uma proposição foi aprovada por aclamação pode ser exibida no perfil da proposição a partir dos endpoints de tramitação, sem necessidade de ingerir os registros dessas votações.

### Escopo de votações: plenário vs. comissão

Votações nominais acontecem em dois contextos: no Plenário da Câmara (todos os 513 deputados podem votar) e em comissões temáticas, especiais ou de inquérito (apenas os 30-60 deputados membros daquela comissão votam).

As duas categorias são ingeridas, mas tratadas de forma distinta. Cada votação recebe uma flag `escopo_votacao` derivada do `siglaOrgao`:

- `escopo_votacao = plenario` quando `siglaOrgao` é `PLEN` (Plenário da Câmara) ou `CN` (Congresso Nacional em sessão conjunta com o Senado).
- `escopo_votacao = comissao` para qualquer outro `siglaOrgao` — comissões permanentes (CCJC, CFT, CSAUDE, CE, CCOM, etc.), comissões especiais (geralmente nomeadas pelo número da proposição que analisam, ex.: `PL233823`, `PEC01825`), comissões externas (`CEX...`), grupos de trabalho (`GT...`), subcomissões (`SUB...`) e Mesa Diretora (`MESA`).

A regra é: tudo que não é `PLEN` ou `CN` é comissão. Não há lista enumerada de siglas de comissão a manter — sua composição muda a cada legislatura, comissões especiais são criadas e extintas durante o ano, e comissões externas surgem reativamente (ex.: tragédia em Brumadinho gerou `CEXMABRU`). Manter uma lista positiva de comissões seria fonte permanente de drift; manter a lista positiva mínima de plenário (`PLEN`, `CN`) é estável e auditável.

A flag é usada assim:

- **Fórmula de relevância e matcher:** filtram por `escopo_votacao = plenario`. Votações em comissão ficam fora dessas duas engines centrais. Motivo: deputados que não pertencem à comissão nunca aparecem nas votações dela — não por ausência, por não pertencer. Comparar deputados desiguais introduz viés sistemático.
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
- **Motivo do afastamento** é extraível da `descricaoStatus` nas saídas: "Ministro de Estado", "Afastamento de Suplente (automático)", "Licença para tratar de interesse particular", "LTS" (licença saúde). Útil para a regra do matcher sobre tratamento de ausências (licença médica/missão oficial = neutro vs. ausência sem justificativa = discordância).
 
---

## Fontes de dados

- **Câmara dos Deputados** — `dadosabertos.camara.leg.br` (única fonte do Protótipo)

---

## Fora do escopo do Protótipo

Itens que foram discutidos mas estão explicitamente adiados:

- **Cobertura midiática na fórmula de relevância.** Movido para melhorias pós-MVP. A integração mais viável seria via GDELT Project (dataset público, gratuito via Google BigQuery). Antes de incorporar, validar experimentalmente se o sinal adiciona informação que a fórmula atual — especialmente o fator "apelido popular" — não já captura. Se for redundante, descartar; se for complementar, integrar com peso calibrado.
- **Ingestão de dados complementares** (gastos, frentes, estrutura de comissões do deputado, emendas, discursos). Modelados no schema, importados depois.
- **Backend e frontend do produto.** Só começam depois que o Protótipo sair com critério de saída cumprido.
