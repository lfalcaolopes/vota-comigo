# Quem Vota Comigo — MVP

## Objetivo

A primeira versão pública do produto. O conjunto mínimo de features que entrega valor real ao cidadão e justifica colocar o site no ar.

**Missão central:** ajudar o usuário a decidir em quem votar, comparando suas preferências com o comportamento real (votos) dos deputados federais.

Princípio de escopo: uma feature só entra no MVP se sua ausência torna o produto inútil. Tudo que é "bom ter" vai para melhorias pós-MVP.

## Pré-requisitos

O MVP só começa quando o Protótipo cumprir seu critério de saída: ranking dos 20 eventos mais relevantes de um ano considerado publicamente defensável, com dados reais da Câmara dos Deputados ingeridos e schema modelado.

## Escopo do produto

O produto no MVP cobre exclusivamente **deputados federais com histórico de votação registrado**. Na UI deve ficar explícito: candidatos em primeira eleição, vereadores, deputados estaduais, senadores e outros perfis não são cobertos nesta versão. Isso é transparência metodológica, não limitação escondida.

---

## Features do MVP

### MVP-1. Feed / Ranking de Eventos Importantes

Lista pública, sem necessidade de login, dos eventos mais relevantes segundo a fórmula calibrada no Protótipo.

**Apresentação em lista:**
- Informações enxutas: título, data, tipo de proposição, resultado
- Ordenada por score de relevância

**Modal / expansão ao clicar:**
- Detalhes completos da votação
- Orientação de cada partido
- Placar completo
- Link para a fonte oficial na Câmara
- Contexto adicional quando disponível (regime de urgência, destaques, etc.)

**Não entra no MVP:**
- Resumo por IA
- Classificação "quem é afetado"
- Filtros por categoria/comissão temática

### MVP-2. Matcher — "Quem vota com você"

Ferramenta de compatibilidade entre usuário e deputados com base nos votos. Framing neutro intencionalmente: serve tanto para decidir voto (missão central) quanto para avaliar representação atual.

**Fluxo:**
1. Usuário clica para iniciar
2. Informa estado (obrigatório) e cidade (opcional, preparando para cobertura municipal futura)
3. Sistema apresenta os 5 eventos mais relevantes, já pré-selecionados. Usuário pode:
   - Expandir para ver/selecionar mais eventos
   - Desselecionar eventos pré-selecionados
   - Buscar eventos específicos por texto
4. Para cada evento selecionado: contexto inicial, link para fonte, usuário vota "deveria ser aprovado", "não deveria" ou "não sei" (não entra no cálculo)
5. Resultado: lista ordenada por % de concordância

**Tratamento de ausências:**
- Justificada (licença médica, missão oficial): neutro, não entra no cálculo
- Sem justificativa: conta como discordância

**Tratamento de eventos fora do mandato do deputado:**

Quando um deputado não estava em exercício durante uma das votações selecionadas pelo usuário, a votação específica é desconsiderada para aquele deputado (não entra no cálculo), mas o deputado continua no ranking.

Isso cria o problema de amostra desigual (ver abaixo), que precisa ser tratado.

**Ordenação e desempate:**
- Ordenação primária: % de concordância com o usuário
- Desempate 1: maior % de presença nas votações selecionadas
- Desempate 2: candidato em atividade tem prioridade

**Casos de desempate e amostra que exigem decisão documentada antes de codar:**

Esses casos foram identificados durante a discussão e precisam ser resolvidos durante a construção do MVP, não deixados implícitos:

- **Amostra desigual por ausência.** Deputado que votou 3 de 5 matérias selecionadas (2 ausências injustificadas contando como discordância) pode ter o mesmo % que deputado que votou todas as 5 com 3 concordâncias. Situações diferentes sendo tratadas como iguais.
- **Amostra desigual por mandato.** Deputado que estava em exercício em 5 de 20 eventos selecionados vs. deputado em exercício em todos os 20. O primeiro pode ter 100% de compatibilidade calculado sobre 5 votos; comparar com alguém que tem 80% sobre 20 é enganoso.
- **Volume diferente.** Candidato com 100% de concordância em 2 votações vs. candidato com 90% em 20 votações. Amostra maior é estatisticamente mais confiável.

**Direções de tratamento a decidir na construção:**
- Threshold mínimo de votos efetivos (ex.: 30-50% dos eventos selecionados) para aparecer nos primeiros resultados. Abaixo disso, listar numa seção separada tipo "deputados com pouco histórico relevante".
- Exibição transparente por deputado: "100% de compatibilidade (3 de 20 votações — deputado estava em exercício em 3)". O usuário vê a confiabilidade do número.
- Ordenação secundária que considera tamanho de amostra entre deputados empatados em %.

**Decisão já tomada:** todos os eventos selecionados pelo usuário têm peso igual no cálculo de compatibilidade. O score de relevância dos eventos serve apenas para ordenar a listagem de eventos, não influencia o cálculo do matcher.

**Ao clicar no candidato no resultado:**
- % de participação nas votações selecionadas
- Indicação de em quais o deputado estava em exercício e em quais não
- Justificativas de ausência quando houver
- Para cada voto: alinhado ou contra a orientação do partido
- Detalhamento voto a voto: em quais o usuário concordou, em quais discordou

**Opções de visualização:**
- Default: deputados do estado informado pelo usuário
- Toggle para expandir a visualização para todos os deputados, caso o usuário queira

**Comportamentos de borda:**

- **Pesquisa por deputado fora da base.** Se o usuário pesquisa por nome de político que não está no sistema, exibir mensagem explicando que o MVP mapeia apenas deputados federais que já estiveram em atividade na Câmara. Candidatos novos, vereadores, deputados estaduais e senadores serão cobertos em versões futuras.
- **Matcher sem bom match.** Se o resultado do matcher não tem deputado com compatibilidade alta (threshold a definir — ex.: top resultado < 60%), complementar a mensagem de resultado com sugestão explícita ao usuário: considerar candidatos novos fora da base atual. Converte frustração em ação cívica consistente com a missão do produto.

### MVP-3. Perfil do Político — versão essencial

**Entra no MVP:**
- Dados básicos (nome, partido atual, estado, foto, cargo)
- Votos nos eventos mais relevantes (lista com filtro)
- Presença: total, com justificativa, sem justificativa
- Histórico de partidos

**Não entra no MVP:**
- Cota parlamentar / gastos
- Projetos apresentados
- Frentes parlamentares
- Cargos em comissões
- Emendas parlamentares
- Labels ("mais presente", "mais faltoso") que dependem de rankings globais

### MVP-4. Perfil do Partido — versão mínima

- Lista de parlamentares do partido
- Orientação de voto nos eventos mais relevantes

Incluído no MVP por ser praticamente gratuito — os dados já estão disponíveis na ingestão.

### MVP-5. Comparativo de Políticos

Duas entradas para a mesma tela de comparação, com escopo lado a lado (inspiração: comparativo de especificações de celular).

**Entrada A — Comparativo geral:**
- Usuário busca políticos por nome/estado
- Seleciona 2-3 políticos
- Vê comparação de informações consolidadas (presença, partidos, votos em matérias relevantes, etc.)

**Entrada B — Comparativo contextual pós-matcher:**
- Na tela de resultado do matcher, usuário seleciona 2-3 dos resultados
- Abre a mesma tela de comparação, com os políticos pré-selecionados
- Default: focar nas votações escolhidas no matcher — comparação exibe as informações no contexto dessas matérias
- Toggle para expandir a visualização para as informações consolidadas dos políticos (mesma visão da Entrada A)

**Implementação:** a engine de comparação é a mesma. A diferença está nos pontos de entrada e no filtro padrão dos dados exibidos.

### MVP-6. Compartilhamento básico

- Link compartilhável para cada página pública (perfil de político, resultado de matcher, evento específico, comparativo)
- Meta tags OpenGraph básicas no `<head>` de cada tipo de página: `og:title`, `og:description`, `og:image`, `og:url`
- Tags `twitter:card` para previews no Twitter/X
- Imagem genérica do produto serve como `og:image` no MVP — geração dinâmica de cards por conteúdo fica para melhoria

**Foco de canais:** WhatsApp e Twitter/X. São os canais onde acontece a maior parte do consumo e compartilhamento político no Brasil. Stories (Instagram, Facebook) ficam fora intencionalmente — têm dinâmica e formato diferentes (9:16, vertical) e ROI duvidoso para este tipo de conteúdo.

**Racional:** investimento mínimo (poucas tags HTML por tipo de página) com retorno desproporcional. Link nu no WhatsApp tem taxa de clique muito inferior a link com preview decente.

**Não entra no MVP:**
- Geração dinâmica de imagens de card por conteúdo (por político, por resultado de matcher, etc.)
- Exportação em formato de imagem com marca d'água
- Compartilhamento em redes sociais específicas

### MVP-7. Export do candidato escolhido

Após o usuário rodar o matcher e identificar um candidato com alta compatibilidade, oferecer opção de salvar os dados essenciais para consulta no dia da votação.

**Escopo:**
- Card simples com nome, número de urna, partido, cargo
- Possibilidade de salvar como imagem na galeria do celular

**Racional:** conecta diretamente com a missão do produto (ajudar a decidir o voto). Os dados dos deputados em atividade tentando reeleição já estão no sistema; adicionar número de urna é um campo extra no perfil. Baixo custo de implementação para valor direto ao usuário no momento mais importante (o dia da eleição).

**Consideração:** o número de urna pode variar entre pleitos. Para deputados em atividade tentando reeleição, o número costuma ser mantido, mas isso precisa ser revisitado quando a integração TSE for implementada.

### MVP-8. Coleta anonimizada de respostas do matcher

Armazenamento de dados do matcher desde o dia 1, preparando base para feature "Termômetro de Representatividade" em melhorias futuras.

**O que é armazenado por resposta do matcher:**
- Estado do usuário
- Lista de eventos selecionados e o voto do usuário em cada um ("deveria ser aprovado", "não deveria", "não sei")
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

### MVP-9. Otimização mobile

Estratégia: desenvolvimento desktop-first durante a construção do MVP, mas mobile **precisa estar refinado antes do lançamento**.

**Racional:** no Brasil, consumo político-informativo acontece majoritariamente via WhatsApp e redes sociais, usados predominantemente no celular. Uma ferramenta de accountability política que não funciona bem no mobile não cumpre sua missão.

**Alerta registrado:** "refinar mobile antes de lançar" vira "refazer mobile" se o desenvolvimento ignora mobile por completo. Durante a construção de cada feature, testar o layout principal em mobile mesmo sem polimento, para detectar cedo problemas estruturais na arquitetura de componentes.

---

## Critério de lançamento

O MVP está pronto para ir ao ar quando:

1. Todas as features acima funcionam com dados reais atualizados da Câmara
2. Mobile está refinado, não apenas funcional
3. A fórmula de relevância, calibrada no Protótipo, continua produzindo rankings defensáveis com os dados mais recentes
4. Os casos de amostra desigual e desempate do matcher estão decididos e documentados
5. Páginas públicas têm meta tags OpenGraph e twitter:card funcionando (teste em WhatsApp e Twitter)
6. Coleta anonimizada de respostas do matcher funciona com política de privacidade publicada
7. Comportamentos de borda do matcher implementados: mensagem para pesquisa de deputado fora da base, sugestão de candidatos novos quando matcher não encontra bom match
