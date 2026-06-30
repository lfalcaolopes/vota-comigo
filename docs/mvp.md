# Quem Vota Comigo — MVP

## Objetivo

A primeira versão pública do produto. O conjunto mínimo de features que entrega valor real ao cidadão e justifica colocar o site no ar.

**Missão central:** ajudar o usuário a decidir em quem votar, comparando suas preferências com o comportamento real (votos) dos deputados federais.

Princípio de escopo: uma feature só entra no MVP se sua ausência torna o produto inútil. Tudo que é "bom ter" vai para melhorias pós-MVP.

## Pré-requisitos

O MVP só começa quando o Protótipo cumprir seu critério de saída: ranking das 20 proposições com maior volume de votações nominais em plenário considerado publicamente defensável como porta de entrada, com dados reais da Câmara dos Deputados ingeridos e schema modelado.

## Escopo do produto

O produto no MVP cobre exclusivamente **deputados federais com histórico de votação registrado**. Na UI deve ficar explícito: candidatos em primeira eleição, vereadores, deputados estaduais, senadores e outros perfis não são cobertos nesta versão. Isso é transparência metodológica, não limitação escondida.

---

## Features do MVP

### MVP-1. Feed / Ranking de Proposições Importantes

Lista pública, sem necessidade de login, das proposições computáveis pelo matcher, com ordenação padrão por maior volume de votações nominais em plenário, conforme a regra definida no Protótipo.

No MVP-1, a rota inicial do produto (`/`) é o próprio feed público. Uma landing page institucional fica fora desse corte para que a primeira tela já entregue a lista de proposições.

**Apresentação em lista:**

- O título público da página é "Proposições"; "Mais votadas" aparece como rótulo do modo de ordenação padrão, não como título da experiência inteira
- O metadata da página descreve a exploração por tema e ordenação, sem limitar a página a "mais votadas"
- Informações enxutas da proposição: identificador legislativo curto como título (`{siglaTipo} {numero}/{ano}`), ementa como descrição, data de apresentação e tipo de proposição
- O card exibe apenas dois agregados de votações: volume total de votações nominais em plenário e data da última votação
- O card não exibe informações de uma votação específica, nem mesmo da votação de referência do matcher
- O card não exibe o último status da proposição
- O card não exibe resultado; no domínio atual existe **Resultado da votação**, mas não existe resultado único da proposição
- O card não exibe temas; temas ficam como filtro no feed e como informação no detalhe da proposição
- Ordenada por volume de votações nominais em plenário por padrão (rótulo "Mais votadas") ou por data de apresentação (rótulo "Mais recentes"); os valores públicos de ordenação vivem no contrato compartilhado
- Pode ser filtrada por um único tema oficial disponível no feed
- Ausência de tema selecionado representa o feed sem filtro; a UI não precisa de uma opção "Todos os temas" na lista de temas
- A lista de temas é uma consulta própria sobre todos os **Temas disponíveis no feed**, independente da página atual e dos filtros ativos, sem busca textual
- A lista pública de temas exibe apenas temas com texto oficial, ordenados alfabeticamente, e não exibe contagem de proposições por tema no MVP
- Cada proposição exibida precisa ter uma votação de referência do matcher
- A lista retorna apenas o resumo necessário para o card; detalhes completos são carregados quando o usuário abre a proposição
- A busca do feed cobre identificador legislativo e ementa, podendo ser combinada com filtro de tema e ordenação
- Busca, filtro de tema e ordenação aparecem como controles principais do feed; em mobile podem ser compactados sem esconder sua disponibilidade
- Quando busca ou tema estiverem ativos, a UI oferece ação para limpar filtros, voltando para sem busca e sem tema, preservando a ordenação ativa
- Busca, filtro de tema e ordenação ficam refletidos na URL para permitir compartilhamento, refresh e primeira renderização já filtrada (parâmetros no contrato compartilhado)
- As páginas públicas do MVP-1 têm título e descrição básicos; OpenGraph e Twitter cards completos ficam para a melhoria de compartilhamento pós-MVP
- Quando a busca está vazia, a tela exibe o feed padrão de **Proposições mais votadas em plenário**
- A paginação do feed usa ação "carregar mais", sem paginação numerada no MVP-1
- Alterar busca, filtro de tema ou ordenação reinicia a paginação no primeiro lote do novo recorte
- Quando o feed padrão não tiver itens, a tela informa que ainda não há proposições computáveis para exibir
- Quando uma busca não tiver resultados, a tela informa que nenhuma proposição foi encontrada para a busca e os filtros utilizados, oferecendo ação para limpar busca e tema, preservando a ordenação ativa
- Na rota pública `/`, parâmetros inválidos de busca, tema ou ordenação não exibem erro técnico ao usuário; a tela volta ao recorte padrão ou normalizado
- Erros de carregamento no feed e no detalhe usam mensagem genérica com ação "Tentar novamente"; detalhes técnicos não aparecem na UI pública
- Em mobile, o card do feed mantém as mesmas informações do desktop; apenas layout e densidade visual se adaptam ao espaço disponível

**Detalhe ao clicar:**

- Cada proposição tem URL própria canônica (`/proposicoes/{externalIdProposicao}`) desde o MVP-1, para permitir link compartilhável e meta tags no MVP
- No MVP-1, o clique no card navega para a rota normal de detalhe; overlay ou modal preservando contexto de lista fica fora desse corte
- Quando a proposição não existe, a rota de detalhe usa a página de não encontrado; falhas transitórias de carregamento usam erro genérico com tentativa de recarregar
- A página de detalhe exibe breadcrumb no topo no formato "Proposições > {siglaTipo} {numero}/{ano}", com "Proposições" apontando para o feed público em `/`
- Detalhes completos da proposição
- Ementa detalhada quando disponível, como complemento à ementa principal e não como substituta
- Último status da proposição exibido no detalhe como situação ou tramitação atual
- Temas oficiais da proposição quando disponíveis, exibidos apenas no detalhe
- Votações nominais em plenário vinculadas à proposição, sem duplicatas
- Votação de referência do matcher exibida como uma votação normal da lista, marcada visualmente com o texto público "Votação usada no comparador"
- A lista de votações no detalhe é exibida da mais recente para a mais antiga; a votação de referência permanece na posição cronológica normal e não é promovida para o topo
- Orientações de bancada quando disponíveis via API/cache, em corte posterior do MVP-1
- Cada card de votação exibe data, descrição, resultado da votação, placar e marcador visual quando for a votação de referência do matcher
- O placar aparece completo quando há categorias detalhadas; quando resumido, exibe `Sim`, `Não` e `Outros` com rótulo discreto, sem decompor `Outros` na interface
- O detalhe exibe link para a fonte oficial da proposição; o MVP-1 não exige link oficial por votação, porque o contrato atual não expõe essa URL
- Contexto adicional quando disponível (regime de urgência, destaques, etc.)

**Não entra no MVP:**

- Resumo por IA
- Classificação "quem é afetado"
- Apelido popular como título ou campo exibido no card
- Link direto para inteiro teor da proposição (`urlInteiroTeor`)
- CTA funcional para iniciar o matcher a partir do feed enquanto o frontend do MVP-2 não existir
- Decisão formal de configuração pública da URL da API no frontend

### MVP-2. Matcher — "Quem vota com você"

Ferramenta de compatibilidade entre usuário e deputados com base nos votos. Framing neutro intencionalmente: serve tanto para decidir voto (missão central) quanto para avaliar representação atual.

**Fluxo:**

1. Usuário clica para iniciar
2. Informa estado (obrigatório) e cidade (opcional, preparando para cobertura municipal futura)
3. Sistema apresenta as 5 proposições mais bem posicionadas no ranking público e computáveis pelo matcher, já pré-selecionadas. Usuário pode:
   - Expandir para ver/selecionar mais proposições
   - Desselecionar proposições pré-selecionadas
   - Buscar proposições específicas por texto
   - Filtrar por tema e ordenar a lista com a mesma semântica do feed público
   - Selecionar uma lista única de proposições computáveis pelo matcher
   - Manter proposições já selecionadas ao aplicar busca, filtro ou ordenação; esses controles alteram apenas a lista disponível para novas seleções
4. Para cada proposição selecionada: contexto inicial, resultado da votação de referência, link para fonte, usuário informa se a proposição deveria ser aprovada, não deveria ser aprovada ou não sabe. `Não sei` tem o mesmo efeito de não selecionar a proposição: é completamente desconsiderado no cálculo.
5. Resultado: lista ordenada por % de concordância

**Validação de entrada:**

- Mínimo de 3 posições computáveis do usuário (`deveria ser aprovada` ou `não deveria ser aprovada`)
- Máximo de 30 proposições selecionadas para o matcher, incluindo respostas `não sei`
- Proposições duplicadas ou não computáveis pelo matcher tornam a execução inválida

**Tratamento de ausências e impedimentos:**

- Deputado em exercício sem registro em `votacoesVotos`: conta como discordância no matcher.
- Deputado fora de exercício na data da votação: não entra no denominador.
- Registro `Artigo 17`: não entra no denominador, mesmo tratamento de fora de exercício.

**Tratamento de proposições fora do mandato do deputado:**

Quando um deputado não estava em exercício durante a votação de referência de uma proposição selecionada pelo usuário, essa proposição é desconsiderada para aquele deputado (não entra no cálculo), mas o deputado continua no ranking.

Isso cria o problema de amostra desigual (ver abaixo), que precisa ser tratado.

**Ordenação e desempate:**

- Ordenação primária: Score Wilson do matcher — o limite inferior do intervalo de Wilson sobre concordâncias e denominador do matcher, que reduz o efeito de amostras pequenas
- A compatibilidade bruta continua exibida ao usuário junto com a amostra comparável
- Desempate 1: compatibilidade bruta
- Desempate 2: maior % de presença nas votações de referência das proposições selecionadas
- Desempate 3: candidato em atividade tem prioridade
- Desempate 4: nome do deputado em ordem alfabética, apenas para estabilidade
- Desempate 5: identificador externo do deputado, apenas para estabilidade
- Resultados retornados com paginação

**Casos de desempate e amostra que exigem decisão documentada antes de codar:**

Esses casos foram identificados durante a discussão e precisam ser resolvidos durante a construção do MVP, não deixados implícitos:

- **Amostra desigual por ausência.** Deputado que votou em 3 de 5 proposições selecionadas (2 ausências sem motivo conhecido contando como discordância) pode ter o mesmo % que deputado que votou nas 5 com 3 concordâncias. Situações diferentes sendo tratadas como iguais.
- **Amostra desigual por mandato.** Deputado que estava em exercício nas votações de 5 de 20 proposições selecionadas vs. deputado em exercício em todas as 20. O primeiro pode ter 100% de compatibilidade calculado sobre 5 votos; comparar com alguém que tem 80% sobre 20 é enganoso.
- **Volume diferente.** Candidato com 100% de concordância em 2 votações vs. candidato com 90% em 20 votações. Amostra maior é estatisticamente mais confiável.

**Direções de tratamento a decidir na construção:**
**Decisão:** o matcher usa o limite inferior de Wilson como score de ordenação para reduzir o efeito de amostras pequenas sem criar duas listas de resultados. A compatibilidade bruta continua sendo calculada e exibida, mas não é o score primário de ordenação.

Exibição transparente por deputado: "100% de compatibilidade (3 de 20 votações — deputado estava em exercício em 3)". O usuário vê a confiabilidade do número.

Deputados com amostra comparável menor que 50% das posições computáveis do usuário recebem alerta de amostra pequena, mas continuam na lista única ordenada pelo score Wilson.

Ordenação secundária considera tamanho de amostra entre deputados empatados em %.

**Decisão já tomada:** todas as proposições selecionadas pelo usuário têm peso igual no cálculo de compatibilidade. O ranking público serve apenas para ordenar a listagem de proposições, não influencia o cálculo do matcher.

**Votação de referência:** cada proposição computável pelo matcher usa uma única votação nominal em plenário, escolhida por mérito decisório conforme ADR 0014 e `docs/matcher/votacao-referencia.md`. Destaques, DTQs, requerimentos, recursos, dispensas, preferências, apreciações preliminares e votos de manutenção/supressão de trecho não são usados como votação decisiva de referência.

**Ao clicar no candidato no resultado:**

- % de participação nas votações de referência das proposições selecionadas
- Indicação de em quais o deputado estava em exercício e em quais não
- Indicação de ausências sem motivo conhecido
- Orientações de bancada da votação quando disponíveis via API/cache, sem vincular ao voto individual do deputado no MVP
- Detalhamento voto a voto: em quais o usuário concordou, em quais discordou

**Opções de visualização:**

- Default: deputados do estado informado pelo usuário
- Toggle para expandir a visualização para todos os deputados, caso o usuário queira
- A expansão para todos os deputados faz nova chamada com o mesmo cálculo e escopo nacional

**Comportamentos de borda:**

- **Pesquisa por deputado fora da base.** Se o usuário pesquisa por nome de uma pessoa que não está no sistema, exibir mensagem explicando que o MVP mapeia apenas deputados federais que já estiveram em atividade na Câmara. Candidatos novos, vereadores, deputados estaduais e senadores serão cobertos em versões futuras.
- **Matcher sem bom match.** Se o resultado do matcher não tem deputado com compatibilidade alta (threshold a definir — ex.: top resultado < 60%), complementar a mensagem de resultado com sugestão explícita ao usuário: considerar candidatos novos fora da base atual. Converte frustração em ação cívica consistente com a missão do produto.

### MVP-3. Perfil do Deputado — versão essencial

Cada deputado tem URL própria canônica (`/deputados/{externalIdDeputado}`) desde o MVP-3, usando o identificador público da Câmara.

A página exibe breadcrumb no formato "Início > {nome público do deputado}", com "Início" apontando para o feed público em `/`.

Quando `externalIdDeputado` não existir na tabela `deputado`, a rota retorna não encontrado. Quando o deputado existe, mas não tem `deputado_historico`, o perfil continua existindo com dados cadastrais básicos e mensagens de lacuna para snapshot atual, presença e histórico partidário.

O MVP-3 não inclui busca ou listagem própria de deputados; o perfil é acessado por links de outras experiências, como os resultados do matcher.

Os cards e detalhes de resultado do matcher passam a oferecer link para `/deputados/{externalIdDeputado}`. O detalhe do matcher continua sendo a visão contextual da execução; o perfil do deputado é página pública independente.

O perfil expõe disponibilidade explícita de cada bloco — snapshot público, resumo de presença e histórico partidário — para que a UI não precise inferir lacuna pela ausência de dado.

A API pública do perfil usa `GET /deputados/{externalIdDeputado}` e não recebe filtros no MVP-3.

**Entra no MVP:**

- Dados básicos: identidade cadastral estável vinda de `deputado` e snapshot público atual vindo do último `deputado_historico`
- Nome, partido atual, UF representada, foto e cargo público "Deputado federal"
  - O nome exibido usa `nomeEleitoral` do snapshot público quando disponível, com fallback para `deputado.nome` e `nomeCivil`
  - Quando `nomeCivil` existir e for diferente do nome exibido, o perfil mostra `nomeCivil` como metadado secundário com rótulo "Nome civil"
  - Os cards de resultado do matcher usam a mesma regra de nome exibido para manter consistência com o perfil
  - Exibe status `emAtividade` como badge separado do cargo, usando a mesma derivação por intervalos de exercício já usada no matcher
  - A foto usa a mesma URL exposta nos resultados do matcher: `urlFoto` do snapshot público mais recente
  - Quando não houver `urlFoto`, o perfil usa o mesmo fallback visual dos cards do matcher, adaptado ao tamanho do cabeçalho
  - Links de redes sociais vindos de `deputado.urlRedeSocial`, exibidos como links individuais quando o campo trouxer múltiplas URLs separadas por vírgula
  - Entradas vazias ou que não sejam URLs `http`/`https` são omitidas; se não restar nenhum link válido, o bloco de redes sociais não é exibido
- Metadados públicos de baixo custo já persistidos podem ser exibidos quando disponíveis, sem novo fetch ou nova ingestão: município/UF de nascimento, data de nascimento e legislaturas inicial/final
- Link para a fonte oficial da Câmara, derivado do `externalIdDeputado`
- Resumo agregado de presença em votações nominais de plenário e ausências sem motivo conhecido, sem lista de votos
  - Denominador: votações nominais de plenário em que o deputado estava em exercício
  - Presença: qualquer registro individual na votação, incluindo `sim`, `não`, `abstenção`, `obstrução`, `Artigo 17` ou voto não informado
  - `Artigo 17` conta como presença por ter registro individual, mas não recebe contagem separada no MVP-3
  - Voto não informado conta como presença por ter registro individual, mas não recebe contagem separada no MVP-3
  - Ausência sem motivo conhecido: deputado em exercício sem registro individual naquela votação
  - Fora de exercício não entra no denominador
  - Recorte: votações nominais de plenário vinculadas a proposições computáveis pelo matcher
  - Exibição mínima: percentual de presença, presenças sobre total de votações em exercício, total de ausências sem motivo conhecido e texto do recorte
  - Quando o total de votações em exercício for zero, o bloco informa que a presença está indisponível, sem exibir `0%`
  - O MVP-3 não cria ranking global de presença nem labels comparativos como "mais presente" ou "mais faltoso"
- Histórico de partidos
  - Exibido como linha do tempo condensada por partido, não como lista bruta de eventos administrativos
  - Períodos consecutivos com o mesmo partido são agrupados
  - A lista é exibida do período mais recente para o mais antigo
  - O último partido aparece como atual quando houver partido no snapshot público mais recente
  - A ordenação usa `dataHora`, mas a apresentação pública mostra apenas datas, sem hora
  - A data final de um período é a data da próxima mudança de partido, sem subtrair dia artificialmente
  - Eventos sem partido resolvido são ignorados; se nenhum evento tiver partido, o bloco informa que o histórico partidário está indisponível na base

**Não entra no MVP:**

- Lista de votos no perfil do deputado
- Busca ou listagem própria de deputados
- Website do deputado (`urlWebsite`)
- Email do deputado
- Cota parlamentar / gastos
- Projetos apresentados
- Frentes parlamentares
- Cargos em comissões
- Emendas parlamentares
- Labels ("mais presente", "mais faltoso") que dependem de rankings globais

### MVP-4. Comparativo de Deputados

Tela de comparação lado a lado entre deputados selecionados a partir do resultado do matcher (inspiração: comparativo de especificações de celular).

O MVP-4 implementa apenas a entrada contextual pós-matcher. O comparativo geral, com busca independente de deputados, fica fora deste corte.

- Na tela de resultado do matcher, o usuário seleciona 2-3 deputados dos resultados.
- No modo normal dos resultados, os cards não exibem seleção e continuam abrindo o detalhe como hoje.
- Uma ação secundária "Comparar deputados" acima da lista entra no modo de seleção para comparativo.
- No modo de seleção, os cards exibem checkboxes e ações "Cancelar" e "Comparar".
- No modo de seleção, clicar no card seleciona ou desmarca o deputado; abrir detalhe fica restrito ao modo normal.
- A ação "Comparar" fica habilitada apenas com 2 ou 3 deputados selecionados; ao atingir 3, novas seleções ficam bloqueadas com microcopy curta.
- A ação "Cancelar" volta ao modo normal e limpa a seleção temporária.
- A comparação abre com os deputados pré-selecionados.
- O comparativo abre como uma etapa interna do fluxo do matcher, substituindo a tela de resultados e oferecendo ação para voltar aos resultados.
- Ao voltar do comparativo, a tela retorna aos resultados no modo normal, não no modo de seleção para comparativo.
- As colunas seguem a ordem de seleção do usuário.
- O comparativo não permite remover, trocar ou buscar deputados dentro da própria tela; para ajustar a seleção, o usuário volta aos resultados.
- O comparativo foca nas proposições escolhidas no matcher e exibe as informações no contexto dessas proposições.
- Em telas pequenas, o comparativo mantém deputados como colunas com rolagem horizontal, preservando o modelo de grid lado a lado.
- Cada coluna de deputado tem cabeçalho com informações básicas do deputado: foto, nome público, partido atual, status **Em atividade** e entrada para o **Perfil do deputado**.
- A entrada para o **Perfil do deputado** abre em nova aba, preservando o comparativo efêmero.
- No MVP-4, o comparativo não precisa ter URL própria compartilhável nem sobreviver a refresh; ele pode depender do estado atual da execução do matcher no cliente.
- Cada célula deputado × proposição exibe o voto real do deputado na votação de referência e um indicador de concordância com a posição do usuário, usando a mesma semântica de concordância/discordância/fora do denominador do matcher.
- Cada linha de proposição exibe também a posição computável do usuário usada na comparação.
- A linha de proposição pode exibir metadados enxutos da votação de referência; as células não repetem data ou descrição da votação.
- Quando uma célula estiver fora do denominador, ela preserva o motivo específico já classificado pelo matcher, em vez de mostrar apenas um rótulo genérico.
- No MVP-4, a posição do usuário usada pelo comparativo vem da execução atual do matcher; não há persistência de execução nem de respostas do usuário.
- O comparativo inclui apenas proposições com posição computável do usuário (`aprovar` ou `rejeitar`); respostas `não sei` são excluídas como no matcher.
- As linhas de proposições seguem a ordem da execução atual do matcher.
- O comparativo deve reaproveitar a semântica do matcher sempre que possível, mantendo o menor número de regras próprias.
- A implementação do MVP-4 pode montar o comparativo chamando o detalhe do matcher para cada deputado selecionado, sem criar endpoint agregado próprio de comparativo.
- O **Resumo de presença do deputado** no comparativo pode vir da mesma rota pública do perfil (`GET /deputados/{externalIdDeputado}`), enquanto votos e indicadores de concordância vêm do detalhe do matcher.
- Se qualquer chamada necessária para montar o comparativo falhar, a tela exibe erro global com ação "Tentar novamente", sem renderizar comparação parcial.
- Por depender da execução efêmera do matcher no MVP-4, a UI do comparativo pode ser implementada dentro de `features/matcher`; uma feature independente `comparativo` fica para quando houver entrada geral ou rota própria.
- Abaixo das linhas de votos, o comparativo exibe apenas o **Resumo de presença do deputado** como informação consolidada adicional por deputado, usando o mesmo recorte do perfil. As demais informações do perfil ficam fora do comparativo.
- Quando o **Resumo de presença do deputado** estiver indisponível, o comparativo segue o perfil: mostra estado indisponível e não exibe `0%`.
- O comparativo não exibe métricas do matcher como compatibilidade bruta, score Wilson ou amostra comparável; essas métricas permanecem nos resultados e no detalhe do matcher.

### MVP-5. Otimização mobile

Estratégia: desenvolvimento desktop-first durante a construção do MVP, mas mobile **precisa estar refinado antes do lançamento**.

**Racional:** no Brasil, consumo político-informativo acontece majoritariamente via WhatsApp e redes sociais, usados predominantemente no celular. Uma ferramenta de accountability política que não funciona bem no mobile não cumpre sua missão.

**Alerta registrado:** "refinar mobile antes de lançar" vira "refazer mobile" se o desenvolvimento ignora mobile por completo. Durante a construção de cada feature, testar o layout principal em mobile mesmo sem polimento, para detectar cedo problemas estruturais na arquitetura de componentes.

---

## Critério de lançamento

O MVP está pronto para ir ao ar quando:

1. Todas as features acima funcionam com dados reais atualizados da Câmara
2. Mobile está refinado, não apenas funcional
3. A regra de ranking público por volume de votações em plenário continua produzindo uma lista defensável com os dados mais recentes
4. Os casos de amostra desigual e desempate do matcher estão decididos e documentados
5. Comportamentos de borda do matcher implementados: mensagem para pesquisa de deputado fora da base, sugestão de candidatos novos quando matcher não encontra bom match
