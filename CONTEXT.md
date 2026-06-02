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

**Votação**: Sessão deliberativa em que deputados registram voto sobre uma ou mais proposições afetadas. Identificada por `idVotacao`.

**Votação nominal**: Votação em que o voto individual de cada deputado é registrado.

**Votação por aclamação**: Votação sem registro individual de voto, fora de escopo do produto.

**Voto computável**: Voto individual com valor `sim`, `não` ou `abstenção` em uma votação nominal.

**Artigo 17**: Registro de impedimento regimental do deputado em uma votação nominal, tratado como fora do denominador no matcher.

**Ausência sem motivo conhecido**: Caso em que um deputado em exercício não tem registro individual em uma votação nominal.

**Escopo de votação**: Flag derivada de `siglaOrgao` com dois valores: `plenario` (quando sigla é `PLEN` ou `CN`) ou `comissao` (qualquer outra sigla).

### Bancadas e orientação

**Partido**: Agremiação partidária à qual um deputado se filia. Pode mudar ao longo do mandato.

**Federação**: Agrupamento partidário formal registrado no TSE com composição fixa por legislatura.

**Bloco**: Agrupamento partidário tático formado para uma legislatura, com composição variável ao longo do tempo.

**Bancada**: Termo guarda-chuva para qualquer orientador de voto formal: partido, federação ou bloco.
_Avoid_: Liderança (ambíguo).

**Liderança suprapartidária**: Orientador que não representa bancada formal: Governo, Oposição, Maioria, Minoria. Exibido como contexto quando disponível, não usado na cascata.

**Orientação**: Recomendação de voto emitida por uma bancada antes de uma votação.

**Orientação computável**: Orientação com valor `Sim`, `Não` ou `Obstrução`. Valores `Liberado` e vazio não são computáveis.

**Cascata de orientação**: Regra de resolução para identificar qual orientação se aplica a um deputado: partido individual → federação → não computável.

**Origem da orientação**: Valor que registra qual nível da cascata efetivamente forneceu a orientação aplicada: `partido` ou `federacao`.

**Quebra de disciplina**: Voto computável de um deputado que diverge da orientação computável resolvida pela cascata.

### Engines do produto

**Fórmula de relevância**: Score composto que ranqueia proposições votadas por importância, combinando fatores objetivos auditáveis derivados das votações associadas.

**Proposições que marcaram**: Ranking público de proposições votadas produzido pela fórmula de relevância.

**Polarização**: Fator da fórmula que mede quão apertado foi o placar de uma votação.

**Apelido popular**: Fator binário da fórmula indicando que a proposição tem nome coloquial reconhecido publicamente, derivado de curadoria manual.

**Matcher**: Engine que calcula compatibilidade entre a posição declarada pelo usuário sobre proposições selecionadas e os votos dos deputados nas votações nominais vinculadas a essas proposições.

**Compatibilidade**: Percentual de concordância entre o usuário e um deputado, calculado pelo matcher sobre o conjunto de proposições selecionadas.

## Relationships

- Uma **Legislatura** contém múltiplos **Deputados** com **Mandatos**.
- Um **Mandato** contém um ou mais **Intervalos de exercício**.
- Um **Deputado** pode ser **Titular** ou **Suplente** em diferentes momentos do mesmo **Mandato**.
- Uma **Proposição principal** agrega uma ou mais **Proposições** derivadas como contexto de tramitação (conceito de domínio, fora da ingestão do MVP — ver ADR 0012).
- Uma **Votação** afeta uma ou mais **Proposições afetadas**.
- Uma **Proposição** pode ser afetada por zero ou mais **Votações**.
- Uma **Votação** tem **Escopo de votação** igual a `plenario` ou `comissao`.
- Uma **Votação nominal** registra **Votos computáveis** dos **Deputados em exercício** naquela data.
- O **Matcher** desconsidera uma **Votação nominal** para um **Deputado** quando ele não estava **Em exercício** ou quando seu registro é **Artigo 17**.
- Uma **Ausência sem motivo conhecido** conta como discordância no **Matcher**.
- Uma **Bancada** emite **Orientação** para uma **Votação**.
- Um **Partido** pertence a zero ou uma **Federação** e a zero ou um **Bloco** em uma dada **Legislatura**.
- Quando uma **Federação** orienta, os **Partidos** membros não orientam separadamente naquela **Votação**.
- Um **Bloco** pode emitir **Orientação** exibida como contexto da **Votação**, mas não é resolvido pela **Cascata de orientação**.
- A **Cascata de orientação** resolve para um par (**Deputado**, **Votação**) qual **Orientação** se aplica e qual a **Origem da orientação**.
- Uma **Quebra de disciplina** ocorre quando o **Voto computável** de um **Deputado** diverge da **Orientação computável** resolvida pela cascata.
- A **Fórmula de relevância** e o **Matcher** consideram apenas **Votações** com **Escopo de votação** igual a `plenario`.

## Flagged ambiguities

- **Matéria** foi usada em discussões anteriores como agrupador de votações relacionadas. Resolvido: o termo canônico é **proposição principal**. "Matéria" não deve aparecer em código nem em documentação interna nova. A proposição principal é um conceito de domínio; não é ingerida no runner do MVP (ver ADR 0012).
- **Liderança** foi usada para se referir tanto a bancadas formais quanto a Governo/Oposição/Maioria/Minoria. Resolvido: bancadas formais são **partido**, **federação** ou **bloco**; os outros quatro são **liderança suprapartidária**. "Liderança" sozinho deve ser evitado.
- **Parlamentar** foi usado intercambiavelmente com **deputado**. Resolvido: no escopo do MVP, só existem **deputados**. Quando o produto cobrir Senado, **senador** entra como termo distinto e **parlamentar** pode reaparecer como guarda-chuva.
