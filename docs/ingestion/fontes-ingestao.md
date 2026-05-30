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

**Justificativa:** core da fórmula de relevância. Cada votação nominal fornece insumos objetivos para o ranking de proposições e para o matcher. O arquivo é consumido junto com `votacoesVotos-{ano}.csv` para identificar votações nominais, calcular placares e distinguir votações de plenário e comissão. Votações não nominais (simbólicas e outras) não são ingeridas — não alimentam polarização nem o matcher. Se necessário exibir uma votação não nominal no contexto de uma proposição, buscar via API.

**Filtro de ingestão:** apenas registros cuja `id` aparece em `votacoesVotos-{ano}.csv` (proxy para votação nominal).


---

### votacoesVotos-{ano}.csv

| Métrica | Valor |
|---------|-------|
| Registros brutos no CSV (2025) | 175.067 votos individuais |
| Votações nominais identificadas (2025) | ~550 |
| Projeção 10 anos | ~5.500 votações nominais |
| Projeção 25 anos | ~13.750 votações nominais |

**Justificativa:** os votos individuais alimentam o matcher, o perfil do deputado e o comparativo. Buscar esses dados na API em runtime colocaria o core do produto sob dependência operacional externa. O arquivo passa a ser consumido integralmente pela ingestão, e não apenas como proxy para identificar votação nominal.

**Contexto de uso:** identificar quais votações são nominais, calcular placares agregados, permitir leitura local dos votos individuais no matcher, no perfil do deputado e no comparativo.

**Detalhe fora deste documento:** a decisão técnica de armazenamento dos votos está definida na ADR 0010. Este documento registra apenas que o arquivo deve ser consumido e por quê.

**Observações de qualidade:** há registros com `voto` vazio e registros com valor `Artigo 17`; o tratamento dessas categorias está detalhado na ADR 0010 e na regra do matcher.

---

### votacoesProposicoes-{ano}.csv

| Métrica | Valor |
|---------|-------|
| Registros úteis (2025) | ~568 vínculos para votações nominais |
| Projeção 10 anos | ~5.680 |
| Projeção 25 anos | ~14.200 |

**Justificativa:** lista as proposições afetadas por cada votação. É consumido para ligar votações nominais às proposições que elas afetam. A fórmula de relevância precisa do `codTipo` da proposição, e o feed/matcher precisam de título e ementa. Sem esse arquivo, a votação é um ID sem contexto.

`votacoesObjetos-{ano}.csv` não é fonte de derivação nem fallback. Ele lista possíveis objetos da votação, acumulando proposições derivadas ao longo da tramitação, e não é vínculo canônico confiável.

**Exibição de detalhes completos:** quando o usuário abre o detalhe de uma votação, os textos da votação vêm dos campos locais ingeridos de `votacoes-{ano}.csv`. A lista de proposições exibida deve se basear nas proposições afetadas deste arquivo, não em objetos possíveis da votação. Chamadas a `GET /votacoes/{id}` não fazem parte do runner nem do caminho padrão de runtime para detalhes de votação, porque a API não acrescenta informação útil em relação aos CSVs para esses campos.

---

### proposicoes-{ano}.csv

| Métrica | Valor |
|---------|-------|
| Registros brutos (2025) | 107.556 |
| Registros úteis (afetadas por votações nominais, 2025) | ~400–500 proposições únicas |
| Projeção 10 anos (úteis) | ~4.000–5.000 |
| Projeção 25 anos (úteis) | ~10.000–12.500 |

**Justificativa:** dados da proposição (tipo, ementa, número, ano, tramitação) são necessários para exibir o feed de proposições votadas e o contexto do matcher. O `codTipo` é usado como input do fator "tipo de proposição" (peso 0.20) na fórmula de relevância — PEC pesa mais que requerimento — mas não é usado como filtro de ingestão.

**Escopo refinado:** ingerir as proposições afetadas por votação nominal ingerida e suas proposições principais. Proposições sem relação com votação nominal ingerida e sem papel de principal de uma proposição afetada não entram. Não há filtro por `codTipo` — qualquer tipo de proposição afetada por uma votação nominal é ingerido.

**Observação:** votações de um ano podem referenciar proposições apresentadas em anos anteriores. A ingestão de `proposicoes` precisa cobrir múltiplos anos conforme necessário, não só o ano corrente. Quando uma proposição necessária não estiver disponível nos CSVs locais baixados, o runner consulta `GET /proposicoes/{id}` e importa a partir da API. O CSV continua sendo a fonte preferencial; a API é fallback para lacuna de input.

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

**Complementação via API no job de carga — `GET /deputados/{id}/historico`:** para cada deputado ingerido, o job de carga consulta o histórico parlamentar e popula a tabela `deputado_historico` (ver `docs/modelagem-dados.md`). Esses dados não estão em nenhum CSV publicado pela Câmara e são necessários para a regra "em exercício na data da votação" do matcher (ADR 0008), para o histórico de partidos do perfil do deputado (MVP-3) e para resolver o partido atual sem novo fetch. A paralelização segue o mesmo padrão controlado do `csv-downloader`.

**Foto do deputado:** o CSV não traz URL de foto. A estratégia inicial é inferir a URL pelo padrão canônico da Câmara `https://www.camara.leg.br/internet/deputado/bandep/{id_deputado}.jpg`, sem persistir nem fazer fetch. Caso observemos falhas reais (404 sistemático, mudança de padrão), migrar para fetch via `GET /deputados/{id}` no mesmo job de carga já usado para `historico`, e persistir `url_foto` em `deputado`.

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

### votacoesOrientacoes-{ano}.csv (API sob demanda)

| Registros brutos (2025) | 4.947 |
|---|---|
| Registros de plenário (2025) | ~4.100 |

**Justificativa:** orientação de bancada é exibida como contexto da votação no modal do feed e no detalhe da proposição. Sem cruzamento com engines centrais.

Em runtime, orientações são buscadas via API (`GET /votacoes/{id}/orientacoes`) sob demanda para exibição no modal da proposição ("orientação de cada partido nesta votação"). Cache com TTL longo.

**Tratamento de tipos de orientadores:** partidos individuais, federações, blocos e lideranças suprapartidárias (Governo, Oposição, Maioria, Minoria) são todos retornados pela API como orientações da votação, sem cascateamento para o deputado individual (conforme ADR 0005). O campo `siglaBancada` identifica o tipo.

**Risco residual:** se a API ficar indisponível, o contexto de orientação partidária fica degradado, mas o matcher, o perfil de votos e o comparativo continuam funcionando a partir dos votos ingeridos de `votacoesVotos-{ano}.csv`.

### votacoesObjetos-{ano}.csv (descartado)

| Registros brutos (2025) | 102.037 |
|---|---|
| Registros de votações nominais (2025) | 28.206 |

**Justificativa:** lista possíveis objetos de cada votação, acumulando proposições derivadas ao longo da tramitação. O nome do arquivo sugere uma chave mais forte do que o dado oferece. Não é baixado pela pipeline padrão, não é ingerido no banco e não é usado como fallback para vínculo votação-proposição.

---

### orgaos.csv

| Registros (arquivo único) | 3.823 |
|---|---|

**Justificativa:** o uso principal era classificar votações entre plenário e comissão, mas essa lógica já pode ser aplicada a partir do `siglaOrgao` presente em `votacoes-{ano}.csv`: `PLEN` ou `CN` → plenário, qualquer outro valor → comissão. O nome completo do órgão, quando necessário para exibição, é buscado via API. Sob demanda.

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

**Justificativa:** presença em eventos (sessões, audiências). Para o MVP, a presença relevante é em votações nominais, derivável de `votacoesVotos-{ano}.csv` (quem votou estava presente). Presença em sessões/audiências sem votação nominal é dado de perfil complementar, não de engine. Sob demanda.

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
| Votações nominais consumidas | ~5.500 |
| Votações com votos individuais consumidos | ~5.500 |
| Vínculos votação↔proposição afetada | ~5.680 |
| Proposições afetadas únicas | ~4.000–5.000 |
| Temas de proposições | ~5.000–15.000 |
| Deputados | ~7.900 (acumulado) |
| Legislaturas | ~57 (acumulado) |
| **Total estimado** | **~33.500–43.500** |

### Cenário: 25 anos de histórico (2001–2025)

| Dado | Registros estimados |
|------|---------------------|
| Votações nominais consumidas | ~13.750 |
| Votações com votos individuais consumidos | ~13.750 |
| Vínculos votação↔proposição afetada | ~14.200 |
| Proposições afetadas únicas | ~10.000–12.500 |
| Temas de proposições | ~12.500–37.500 |
| Deputados | ~7.900 (acumulado) |
| Legislaturas | ~57 (acumulado) |
| **Total estimado** | **~73.750–100.750** |

O consumo integral de `votacoesVotos` aumenta o volume de dados processado em relação ao desenho anterior, mas remove a dependência da API da Câmara para o core do produto. A forma exata de persistência desse arquivo está definida na ADR 0010, não neste inventário de fontes.

---

## Decisão resolvida: filtro por `codTipo` descartado

O protótipo originalmente definia 25 `codTipo` permitidos para filtrar proposições na ingestão. Essa abordagem foi descartada por dois motivos:

1. **O problema que resolvia não existe mais.** O filtro foi criado para reduzir 107 mil proposições para ~11 mil. Com a estratégia de ingerir apenas proposições afetadas por votações nominais e suas principais, só algumas centenas de proposições por ano são ingeridas — o filtro é redundante.

2. **O filtro introduzia falsos negativos.** A análise de 2025 identificou 17 votações nominais (6 de Plenário, com 382-432 votos cada) sobre proposições fora da lista dos 25 tipos. Entre elas: cassações de mandato (REP — caso Glauber Braga, caso Carla Zambelli), alterações no Código de Ética (PRC 63/2025), e outros tipos relevantes para o cidadão. Manter uma lista positiva de tipos exigiria revisão contínua e sempre correria o risco de perder votações relevantes.

**Critério atual de ingestão:** toda votação que tem votos individuais registrados em `votacoesVotos` é ingerida, independente do `codTipo` da proposição associada. O `codTipo` continua existindo como campo da proposição e como input do fator "tipo de proposição" (peso 0.20) na fórmula de relevância, mas não bloqueia a entrada de dados.
