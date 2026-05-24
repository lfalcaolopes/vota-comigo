# Quem Vota Comigo — Decisão de Ingestão vs. Busca sob Demanda

## Contexto

Este documento consolida a decisão de quais CSVs do `dadosabertos.camara.leg.br` são ingeridos no banco de dados do produto e quais são acessados sob demanda via API com cache.

## Critério utilizado

Cada dataset foi avaliado com três perguntas, nesta ordem:

1. **Alimenta engine central?** (fórmula de relevância, matcher, comparativo) → Se sim, ingerir.
2. **Precisa de cruzamento com outros dados no banco?** (joins, agregações, queries compostas) → Se sim, ingerir.
3. **É só exibição, sem cruzamento?** → Busca sob demanda via API, com cache de TTL longo para dados históricos.

Consideração adicional: se o volume é muito pequeno (dezenas ou centenas de registros) e há utilidade provável mesmo que não imediata, ingerir por desencargo de consciência.

## Premissas das projeções

- **Base:** contagens reais de `*-2025.csv`, fornecidas por análise automatizada.
- **Projeção 10 anos:** 2016–2025. Assume volume anual similar a 2025. Na prática, anos eleitorais tendem a ter menos votações e anos pós-eleição mais, mas a ordem de grandeza se mantém.
- **Projeção 25 anos:** 2001–2025. Mesmo critério. Anos mais antigos (2001–2010) podem ter menos votações nominais registradas digitalmente; a projeção é um teto, não uma estimativa precisa.
- **Registros úteis:** quando aplicável, indica o volume após filtros (votações nominais), que é o que efetivamente entra no banco.
- Arquivos sem sufixo de ano (ex.: `deputados.csv`, `orgaos.csv`) são únicos e acumulam histórico — a projeção não é "multiplicar por N anos", é o tamanho atual do arquivo.

---

## Arquivos ingeridos

### votacoes-{ano}.csv

**Justificativa:** core da fórmula de relevância. Cada votação nominal fornece insumos objetivos para o ranking de proposições e para o matcher. O campo `siglaOrgao` é usado para derivar a flag `escopo_votacao` (plenário vs. comissão). Votações não nominais (simbólicas e outras) não são ingeridas — não alimentam polarização nem o matcher. Se necessário exibir uma votação não nominal no contexto de uma proposição, buscar via API.

**Filtro de ingestão:** apenas registros cuja `id` aparece em `votacoesVotos-{ano}.csv` (proxy para votação nominal).

**Campos derivados na ingestão** (calculados a partir de `votacoesVotos`, lido durante a ingestão mas não persistido no banco):
- `placar_sim` / `placar_nao` / `placar_abstencao` / `placar_obstrucao` — contagens agregadas dos votos
- `total_votantes` — total de deputados que votaram
- `escopo_votacao` — flag derivada: `plenario` quando `siglaOrgao` é `PLEN` ou `CN`, `comissao` para qualquer outro valor. Lógica de aplicação, não lookup de tabela.
- `tem_apelido` — boolean indicando se alguma proposição afetada tem apelido popular na tabela de apelidos

**Complementação via API:** os campos `descUltimaAberturaVotacao` e `descUltimaApresentacaoProposicao` não existem nos CSVs anuais. A ingestão cria o esqueleto da votação a partir do CSV e consulta `GET /votacoes/{id}` para complementar esses textos. A identidade da peça votada é preservada como texto descritivo, junto com `descricao`; não há classificação de tipo regimental por regex.

O banco persiste os **insumos** do cálculo de relevância, não os scores. O `score_relevancia` e seus componentes (`score_polarizacao`, `score_tipo_proposicao`, `score_apelido`) são calculados em runtime pela aplicação usando pesos configuráveis. Isso permite ajustar pesos sem reprocessar a ingestão.



---

### votacao_proposicao_afetada (relação derivada)

| Métrica | Valor |
|---------|-------|
| Registros úteis (2025) | ~568 vínculos para votações nominais |
| Projeção 10 anos | ~5.680 |
| Projeção 25 anos | ~14.200 |

**Justificativa:** relação derivada durante a ingestão a partir de `votacoesProposicoes-{ano}.csv`, o CSV que lista as proposições afetadas por cada votação. Liga cada votação nominal às proposições que ela afeta. A fórmula de relevância precisa do `codTipo` da proposição (peso 0.20), e o feed/matcher precisam de título e ementa. Sem essa relação, a votação é um ID sem contexto.

**Fonte de derivação:**
- `votacoesProposicoes-{ano}.csv` (10.292 registros brutos em 2025, 568 para votações nominais) — proposições afetadas pela votação

`votacoesObjetos-{ano}.csv` não é fonte de derivação nem fallback. Ele lista possíveis objetos da votação, acumulando proposições derivadas ao longo da tramitação, e não é vínculo canônico confiável.

**Campos da tabela:**
- `votacao_id`
- `proposicao_id`
- `ano_csv`

**Regra de derivação:** para cada linha útil de `votacoesProposicoes-{ano}.csv`, persistir o par (`votacao_id`, `proposicao_id`). Se uma votação tiver várias proposições afetadas, persistir todos os pares. Não há seleção de proposição principal, confiança categórica, origem por objeto ou revisão manual do vínculo.

**Exibição de detalhes completos:** quando o usuário abre o detalhe de uma votação, os textos ricos da votação vêm de `GET /votacoes/{id}`. A relação com proposições exibidas usa as proposições afetadas persistidas; objetos possíveis da votação não são usados como fonte canônica.

---

### proposicoes-{ano}.csv

| Métrica | Valor |
|---------|-------|
| Registros brutos (2025) | 107.556 |
| Registros úteis (afetadas por votações nominais, 2025) | ~400–500 proposições únicas referenciadas por `votacao_proposicao_afetada` |
| Projeção 10 anos (úteis) | ~4.000–5.000 |
| Projeção 25 anos (úteis) | ~10.000–12.500 |

**Justificativa:** dados da proposição (tipo, ementa, número, ano, tramitação) são necessários para exibir o feed de proposições votadas e o contexto do matcher. O `codTipo` é usado como input do fator "tipo de proposição" (peso 0.20) na fórmula de relevância — PEC pesa mais que requerimento — mas não é usado como filtro de ingestão.

**Escopo refinado:** ingerir apenas as proposições que aparecem na relação `votacao_proposicao_afetada`. Proposições que não foram afetadas por votação nominal ingerida não entram. Não há filtro por `codTipo` — qualquer tipo de proposição afetada por uma votação nominal é ingerido.

**Observação:** votações de um ano podem referenciar proposições apresentadas em anos anteriores. A ingestão de `proposicoes` precisa cobrir múltiplos anos conforme necessário, não só o ano corrente.

**Proposições como contexto de atividade do deputado** (quantas criou, quantas foram aprovadas) são acessadas via API com `GET /proposicoes?idAutor={id}`, com cache de algumas horas. Não requer ingestão nem de `proposicoes` em massa nem de `proposicoesAutores`.

---

### proposicoesTemas-{ano}.csv

| Métrica | Valor |
|---------|-------|
| Registros brutos (2025) | 40.838 |
| Registros úteis (apenas de proposições ingeridas, 2025) | A definir após cruzamento |
| Projeção 10 anos (úteis) | A definir |
| Projeção 25 anos (úteis) | A definir |

**Justificativa:** classificação temática oficial da Câmara, usada como filtro no feed e no matcher (Tier 1 de melhorias). Ingerida desde o protótipo para validar cobertura e preparar o schema.

**Problema de cobertura identificado:** o arquivo `proposicoesTemas-{ano}` só traz temas de proposições apresentadas naquele ano. Muitas proposições votadas em 2025 foram apresentadas em anos anteriores. Cobertura real sobre proposições afetadas por votações nominais de 2025: ~12,5%. Para cobertura adequada, é necessário carregar `proposicoesTemas` de múltiplos anos.

**Filtro de ingestão:** apenas registros referentes a proposições efetivamente ingeridas.

---

### deputados.csv

| Métrica | Valor |
|---------|-------|
| Registros (arquivo único, acumulado) | 7.883 |
| Projeção 10 anos | Mesmo arquivo — cresce ~500 por legislatura |
| Projeção 25 anos | Mesmo arquivo |

**Justificativa:** entidade central do produto. Nome, URI, legislaturas de atuação. Tudo cruza com deputado — matcher, perfil, comparativo.

**Observação importante:** o CSV não contém campo de partido. A relação deputado↔partido no momento do voto vem da API (`GET /votacoes/{id}/votos` retorna `siglaPartido` por deputado). Para exibir "partido atual" no perfil, usar o endpoint `/deputados/{id}` da API.

---

### legislaturas.csv

| Métrica | Valor |
|---------|-------|
| Registros (arquivo único) | 57 |
| Projeção 10 anos | Mesmo arquivo (+1 a cada 4 anos) |
| Projeção 25 anos | Mesmo arquivo |

**Justificativa:** necessário para determinar se deputado estava em exercício durante uma votação (tratamento de mandato no matcher). Datas de início e fim de cada legislatura. Volume irrelevante.

---

---

## Arquivos sob demanda (API + cache)

### orgaosDeputados-L{legislatura}.csv

| Métrica | Valor |
|---------|-------|
| Registros (legislatura 57) | 12.789 |
| Projeção 10 anos | ~25.000 (2-3 legislaturas) |
| Projeção 25 anos | ~75.000 (6-7 legislaturas) |

**Justificativa:** liga deputado a comissões na legislatura. Necessário apenas quando a feature de "cargos em comissões atuais e históricos" entrar no perfil completo (Tier 2 do roadmap de melhorias). Fora do MVP, que cobre exclusivamente votações de plenário onde todos os 513 deputados podem votar — não há necessidade de saber pertencimento a comissão.

Quando a feature entrar, revisitar se ingestão é necessária ou se busca via API (`GET /deputados/{id}/orgaos`) com cache resolve. Volume documentado aqui para referência futura.

---

### votacoesVotos-{ano}.csv (insumo de derivação + API sob demanda)

| Registros brutos (2025) | 175.067 |
|---|---|
| Registros úteis (2025) | ~175.000 |

**Justificativa:** é o arquivo mais volumoso (~95% do banco se fosse ingerido). Lido durante a ingestão para calcular campos derivados na tabela de votações (placar, `total_votantes`), mas não persistido no banco.

Em runtime, os votos individuais são buscados via API (`GET /votacoes/{id}/votos`) sob demanda para:
- **Matcher:** após o usuário submeter suas escolhas, buscar votos de cada votação selecionada (5-20 chamadas paralelas).
- **Perfil do deputado (MVP-3):** "votos nas proposições mais relevantes" buscados via API.
- **Comparativo pós-matcher (MVP-5):** usa os dados já buscados para o matcher, sem chamadas adicionais.

**Observações de qualidade (a tratar na ingestão):**
- 421 registros com campo `voto` vazio — investigar se são erro de dados ou tipo de ausência.
- 420 registros com valor `Artigo 17` — Art. 17 do Regimento Interno (impedimento por conflito de interesse). No matcher, tratar como ausência justificada (neutro, não entra no cálculo).

**Risco documentado:** dependência da API da Câmara para o core do produto. Se a API ficar indisponível, o matcher e o perfil do deputado ficam degradados (feed de proposições e ranking continuam funcionando com campos derivados locais).

**Ideias para mitigação futura (não implementadas):** três estratégias estão registradas como possíveis caminhos caso a dependência da API se mostre problemática em produção. A decisão sobre qual adotar (ou combinar) fica para o momento em que a necessidade for de fato identificada.

**Ideia 1 — Cache agressivo no nível da aplicação.** Manter `votacoesVotos` fora do banco, mas implementar camada de cache com TTL longo (votações passadas não mudam). As votações mais relevantes pelo score seriam pré-aquecidas no cache. Latência estimada para o matcher: 1-3 segundos com paralelismo para votações fora do cache. Pros: nenhum custo de armazenamento adicional, arquitetura mais simples. Contras: a dependência da API continua existindo; cache cold start em deploys novos; complexidade de invalidação para casos onde a Câmara corrige dados retroativamente.

**Ideia 2 — Ingerir votos das top 100 votações de plenário.** Persistir no banco apenas os votos das 100 votações de maior `score_relevancia` em plenário, considerando toda a janela ingerida (não top 100 por ano). Volume estimado: ~40 mil registros totais. Regra estritamente aditiva: quando uma votação entra no top 100, seus votos são baixados e armazenados; quando uma votação sai, seus votos permanecem persistidos. Não há processo de remoção. Pros: resolve o caso de uso mais frequente (matcher e modal do feed para votações relevantes) sem volume excessivo; mantém votações fora do top via API com cache. Contras: API continua sendo necessária para votações fora do top 100 escolhidas via busca no matcher; complexidade adicional de processo de promoção a cada ingestão.

**Ideia 3 — Persistência por votação em JSONB.** Em vez de armazenar uma linha por (votação, deputado), armazenar uma linha por votação contendo os votos individuais como JSON estruturado (`{"sim": [id1, id2, ...], "nao": [...], "abstencao": [...], "obstrucao": [...]}`). Volume estimado: ~13.750 registros em 25 anos (uma por votação nominal), cada um com ~400 IDs de deputado. Tamanho total estimado: ~70MB. Pros: redução de ~30x no número de linhas vs. ingestão relacional bruta; resolve o caso de uso primário (carregar todos os votos de uma votação) com uma única query; SQL/JSONB padrão sem tecnologia exótica; suporta query reversa via índice GIN se necessário. Contras: queries do tipo "todos os votos de um deputado X em N votações" exigem busca dentro de JSONB (viável, mas mais complexa que SQL puro); update de voto específico requer reescrever o JSON inteiro (não é problema aqui, votos não mudam).

**Combinações possíveis.** As três ideias não são mutuamente exclusivas. Por exemplo: Ideia 3 (JSONB) para todas as votações + Ideia 1 (cache) para acelerar leitura ainda mais. Ou Ideia 2 (top 100 ingeridas) + Ideia 1 (cache para o restante).

---

### votacoesOrientacoes-{ano}.csv (API sob demanda)

| Registros brutos (2025) | 4.947 |
|---|---|
| Registros de plenário (2025) | ~4.100 |

**Justificativa:** orientação de bancada é exibida como contexto da votação no modal do feed e no detalhe da proposição. Sem cruzamento com engines centrais.

Em runtime, orientações são buscadas via API (`GET /votacoes/{id}/orientacoes`) sob demanda para exibição no modal da proposição ("orientação de cada partido nesta votação"). Cache com TTL longo.

**Tratamento de tipos de orientadores:** partidos individuais, federações, blocos e lideranças suprapartidárias (Governo, Oposição, Maioria, Minoria) são todos retornados pela API como orientações da votação, sem cascateamento para o deputado individual (conforme ADR 0005). O campo `siglaBancada` identifica o tipo.

**Mesmo risco e mitigação de `votacoesVotos`:** se necessário ingerir no futuro, é operação aditiva.

### votacoesObjetos-{ano}.csv (descartado)

| Registros brutos (2025) | 102.037 |
|---|---|
| Registros de votações nominais (2025) | 28.206 |

**Justificativa:** lista possíveis objetos de cada votação, acumulando proposições derivadas ao longo da tramitação. O nome do arquivo sugere uma chave mais forte do que o dado oferece. Não é baixado pela pipeline padrão, não é ingerido no banco e não é usado como fallback para vínculo votação-proposição.

---

### votacoesProposicoes-{ano}.csv (insumo de vínculo)

| Registros brutos (2025) | 10.292 |
|---|---|
| Registros de votações nominais (2025) | 568 |

**Justificativa:** lista as proposições afetadas por cada votação. É a fonte exclusiva do vínculo canônico votação-proposição. A ingestão persiste os pares úteis em `votacao_proposicao_afetada`, preservando a cardinalidade N:N.

---

### orgaos.csv

| Registros (arquivo único) | 3.823 |
|---|---|

**Justificativa:** o uso principal era derivar `escopo_votacao` (plenário vs. comissão), mas essa lógica é uma constante de aplicação: `siglaOrgao` é `PLEN` ou `CN` → plenário, qualquer outra coisa → comissão. O `siglaOrgao` já vem no registro da votação — não precisa de tabela de órgãos. O nome completo do órgão, quando necessário para exibição, é buscado via API. Sob demanda.

---

### legislaturasMesas.csv

| Registros (arquivo único) | 177 |
|---|---|

**Justificativa:** Mesa Diretora da Câmara. Volume irrelevante, mas sem uso planejado no MVP nem nas engines centrais. Quando houver necessidade (ex.: exibir cargos de Mesa no perfil do deputado), ingerir nesse momento.

---

### eventos-{ano}.csv

| Registros (2025) | ~3.200 |
|---|---|

**Justificativa:** informações de sessões e audiências (tipo, pauta, local). Não alimenta engine central. A votação já traz `idEvento`, data e órgão — suficiente para o MVP. Se for necessário exibir contexto do evento (tipo de sessão, pauta), buscar via API por `idEvento`. Cache com TTL longo — eventos passados não mudam.

---

### eventosOrgaos-{ano}.csv

| Registros (2025) | ~3.200 |
|---|---|

**Justificativa:** liga evento ao órgão realizador. Redundante para votações, que já trazem `siglaOrgao` direto. Só útil se a tela partir do evento, não da votação. Sob demanda.

---

### eventosPresencaDeputados-{ano}.csv

| Registros (2025) | ~110.000 |
|---|---|

**Justificativa:** presença em eventos (sessões, audiências). Para o MVP, a presença relevante é em votações nominais, derivável dos dados retornados por `GET /votacoes/{id}/votos` (quem votou estava presente). Presença em sessões/audiências sem votação nominal é dado de perfil complementar, não de engine. Sob demanda.

---

### eventosRequerimentos-{ano}.csv

| Registros (2025) | ~2.600 |
|---|---|

**Justificativa:** liga evento ao requerimento que o originou. Contexto de exibição puro, sem cruzamento com engines. Sob demanda.

---

### proposicoesAutores-{ano}.csv

| Registros (2025) | ~154.500 |
|---|---|

**Justificativa:** relação proposição↔autor. Não alimenta engine central no MVP. O uso planejado — contagem de proposições por deputado, projetos apresentados/aprovados — está no Tier 2 (perfil completo). A API resolve com `GET /proposicoes?idAutor={id}`. Quando o Tier 2 chegar e rankings comparativos de produtividade forem implementados, reavaliar ingestão.

---

### deputadosOcupacoes.csv

| Registros (arquivo único) | ~37.500 |
|---|---|

**Justificativa:** ocupações profissionais declaradas. Dado de perfil, sem uso no MVP. Sob demanda quando/se for exibido em versão futura.

---

### deputadosProfissoes.csv

| Registros (arquivo único) | ~12.600 |
|---|---|

**Justificativa:** profissões declaradas. Mesmo caso de `deputadosOcupacoes`. Sob demanda.

---

### frentes.csv / frentesDeputados.csv

| Registros | 1.440 frentes / 261.638 vínculos |
|---|---|

**Justificativa:** frentes parlamentares. Explicitamente no Tier 2 (perfil completo). Sem cruzamento com engines centrais. Sob demanda.

---

### grupos.csv / gruposMembros.csv / gruposHistorico.csv

| Registros | 118 grupos / 7.087 membros / 408 histórico |
|---|---|

**Justificativa:** grupos interparlamentares. Sem uso planejado em nenhum tier atual. Lateral à missão do produto. Sob demanda se algum dia for relevante.

---

## Resumo de volume estimado

### Cenário: 10 anos de histórico (2016–2025)

| Dado | Registros estimados |
|------|---------------------|
| Votações nominais (com campos derivados) | ~5.500 |
| Votação↔proposição afetada (derivada) | ~5.680 |
| Proposições afetadas únicas | ~4.000–5.000 |
| Temas de proposições | ~5.000–15.000 |
| Deputados | ~7.900 (acumulado) |
| Legislaturas | ~57 (acumulado) |
| **Total estimado** | **~28.000–38.000** |

### Cenário: 25 anos de histórico (2001–2025)

| Dado | Registros estimados |
|------|---------------------|
| Votações nominais (com campos derivados) | ~13.750 |
| Votação↔proposição afetada (derivada) | ~14.200 |
| Proposições afetadas únicas | ~10.000–12.500 |
| Temas de proposições | ~12.500–37.500 |
| Deputados | ~7.900 (acumulado) |
| Legislaturas | ~57 (acumulado) |
| **Total estimado** | **~60.000–87.000** |

A remoção de `votacoesVotos` (~95% do volume anterior) e `votacoesOrientacoes` do banco reduz o total de ~4.6 milhões para algumas dezenas de milhares de registros no cenário de 25 anos — uma redução de mais de 98%. Esse volume cabe confortavelmente no tier gratuito de qualquer banco gerenciado (Supabase, Neon, PlanetScale).

A tradeoff é que o matcher e o perfil do deputado dependem da API da Câmara em runtime para buscar votos individuais e orientações. Estratégias de mitigação dessa dependência estão registradas como ideias futuras na seção de `votacoesVotos`, a serem avaliadas se a necessidade for identificada em produção.

---

## Decisão resolvida: filtro por `codTipo` descartado

O protótipo originalmente definia 25 `codTipo` permitidos para filtrar proposições na ingestão. Essa abordagem foi descartada por dois motivos:

1. **O problema que resolvia não existe mais.** O filtro foi criado para reduzir 107 mil proposições para ~11 mil. Com a estratégia de ingerir apenas proposições afetadas por votações nominais, só ~400-500 proposições por ano são ingeridas — o filtro é redundante.

2. **O filtro introduzia falsos negativos.** A análise de 2025 identificou 17 votações nominais (6 de Plenário, com 382-432 votos cada) sobre proposições fora da lista dos 25 tipos. Entre elas: cassações de mandato (REP — caso Glauber Braga, caso Carla Zambelli), alterações no Código de Ética (PRC 63/2025), e outros tipos relevantes para o cidadão. Manter uma lista positiva de tipos exigiria revisão contínua e sempre correria o risco de perder votações relevantes.

**Critério atual de ingestão:** toda votação que tem votos individuais registrados em `votacoesVotos` é ingerida, independente do `codTipo` da proposição associada. O `codTipo` continua existindo como campo da proposição e como input do fator "tipo de proposição" (peso 0.20) na fórmula de relevância, mas não bloqueia a entrada de dados.
