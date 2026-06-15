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
- O metadata da página usa "Proposições | Quem Vota Comigo" e descreve a exploração por tema e ordenação, sem limitar a página a "mais votadas"
- Informações enxutas da proposição: identificador legislativo curto como título (`{siglaTipo} {numero}/{ano}`), ementa como descrição, data de apresentação da proposição e tipo de proposição
- O card exibe apenas dois agregados de votações no MVP-1: volume total de votações nominais em plenário e data da última votação
- O card não exibe informações de uma votação específica, nem mesmo da votação de referência do matcher
- O card não exibe o último status da proposição
- O card não exibe resultado; no domínio atual existe **Resultado da votação**, mas não existe resultado único da proposição
- O card não exibe temas; temas ficam como filtro no feed e como informação no detalhe da proposição
- Ordenada por volume de votações nominais em plenário por padrão; o rótulo público do controle é "Mais votadas"
- Pode ser ordenada por proposições mais recentes, usando a data de apresentação da proposição; o rótulo público do controle é "Mais recentes"
- Os valores públicos de ordenação são `mais-votadas` e `mais-recentes`, definidos uma única vez no contrato compartilhado.
- Pode ser filtrada por um único tema oficial disponível no feed
- Ausência de tema selecionado representa o feed sem filtro de tema; a UI não precisa exibir uma opção "Todos os temas" dentro da lista de temas.
- A lista de temas do filtro vem de `/proposicoes/feed/temas`, consulta própria sobre todos os **Temas disponíveis no feed**, não da página atual do feed.
- A consulta de temas não tem busca textual e não depende dos filtros ativos; ela sempre retorna todos os **Temas disponíveis no feed**.
- A lista pública de temas exibe apenas temas com texto oficial, ordenados alfabeticamente pelo texto e com `externalCodTema` como desempate.
- A lista pública de temas não exibe contagem de proposições por tema no MVP.
- Na API do feed, ordenação inválida e tema não numérico retornam `400`; tema numérico sem resultados retorna lista vazia.
- Cada proposição exibida precisa ter uma votação de referência do matcher
- A lista retorna apenas o resumo necessário para o card; detalhes completos são carregados quando o usuário abre a proposição
- O contrato público das rotas de proposições precisa expor a data de apresentação da proposição nos cards e no detalhe.
- O contrato público do feed usa a semântica `/proposicoes/feed`; a rota antiga `/proposicoes/mais-votadas` não precisa ser mantida.
- A busca do feed busca por identificador legislativo (`siglaTipo`, `numero`, `ano`) e `ementa`, podendo ser combinada com filtro de tema e ordenação.
- Busca, filtro de tema e ordenação aparecem como controles principais do feed; em mobile podem ser compactados sem esconder sua disponibilidade.
- Quando busca ou tema estiverem ativos, a UI oferece ação para limpar filtros, voltando para sem busca e sem tema, preservando a ordenação ativa.
- O frontend do MVP-1 consome as rotas reais de proposições desde o início; mocks locais ficam restritos a testes de componente quando necessários.
- A primeira carga do feed em `/` é renderizada no servidor; busca e "carregar mais" são interações client-side sobre as rotas existentes.
- Busca, filtro de tema e ordenação ficam refletidos na URL para permitir compartilhamento, refresh e primeira renderização já filtrada.
- Os parâmetros públicos são `q` para busca textual, `tema` para `externalCodTema` e `ordenacao` para `mais-votadas` ou `mais-recentes`.
- As páginas públicas do MVP-1 têm `title` e `description` básicos; OpenGraph e Twitter cards completos ficam para o MVP-6.
- Quando a busca está vazia, a tela exibe o feed padrão de **Proposições mais votadas em plenário** sem parâmetro textual de busca.
- A paginação do feed usa ação "carregar mais" sobre o `limit`/`offset` das rotas existentes, sem paginação numerada no MVP-1.
- Alterar busca, filtro de tema ou ordenação reinicia a paginação do feed no primeiro lote do novo recorte.
- O feed carrega 20 itens inicialmente e mais 20 a cada ação de "carregar mais", acompanhando o padrão das rotas existentes.
- Quando o feed padrão não tiver itens, a tela informa que ainda não há proposições computáveis para exibir.
- Quando uma busca não tiver resultados, a tela informa que nenhuma proposição foi encontrada para a busca e os filtros utilizados, oferecendo ação para limpar busca e tema, preservando a ordenação ativa.
- Na rota pública `/`, parâmetros inválidos de busca, tema ou ordenação não exibem erro técnico ao usuário; a tela volta ao recorte padrão ou normalizado.
- Erros de carregamento no feed e no detalhe usam mensagem genérica com ação "Tentar novamente"; detalhes técnicos não aparecem na UI pública.
- Em mobile, o card do feed mantém as mesmas informações do desktop; apenas layout e densidade visual se adaptam ao espaço disponível.

**Detalhe ao clicar:**
- Cada proposição tem URL própria canônica (`/proposicoes/{externalIdProposicao}`) desde o MVP-1, para permitir link compartilhável e meta tags no MVP.
- A primeira carga da página de detalhe é renderizada no servidor.
- No MVP-1, o clique no card navega para a rota normal de detalhe; overlay ou modal preservando contexto de lista fica fora desse corte.
- Quando a API retornar 404 para uma proposição, a rota de detalhe usa a página de não encontrado; falhas transitórias de carregamento usam erro genérico com tentativa de recarregar.
- A página de detalhe exibe breadcrumb no topo no formato "Proposições > {siglaTipo} {numero}/{ano}", com "Proposições" apontando para o feed público em `/`.
- Detalhes completos da proposição
- Ementa detalhada quando disponível, como complemento à ementa principal e não como substituta
- Último status da proposição exibido no detalhe como situação ou tramitação atual
- Temas oficiais da proposição quando disponíveis, exibidos apenas no detalhe
- Votações nominais em plenário vinculadas à proposição, sem duplicatas
- Votação de referência do matcher exibida como uma votação normal da lista, marcada visualmente com o texto público "Votação usada no comparador"
- A lista de votações no detalhe é exibida da mais recente para a mais antiga; a votação de referência permanece na posição cronológica normal e não é promovida para o topo
- Orientações de bancada quando disponíveis via API/cache, em corte posterior do MVP-1
- Cada card de votação exibe data, descrição, resultado da votação, placar e marcador visual quando for a votação de referência do matcher
- Quando o contrato indicar `placarCompleto: true`, o card exibe as categorias completas; quando indicar `placarCompleto: false`, exibe `Sim`, `Não` e `Outros` com rótulo discreto de placar resumido, sem tentar decompor `Outros` no front
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
- Ordenação primária: Score Wilson do matcher, calculado como limite inferior do intervalo de Wilson com `z = 1.96` sobre concordâncias e denominador do matcher
- A compatibilidade bruta continua exibida ao usuário junto com a amostra comparável
- Desempate 1: compatibilidade bruta
- Desempate 2: maior % de presença nas votações de referência das proposições selecionadas
- Desempate 3: candidato em atividade tem prioridade
- Desempate 4: nome do deputado em ordem alfabética, apenas para estabilidade
- Desempate 5: identificador externo do deputado, apenas para estabilidade
- Resultados retornados com paginação; `limit` padrão 20 e máximo 100

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

- **Pesquisa por deputado fora da base.** Se o usuário pesquisa por nome de político que não está no sistema, exibir mensagem explicando que o MVP mapeia apenas deputados federais que já estiveram em atividade na Câmara. Candidatos novos, vereadores, deputados estaduais e senadores serão cobertos em versões futuras.
- **Matcher sem bom match.** Se o resultado do matcher não tem deputado com compatibilidade alta (threshold a definir — ex.: top resultado < 60%), complementar a mensagem de resultado com sugestão explícita ao usuário: considerar candidatos novos fora da base atual. Converte frustração em ação cívica consistente com a missão do produto.

### MVP-3. Perfil do Deputado — versão essencial

Cada deputado tem URL própria canônica (`/deputados/{externalIdDeputado}`) desde o MVP-3, usando o identificador público da Câmara. A primeira carga da página de perfil é renderizada no servidor.

A página exibe breadcrumb no formato "Início > {nome público do deputado}", com "Início" apontando para o feed público em `/`.

Quando `externalIdDeputado` não existir na tabela `deputado`, a rota retorna não encontrado. Quando o deputado existe, mas não tem `deputado_historico`, o perfil continua existindo com dados cadastrais básicos e mensagens de lacuna para snapshot atual, presença e histórico partidário.

O MVP-3 não inclui busca ou listagem própria de deputados; o perfil é acessado por links de outras experiências, como os resultados do matcher.

Os cards e detalhes de resultado do matcher passam a oferecer link para `/deputados/{externalIdDeputado}`. O detalhe do matcher continua sendo a visão contextual da execução; o perfil do deputado é página pública independente.

O contrato público do perfil do deputado é definido em `@vota-comigo/shared-types`, em schemas próprios de deputados, e consumido pela API e pelo frontend sem redeclaração paralela.

O contrato expõe flags explícitas de disponibilidade para evitar inferência por `null` ou lista vazia: disponibilidade do snapshot público, disponibilidade do resumo de presença e disponibilidade do histórico partidário.

A API pública do perfil usa `GET /deputados/{externalIdDeputado}` e retorna o contrato compartilhado do perfil. A rota não recebe filtros no MVP-3.

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
  - Recorte temporal: toda a base ingerida disponível, com texto público deixando claro que a métrica cobre as votações nominais de plenário presentes na base
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

### MVP-4. Perfil do Partido — versão mínima

- Lista de parlamentares do partido
- Orientação de voto nas proposições mais bem posicionadas no ranking público quando disponível via API/cache

Incluído no MVP por reutilizar deputados, partidos, proposições e votações já ingeridos. As orientações são contexto sob demanda e não bloqueiam as engines centrais quando a API da Câmara estiver indisponível.

### MVP-5. Comparativo de Políticos

Duas entradas para a mesma tela de comparação, com escopo lado a lado (inspiração: comparativo de especificações de celular).

**Entrada A — Comparativo geral:**
- Usuário busca políticos por nome/estado
- Seleciona 2-3 políticos
- Vê comparação de informações consolidadas (presença, partidos, votos em proposições relevantes, etc.)

**Entrada B — Comparativo contextual pós-matcher:**
- Na tela de resultado do matcher, usuário seleciona 2-3 dos resultados
- Abre a mesma tela de comparação, com os políticos pré-selecionados
- Default: focar nas proposições escolhidas no matcher — comparação exibe as informações no contexto dessas proposições
- Toggle para expandir a visualização para as informações consolidadas dos políticos (mesma visão da Entrada A)

**Implementação:** a engine de comparação é a mesma. A diferença está nos pontos de entrada e no filtro padrão dos dados exibidos.

### MVP-6. Compartilhamento básico

- Link compartilhável para cada página pública (perfil de político, resultado de matcher, proposição específica, comparativo)
- Meta tags OpenGraph básicas no `<head>` de cada tipo de página: `og:title`, `og:description`, `og:image`, `og:url`
- Tags `twitter:card` para previews no Twitter/X
- Imagem genérica do produto serve como `og:image` no MVP — geração dinâmica de cards por conteúdo fica para melhoria

**Foco de canais:** WhatsApp e Twitter/X. São os canais onde acontece a maior parte do consumo e compartilhamento político no Brasil. Stories (Instagram, Facebook) ficam fora intencionalmente — têm dinâmica e formato diferentes (9:16, vertical) e ROI duvidoso para este tipo de conteúdo.

**Racional:** investimento mínimo (poucas tags HTML por tipo de página) com retorno desproporcional. Link nu no WhatsApp tem taxa de clique muito inferior a link com preview decente.

**Não entra no MVP:**
- Geração dinâmica de imagens de card por conteúdo (por político, por resultado de matcher, etc.)
- Exportação em formato de imagem com marca d'água
- Compartilhamento em redes sociais específicas

### MVP-7. Coleta anonimizada de respostas do matcher

Armazenamento de dados do matcher desde o dia 1, preparando base para feature "Termômetro de Representatividade" em melhorias futuras.

**O que é armazenado por resposta do matcher:**
- Estado do usuário
- Lista de proposições selecionadas e a posição do usuário em cada uma ("deveria ser aprovada", "não deveria", "não sei")
- Timestamp

**O que NÃO é armazenado:**
- IP do usuário
- Fingerprint de navegador
- Qualquer identificador persistente que permita reidentificação
- Nome, email ou qualquer dado pessoal

**Redução de duplicação:**
- Cookie de sessão **não-persistente** (expira quando o navegador é fechado), usado apenas para evitar respostas duplicadas dentro da mesma sessão de uso
- Duplicação entre sessões diferentes ou dispositivos diferentes é aceita — não é problema grave e qualquer solução mais forte (fingerprint, login obrigatório) introduziria risco LGPD ou atrito no uso

**Conformidade LGPD:**
- Política de privacidade explícita descrevendo o que é coletado e para quê
- Dados anonimizados por design, sem vínculo possível a pessoa física
- Agregação estatística como uso final — registros individuais servem apenas para computar agregados

**Pré-requisito para a feature futura "Termômetro":** quando a feature de exibição agregada for implementada (em melhorias), já haverá volume histórico de dados para alimentá-la.

### MVP-8. Otimização mobile

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
5. Páginas públicas têm meta tags OpenGraph e twitter:card funcionando (teste em WhatsApp e Twitter)
6. Coleta anonimizada de respostas do matcher funciona com política de privacidade publicada
7. Comportamentos de borda do matcher implementados: mensagem para pesquisa de deputado fora da base, sugestão de candidatos novos quando matcher não encontra bom match
