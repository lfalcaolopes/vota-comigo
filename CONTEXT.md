# Quem Vota Comigo

Plataforma de transparência política que ajuda cidadãos brasileiros a avaliar deputados federais pelo comportamento real em votações, oferecendo ranking de proposições votadas, matcher de compatibilidade e comparativo entre políticos.

## Language

### Entidades institucionais

**Câmara**: A Câmara dos Deputados, casa baixa do Congresso Nacional brasileiro.

**Legislatura**: Período de quatro anos do mandato coletivo da Câmara, identificado por número (51, 52, ..., 57).

**Plenário**: Órgão da Câmara onde os 513 deputados podem votar. Identificado por `siglaOrgao` igual a `PLEN` ou `CN`.

**Comissão**: Órgão fracionário da Câmara onde apenas deputados membros podem votar.
_Avoid_: Comitê.

### Pessoas e papéis

**Deputado**: Membro eleito da Câmara dos Deputados, identificado por `idDeputado`.
_Avoid_: Parlamentar, congressista, representante.

**Titular**: Deputado eleito ocupando seu mandato.

**Suplente**: Deputado que assume o lugar de um titular afastado.

### Estados e condições

**Mandato**: Período de quatro anos em que um deputado exerce o cargo eletivo.

**Intervalo de exercício**: Par `(dataInicio, dataFim)` representando um período contínuo em que um deputado esteve habilitado a votar. `dataFim` nulo indica intervalo aberto.

**Em exercício**: Condição de um deputado estar habilitado a votar em uma data específica, determinada pelos intervalos de exercício.

**Em atividade**: Condição de um deputado com intervalo de exercício aberto no snapshot mais recente conhecido, usada como desempate no matcher.

**Suplência**: Condição de um suplente quando afastado, geralmente porque o titular retornou.

**Licença**: Condição de um titular temporariamente afastado por motivo formal (cargo executivo, saúde, interesse particular).

**Cassação**: Perda compulsória de mandato por decisão da própria Câmara.
_Avoid_: Impeachment, destituição.

### Proposições e votações

**Proposição**: Item submetido a tramitação na Câmara: PEC, PL, PLP, MPV, PLV, EMS, PDL, RCP, etc. Identificado por `idProposicao`.
_Avoid_: Projeto, propositura.

**Proposição principal**: Papel que uma proposição assume quando agrega proposições derivadas (substitutivos, emendas, apensações) via `uriProposicaoPrincipal`. Conceito de domínio, mas **não ingerido no runner do MVP** (ver ADR 0012); a unidade de exibição do MVP é a proposição afetada.
_Avoid_: Matéria.

**Proposição afetada**: Proposição vinculada a uma votação pelo CSV `votacoesProposicoes-{ano}.csv`. É a fonte canônica do vínculo votação-proposição e a unidade de exibição do produto no MVP.

**Proposição computável pelo matcher**: Proposição com pelo menos uma votação nominal em plenário vinculada e uma votação de referência do matcher escolhida.

**Votação**: Sessão deliberativa em que deputados registram voto sobre uma ou mais proposições afetadas. Identificada por `idVotacao`.

**Votação nominal**: Votação em que o voto individual de cada deputado é registrado.

**Votação de referência do matcher**: Votação nominal em plenário escolhida como votação decisiva de referência de uma proposição no matcher, priorizando votos de mérito decisório descritos pela Câmara e usando turno explícito apenas como fallback controlado, sem usar destaques, requerimentos ou fragmentos procedurais.

**Voto de mérito decisório**: Votação nominal cujo resultado descrito pela Câmara decide o texto-base, substitutivo, medida provisória, projeto, proposta de emenda à Constituição, revisão do Senado ou equivalente substantivo da proposição afetada, em oposição a requerimentos, destaques, preliminares, redação final e fragmentos procedurais.

**Voto fragmentário**: Votação nominal sobre parte isolada da deliberação, como destaque, DTQ, emenda destacada, supressão ou manutenção de trecho, que não representa sozinha a decisão substantiva da proposição afetada.

**Voto procedural**: Votação nominal sobre um passo do rito legislativo, como requerimento, recurso, dispensa de interstício, preferência ou apreciação preliminar, que não representa sozinha a decisão substantiva da proposição afetada.

**Voto de redação final**: Votação nominal que aprova ou rejeita a forma final do texto após a deliberação de mérito, usada no matcher apenas como fallback quando não há voto de mérito decisório nem fallback por turno elegível.

**Resultado da votação**: Interpretação pública do placar de uma votação como aprovada, rejeitada ou indisponível, preservando os números brutos do placar.

**Placar completo**: Contagem agregada dos votos de uma votação nominal por categoria, sem listar os votos individuais dos deputados.

**Fallback por turno**: Critério secundário de escolha da votação de referência do matcher que usa indicação explícita de turno quando o texto da votação não casa com padrões de mérito decisório e não indica voto fragmentário, procedural ou redação final.

**Votação por aclamação**: Votação sem registro individual de voto, fora de escopo do produto.

**Voto computável**: Voto individual com valor `sim`, `não`, `abstenção` ou `obstrução` em uma votação nominal.

**Abstenção**: Voto computável em que o deputado registra participação na votação sem votar `sim` nem `não`.

**Obstrução**: Voto computável em que o deputado registra participação como estratégia parlamentar de dificultar ou atrasar a deliberação, sem votar `sim` nem `não`.

**Posição do usuário**: Resposta declarada pelo usuário sobre uma proposição no matcher: deveria ser aprovada, não deveria ser aprovada ou não sei.

**Artigo 17**: Registro de impedimento regimental do deputado em uma votação nominal, tratado como fora do denominador no matcher.

**Ausência sem motivo conhecido**: Caso em que um deputado em exercício não tem registro individual em uma votação nominal.

**Voto não informado**: Registro individual importado com voto vazio, tratado como fora do denominador por qualidade de dado no matcher.

**Escopo de votação**: Flag derivada de `siglaOrgao` com dois valores: `plenario` (quando sigla é `PLEN` ou `CN`) ou `comissao` (qualquer outra sigla).

### Bancadas e orientação

**Partido**: Agremiação partidária à qual um deputado se filia. Pode mudar ao longo do mandato.

**Federação**: Agrupamento partidário formal registrado no TSE com composição fixa por legislatura.

**Bloco**: Agrupamento partidário tático formado para uma legislatura, com composição variável ao longo do tempo.

**Bancada**: Termo guarda-chuva para qualquer orientador de voto formal: partido, federação ou bloco.
_Avoid_: Liderança (ambíguo).

**Liderança suprapartidária**: Orientador que não representa bancada formal: Governo, Oposição, Maioria, Minoria. Exibido como contexto quando disponível, não usado na cascata.

**Orientação**: Recomendação de voto emitida por uma bancada antes de uma votação.

**Orientação computável**: Orientação com valor `Sim`, `Não` ou `Obstrução`. Valores `Liberado`, `Abstenção` e vazio não são computáveis.

**Cascata de orientação**: Regra de resolução para identificar qual orientação se aplica a um deputado: partido individual → federação → não computável.

**Origem da orientação**: Valor que registra qual nível da cascata efetivamente forneceu a orientação aplicada: `partido` ou `federacao`.

**Quebra de disciplina**: Voto computável de um deputado que diverge da orientação computável resolvida pela cascata.

### Engines do produto

**Ranking de volume de votações em plenário**: Ordenação de proposições afetadas com pelo menos uma votação nominal em plenário vinculada, pela quantidade dessas votações, sem filtro adicional por placar agregado, com empates resolvidos por `ano desc`, `numero desc`, `siglaTipo asc` e `idProposicao asc` apenas como heurística de estabilidade.
_Avoid_: Fórmula de relevância, ranking de relevância.

**Feed de proposições do MVP**: Lista pública de proposições computáveis pelo matcher, ordenada pelo ranking de volume de votações em plenário.

**Proposições mais votadas em plenário**: Nome público do feed de proposições do MVP.
_Avoid_: Proposições que marcaram.

**Sugestão inicial de proposições**: Lista inicial de proposições computáveis pelo matcher apresentada ao usuário a partir do ranking de volume de votações em plenário.

**Polarização**: Medida de quão apertado foi o placar de uma votação.

**Apelido popular**: Nome coloquial reconhecido publicamente para uma proposição, derivado de curadoria manual.

**Matcher**: Engine que calcula compatibilidade entre a posição declarada pelo usuário sobre proposições com votação nominal em plenário vinculada e os votos dos deputados nas votações de referência dessas proposições.

**Compatibilidade**: Percentual de concordância entre o usuário e um deputado, calculado pelo matcher sobre o conjunto de proposições selecionadas.

**Execução válida do matcher**: Execução com lista única de três a trinta proposições computáveis pelo matcher e pelo menos três posições computáveis do usuário.

**UF de resultado do matcher**: Estado mais recente conhecido do deputado, usado para filtrar a visualização padrão dos resultados.

**Cidade informada no matcher**: Município opcional informado pelo usuário, sem efeito no cálculo ou filtro do matcher no MVP.

**Cobertura de exercício no matcher**: Percentual de posições computáveis do usuário em que um deputado estava em exercício e não tinha impedimento por Artigo 17.

**Compatibilidade bruta**: Percentual simples de concordância entre o usuário e um deputado, antes de ajuste por tamanho de amostra.

**Score Wilson do matcher**: Limite inferior do intervalo de Wilson com `z = 1.96`, calculado sobre concordâncias e denominador do matcher, usado para ordenar resultados sem supervalorizar amostras pequenas.

**Amostra pequena no matcher**: Alerta de resultado do matcher quando a amostra comparável de um deputado é menor que 50% das posições computáveis do usuário.

**Sem bom match**: Condição do matcher quando o melhor resultado do escopo consultado tem compatibilidade bruta menor que 60%.

**Resumo de resultado do matcher**: Apresentação enxuta de um deputado no ranking do matcher, com compatibilidade, amostra comparável e alertas curtos.

**Detalhe de resultado do matcher**: Apresentação expandida de um deputado no matcher, com métricas completas e detalhamento voto a voto.

## Relationships

- Uma **Legislatura** contém múltiplos **Deputados** com **Mandatos**.
- Um **Mandato** contém um ou mais **Intervalos de exercício**.
- Um **Deputado** pode ser **Titular** ou **Suplente** em diferentes momentos do mesmo **Mandato**.
- Uma **Proposição principal** agrega uma ou mais **Proposições** derivadas como contexto de tramitação (conceito de domínio, fora da ingestão do MVP — ver ADR 0012).
- Uma **Votação** afeta uma ou mais **Proposições afetadas**.
- Uma **Proposição** pode ser afetada por zero ou mais **Votações**.
- Uma **Proposição computável pelo matcher** é uma **Proposição afetada** com **Votação de referência do matcher**.
- Cada **Proposição computável pelo matcher** tem exatamente uma **Votação de referência do matcher**.
- Para **Proposição** do tipo PEC, a **Votação de referência do matcher** prioriza o segundo turno quando ele existe.
- A **Votação de referência do matcher** é escolhida dentro das **Votações** vinculadas à **Proposição afetada**, sem reconstruir **Proposição principal** ou consolidar proposições derivadas.
- No **Ranking de volume de votações em plenário**, uma **Votação** vinculada a múltiplas **Proposições afetadas** conta uma vez para cada proposição vinculada.
- Uma **Votação** tem **Escopo de votação** igual a `plenario` ou `comissao`.
- Uma **Votação nominal** registra **Votos computáveis** dos **Deputados em exercício** naquela data.
- O **Feed de proposições do MVP** usa o **Ranking de volume de votações em plenário**, mas só inclui **Proposições computáveis pelo matcher**.
- A **Sugestão inicial de proposições** usa as primeiras **Proposições** do **Feed de proposições do MVP**.
- O usuário pode escolher manualmente qualquer **Proposição computável pelo matcher**, mesmo que ela não esteja na **Sugestão inicial de proposições**.
- Para cada **Proposição** selecionada, o **Matcher** compara a **Posição do usuário** com os votos dos deputados na **Votação de referência do matcher**.
- A **Compatibilidade** não inverte a concordância pelo **Resultado da votação**: posição "deveria ser aprovada" concorda com voto `sim`, e posição "não deveria ser aprovada" concorda com voto `não`.
- **Não sei** não entra no cálculo de **Compatibilidade**.
- Uma **Posição do usuário** `não sei` tem o mesmo efeito de não selecionar a **Proposição**: ela é completamente desconsiderada pelo cálculo e pelo detalhe comparativo.
- Uma **Execução válida do matcher** exige lista única de três a trinta **Proposições computáveis pelo matcher** e pelo menos três **Posições do usuário** computáveis.
- O usuário não declara **Abstenção** como **Posição do usuário**.
- Uma **Abstenção** conta como discordância no **Matcher**, com o mesmo efeito de um voto contrário à **Posição do usuário**, preservando o voto real para exibição.
- O usuário não declara **Obstrução** como **Posição do usuário**.
- Uma **Obstrução** conta como discordância no **Matcher**, com o mesmo efeito de um voto contrário à **Posição do usuário**, preservando o voto real para exibição.
- O **Matcher** desconsidera uma **Votação nominal** para um **Deputado** quando ele não estava **Em exercício** ou quando seu registro é **Artigo 17**.
- O **Matcher** desconsidera uma **Votação nominal** para um **Deputado** quando seu registro é **Voto não informado**.
- O **Matcher** exclui do ranking deputados sem histórico suficiente para determinar **Intervalos de exercício**, contabilizando-os como lacuna de dados.
- Uma **Ausência sem motivo conhecido** conta como discordância no **Matcher**.
- A apresentação do **Matcher** preserva a diferença entre voto `sim`, voto `não`, **Abstenção**, **Obstrução** e **Ausência sem motivo conhecido**, mesmo quando esses casos têm o mesmo efeito na **Compatibilidade**.
- A visualização padrão do **Matcher** usa a **UF de resultado do matcher**, enquanto a condição **Em exercício** continua sendo avaliada na data de cada **Votação de referência do matcher**.
- A **Cidade informada no matcher** é preservada como contexto de produto futuro, mas não altera a **Compatibilidade**, o score de ordenação nem o escopo de resultado no MVP.
- O desempate por deputado **Em atividade** no **Matcher** usa o snapshot mais recente conhecido, não a condição **Em exercício** em cada votação histórica.
- O ranking do **Matcher** é ordenado pelo **Score Wilson do matcher**, preservando a **Compatibilidade bruta** e a amostra comparável para exibição.
- O **Resumo de resultado do matcher** preserva a transparência de amostra sem exibir todas as métricas; o **Detalhe de resultado do matcher** contém métricas completas e detalhamento voto a voto.
- O **Matcher** sinaliza **Sem bom match** quando o melhor resultado do escopo consultado tem **Compatibilidade bruta** menor que 60%.
- Uma **Bancada** emite **Orientação** para uma **Votação**.
- Um **Partido** pertence a zero ou uma **Federação** e a zero ou um **Bloco** em uma dada **Legislatura**.
- Quando uma **Federação** orienta, os **Partidos** membros não orientam separadamente naquela **Votação**.
- Um **Bloco** pode emitir **Orientação** exibida como contexto da **Votação**, mas não é resolvido pela **Cascata de orientação**.
- A **Cascata de orientação** resolve para um par (**Deputado**, **Votação**) qual **Orientação** se aplica e qual a **Origem da orientação**.
- Quando a **Orientação computável** resolvida é `Obstrução`, um **Voto computável** `obstrução` conta como alinhamento à bancada.
- Quando a **Orientação computável** resolvida é `Obstrução`, **Votos computáveis** `sim`, `não` e `abstenção` contam como quebra de disciplina.
- Quando a **Orientação computável** resolvida é `Sim` ou `Não`, **Votos computáveis** `abstenção` e `obstrução` contam como quebra de disciplina.
- Uma **Quebra de disciplina** ocorre quando o **Voto computável** de um **Deputado** diverge da **Orientação computável** resolvida pela cascata.
- O **Ranking de volume de votações em plenário** e o **Matcher** consideram apenas **Votações** com **Escopo de votação** igual a `plenario`.

## Flagged ambiguities

- **Matéria** foi usada em discussões anteriores como agrupador de votações relacionadas. Resolvido: o termo canônico é **proposição principal**. "Matéria" não deve aparecer em código nem em documentação interna nova. A proposição principal é um conceito de domínio; não é ingerida no runner do MVP (ver ADR 0012).
- **Liderança** foi usada para se referir tanto a bancadas formais quanto a Governo/Oposição/Maioria/Minoria. Resolvido: bancadas formais são **partido**, **federação** ou **bloco**; os outros quatro são **liderança suprapartidária**. "Liderança" sozinho deve ser evitado.
- **Parlamentar** foi usado intercambiavelmente com **deputado**. Resolvido: no escopo do MVP, só existem **deputados**. Quando o produto cobrir Senado, **senador** entra como termo distinto e **parlamentar** pode reaparecer como guarda-chuva.
- **Fórmula de relevância** e **Proposições que marcaram** foram usados para um ranking por importância pública. Resolvido: no MVP, o ranking é **Ranking de volume de votações em plenário** e o nome público é **Proposições mais votadas em plenário**; ele não mede relevância, saliência pública ou importância política.
- **Proposições sem votação de referência do matcher** não entram no **Feed de proposições do MVP** nem na escolha do **Matcher**. O **Ranking de volume de votações em plenário** continua existindo como ordenação metodológica, mas o produto público do MVP só exibe proposições com uma votação nominal representativa da decisão substantiva.
- **MVP-1** se refere à feature **Feed / Ranking de Proposições Importantes** descrita em `docs/mvp.md`, não ao MVP inteiro nem à primeira entrega técnica do backend.
